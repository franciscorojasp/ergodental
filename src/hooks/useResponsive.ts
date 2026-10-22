import { useState, useEffect } from 'react';

export interface ResponsiveInfo {
  isMobile: boolean;    // <= 768px
  isTablet: boolean;    // 769px - 1024px
  isDesktop: boolean;   // > 1024px
  width: number;
  height: number;
  isLandscape: boolean;
  isStandalone: boolean;
  isTouch: boolean;
}

export function useResponsive(): ResponsiveInfo {
  const getInfo = (): ResponsiveInfo => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1200,
        height: 800,
        isLandscape: true,
        isStandalone: false,
        isTouch: false,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    return {
      isMobile: width <= 768,
      isTablet: width > 768 && width <= 1024,
      isDesktop: width > 1024,
      width,
      height,
      isLandscape: width > height,
      isStandalone,
      isTouch,
    };
  };

  const [state, setState] = useState<ResponsiveInfo>(getInfo);

  useEffect(() => {
    let timeoutId: any;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setState(getInfo());
      }, 50);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return state;
}

export default useResponsive;
