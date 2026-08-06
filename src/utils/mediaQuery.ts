/**
 * 订阅 MediaQueryList 的 `change` 事件并返回取消订阅函数。Safari < 14 没在 MediaQueryList 上
 * 实现 addEventListener,故回退到已废弃的 addListener/removeListener。
 */
export function subscribeMediaQuery(mq: MediaQueryList, handler: () => void): () => void {
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }
  mq.addListener(handler);
  return () => mq.removeListener(handler);
}

const FINE_HOVER_QUERY = "(any-hover: hover) and (any-pointer: fine)";
let fineHoverMediaQuery: MediaQueryList | null = null;

/** 只让真正具备悬停能力的精细指针进入柱条 hover 交互；触摸输入始终排除。 */
export function supportsFineHover(pointerType?: string): boolean {
  if (pointerType === "touch" || typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  fineHoverMediaQuery ??= window.matchMedia(FINE_HOVER_QUERY);
  return fineHoverMediaQuery.matches;
}
