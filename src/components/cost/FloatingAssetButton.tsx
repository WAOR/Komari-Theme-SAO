import { useState, useRef, useEffect, type PointerEvent, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CircleDollarSign } from "lucide-react";

const STORAGE_KEY = "komari-sao:cost-ball-pos";

interface Position {
  x: number;
  y: number;
}

export function FloatingAssetButton() {
  const navigate = useNavigate();
  const [pos, setPos] = useState<Position | null>(() => {
    try {
      const stored =
        localStorage.getItem(STORAGE_KEY) || localStorage.getItem("monitor-sao:cost-ball-pos");
      if (stored) {
        const parsed = JSON.parse(stored) as Position;
        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const isPointerDownRef = useRef(false);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number }>({
    pointerX: 0,
    pointerY: 0,
    startX: 0,
    startY: 0,
  });
  const hasMovedRef = useRef(false);
  const currentPosRef = useRef<Position | null>(pos);
  const buttonRef = useRef<HTMLDivElement>(null);

  // 视口尺寸变化时，确保位置不溢出视口
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => {
        if (!prev) return null;
        const ballSize = 38;
        const maxX = window.innerWidth - ballSize - 12;
        const maxY = window.innerHeight - ballSize - 12;
        const clampedX = Math.max(12, Math.min(maxX, prev.x));
        const clampedY = Math.max(12, Math.min(maxY, prev.y));
        if (clampedX === prev.x && clampedY === prev.y) return prev;
        const next = { x: clampedX, y: clampedY };
        currentPosRef.current = next;
        return next;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    isPointerDownRef.current = true;
    hasMovedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: rect.left,
      startY: rect.top,
    };
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;

    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;

    if (!hasMovedRef.current && Math.hypot(dx, dy) > 4) {
      hasMovedRef.current = true;
      setIsDragging(true);
    }

    if (hasMovedRef.current) {
      const ballSize = 38;
      const maxX = window.innerWidth - ballSize - 12;
      const maxY = window.innerHeight - ballSize - 12;
      const nextX = Math.max(12, Math.min(maxX, dragStartRef.current.startX + dx));
      const nextY = Math.max(12, Math.min(maxY, dragStartRef.current.startY + dy));
      const next = { x: nextX, y: nextY };
      currentPosRef.current = next;
      setPos(next);
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (hasMovedRef.current) {
      // 延迟清除拖拽状态，防止触发 click 事件
      window.setTimeout(() => {
        setIsDragging(false);
      }, 50);

      const toSave = currentPosRef.current || pos;
      if (toSave) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
          localStorage.setItem("monitor-sao:cost-ball-pos", JSON.stringify(toSave));
        } catch {}
      }
    }
  };

  const handleClick = (e: MouseEvent) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate("/assets");
  };

  const style = pos
    ? {
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        right: "auto",
        bottom: "auto",
      }
    : undefined;

  return (
    <div
      ref={buttonRef}
      role="button"
      tabIndex={0}
      style={style}
      className={`cost-summary-ball show${isDragging ? " is-dragging" : ""}`}
      aria-label="打开资产统计页"
      title="资产统计（支持拖动）"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate("/assets");
        }
      }}
    >
      <span className="cost-summary-ball-icon" aria-hidden>
        <CircleDollarSign size={16} />
      </span>
    </div>
  );
}
