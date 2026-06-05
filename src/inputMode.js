export function usesTouchControls() {
  const params = new URLSearchParams(window.location.search);

  if (params.has('touchControls')) {
    return true;
  }

  if (params.has('desktopControls')) {
    return false;
  }

  const hasTouchPoints = navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
  const hasCoarsePrimaryPointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const canHover = window.matchMedia?.('(hover: hover)').matches ?? false;
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const compactPortraitViewport = window.innerWidth <= 820 && window.innerHeight >= window.innerWidth;

  if (mobileUserAgent && hasTouchPoints) {
    return true;
  }

  return hasTouchPoints && hasCoarsePrimaryPointer && !canHover && compactPortraitViewport;
}
