import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./TiltedCard.css";

export interface TiltedCardProps {
  children: ReactNode;
  backContent?: ReactNode;
  className?: string;
  isFlipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
  /** 视角透视距离（px） */
  perspective?: number;
  /** 忽略翻转的选择器 */
  ignoreFlipSelector?: string;
}

// 阻尼简谐振子弹簧步进算法
function stepSpring(
  current: number,
  velocity: number,
  target: number,
  omega: number,
  zeta: number,
  dt: number,
): [number, number] {
  const force = -omega * omega * (current - target) - 2 * zeta * omega * velocity;
  const nextVelocity = velocity + force * dt;
  const nextPosition = current + nextVelocity * dt;
  return [nextPosition, nextVelocity];
}

const DEFAULT_IGNORE_SELECTORS = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[data-no-flip]",
  ".mao-progress-section",
  ".mao-cluster-pane",
  ".mao-realtime-chart-card",
  ".mao-heatmap-wrap",
  ".mao-heatmap-cell",
  ".mao-node-block",
  ".mao-matrix-cell",
  ".mao-tooltip-content",
  ".mao-status-pill",
  ".overview-card-rating",
  "canvas",
  "svg path",
].join(", ");

export const TiltedCard: React.FC<TiltedCardProps> = ({
  children,
  backContent,
  className = "",
  isFlipped: controlledFlipped,
  onFlipChange,
  perspective = 1300,
  ignoreFlipSelector = DEFAULT_IGNORE_SELECTORS,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const [internalFlipped, setInternalFlipped] = useState(false);
  const flipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  // 正面/背面朝向状态，在 50% 临界点精准切换
  const [faceFacing, setFaceFacing] = useState<"front" | "back">(
    flipped ? "back" : "front"
  );
  const wasBackRef = useRef(flipped);

  // 动时 3D：动画是否进行中（静止时完全卸载 3D 渲染上下文，彻底杜绝字体模糊发虚）
  const [isAnimating, setIsAnimating] = useState(false);

  // 物理状态：进度 p 从 0 (正面) 到 1 (背面)
  const stateRef = useRef({
    p: flipped ? 1 : 0,
    v: 0,
    target: flipped ? 1 : 0,
  });

  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isFirstMountRef = useRef(true);

  const updateTransform = useCallback((angleDeg: number) => {
    const body = bodyRef.current;
    if (!body) return;
    body.style.transform = `rotateY(${angleDeg.toFixed(2)}deg)`;

    // 仿折叠屏“漫透融合”曲线：
    // 45° ~ 80° 正面文字折线图柔和漫出 (1 -> 0)
    // 80° ~ 100° 中线掠射角掠过时，两面高频文字均完全淡隐，唯留纯净科技卡片实体切过视线
    // 100° ~ 135° 背面方格矩阵从基板中清透浮现 (0 -> 1)
    let frontOpacity = 1;
    let backOpacity = 1;

    if (angleDeg <= 45) {
      frontOpacity = 1;
      backOpacity = 0;
    } else if (angleDeg < 80) {
      const t = (angleDeg - 45) / (80 - 45);
      frontOpacity = 0.5 + 0.5 * Math.cos(t * Math.PI);
      backOpacity = 0;
    } else if (angleDeg <= 100) {
      frontOpacity = 0;
      backOpacity = 0;
    } else if (angleDeg < 135) {
      const t = (angleDeg - 100) / (135 - 100);
      frontOpacity = 0;
      backOpacity = 0.5 - 0.5 * Math.cos(t * Math.PI);
    } else {
      frontOpacity = 0;
      backOpacity = 1;
    }

    body.style.setProperty("--tc-front-opacity", frontOpacity.toFixed(3));
    body.style.setProperty("--tc-back-opacity", backOpacity.toFixed(3));
  }, []);

  const tick = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    // 适配 120Hz 高刷屏与动态帧率，最大时间步进保护
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.033);
    lastTimeRef.current = time;

    const s = stateRef.current;

    // 阻尼弹簧步进：s.p 从 0 (正面) 平滑演进至 1 (背面)
    // 采用高品质阻尼参数 (omega=14, zeta=0.88)，运动轻快灵动且收尾稳健
    [s.p, s.v] = stepSpring(s.p, s.v, s.target, 14, 0.88, dt);

    // 严禁中间角度突变！纯单调连续角度：0deg -> 180deg，硬件级背向剔除
    const angleDeg = s.p * 180;
    updateTransform(angleDeg);

    const isBackFacing = s.p > 0.5;
    if (isBackFacing !== wasBackRef.current) {
      wasBackRef.current = isBackFacing;
      setFaceFacing(isBackFacing ? "back" : "front");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sao:cluster-flip"));
      }
    }

    // 斩断弹簧长尾（消除传统弹簧尾端长达 0.5 秒的肉眼不可见微小蠕动）：
    // 当旋转到达 99.8%（残余角度 < 0.25°）且角速度已平稳衰减时，立刻精准落定
    const diff = Math.abs(s.p - s.target);
    const absV = Math.abs(s.v);
    const isSettled =
      (diff < 0.0025 && absV < 0.04) ||
      (diff < 0.006 && absV < 0.02) ||
      diff < 0.0008;

    if (!isSettled) {
      rafIdRef.current = requestAnimationFrame(tick);
    } else {
      // 达到终点：精准锁定在 0deg 或 180deg，卡片停稳瞬间无缝同步切换为 2D 极清文本
      s.p = s.target;
      s.v = 0;
      rafIdRef.current = null;
      updateTransform(s.target * 180);
      setIsAnimating(false);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sao:cluster-flip"));
        window.dispatchEvent(new Event("resize"));
      }
    }
  }, [updateTransform]);

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    const body = bodyRef.current;
    if (body) {
      body.style.transform = `rotateY(${(stateRef.current.p * 180).toFixed(2)}deg)`;
    }
    if (rafIdRef.current === null) {
      lastTimeRef.current = performance.now();
      rafIdRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  // 同步 targetFlip
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    stateRef.current.target = flipped ? 1 : 0;
    startAnimation();
  }, [flipped, startAnimation]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!backContent) return;

    const target = e.target as HTMLElement | null;

    // 检查是否点击了具体的交互子元素（如服务器方格、节点块、图表、药丸等）
    if (target && ignoreFlipSelector) {
      const interactiveEl = target.closest(ignoreFlipSelector);
      if (interactiveEl && interactiveEl !== containerRef.current) {
        return;
      }
    }

    const nextFlipped = !flipped;
    if (controlledFlipped === undefined) {
      setInternalFlipped(nextFlipped);
    }
    onFlipChange?.(nextFlipped);
  };

  return (
    <div
      ref={containerRef}
      className={`tilted-card mao-cluster-tilted-card ${
        isAnimating ? "is-animating" : ""
      } ${className}`}
      style={isAnimating ? { perspective: `${perspective}px` } : undefined}
      onClick={handleClick}
    >
      <div ref={bodyRef} className="tilted-card__body">
        {/* 正面 */}
        <div
          className={`tilted-card__face tilted-card__front ${
            faceFacing === "front" ? "is-active-face" : "is-hidden-face"
          }`}
        >
          {children}
        </div>

        {/* 背面 */}
        {backContent && (
          <div
            className={`tilted-card__face tilted-card__back ${
              faceFacing === "back" ? "is-active-face" : "is-hidden-face"
            }`}
          >
            {backContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default TiltedCard;
