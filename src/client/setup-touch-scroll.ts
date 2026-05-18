/** Reddit mobile webview: document scroll often fails; scroll inside #root instead. */
const SCROLL_ROOT_ID = 'root';

const applyViewportHeight = (): void => {
  const h = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--app-vh', `${Math.round(h)}px`);
};

export const setupTouchScroll = (): (() => void) => {
  const root = document.getElementById(SCROLL_ROOT_ID);
  if (!root) {
    return () => {};
  }

  root.classList.add('app-scroll');
  applyViewportHeight();

  const onViewportChange = () => applyViewportHeight();
  window.addEventListener('resize', onViewportChange);
  window.visualViewport?.addEventListener('resize', onViewportChange);
  window.visualViewport?.addEventListener('scroll', onViewportChange);

  return () => {
    window.removeEventListener('resize', onViewportChange);
    window.visualViewport?.removeEventListener('resize', onViewportChange);
    window.visualViewport?.removeEventListener('scroll', onViewportChange);
  };
};

export const setScrollRootLocked = (locked: boolean): void => {
  document.getElementById(SCROLL_ROOT_ID)?.classList.toggle('app-scroll--locked', locked);
};
