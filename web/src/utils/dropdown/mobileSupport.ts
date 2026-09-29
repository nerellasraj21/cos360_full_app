


export const isTouchDevice = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - for older browsers
    navigator.msMaxTouchPoints > 0
  );
};


export const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  
  const isMobileUserAgent = mobileKeywords.some(keyword => userAgent.includes(keyword));
  const isSmallScreen = window.innerWidth <= 768;
  
  return isMobileUserAgent || (isSmallScreen && isTouchDevice());
};


export const getMobileDropdownPosition = (triggerElement: HTMLElement) => {
  const rect = triggerElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  

  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;
  
  return {
    preferBottom: spaceBelow > spaceAbove,
    maxHeight: Math.max(spaceBelow, spaceAbove) - 20,
    fullWidth: viewportWidth <= 640,
    centerHorizontally: viewportWidth <= 480,
  };
};


export class TouchGestureHandler {
  private element: HTMLElement;
  private onSwipeUp?: () => void;
  private onSwipeDown?: () => void;
  private onTap?: () => void;
  private onLongPress?: () => void;
  
  private startY = 0;
  private startX = 0;
  private startTime = 0;
  private longPressTimer: NodeJS.Timeout | null = null;
  
  private readonly SWIPE_THRESHOLD = 50;
  private readonly LONG_PRESS_DURATION = 500;
  private readonly TAP_THRESHOLD = 10;

  constructor(
    element: HTMLElement,
    handlers: {
      onSwipeUp?: () => void;
      onSwipeDown?: () => void;
      onTap?: () => void;
      onLongPress?: () => void;
    }
  ) {
    this.element = element;
    this.onSwipeUp = handlers.onSwipeUp;
    this.onSwipeDown = handlers.onSwipeDown;
    this.onTap = handlers.onTap;
    this.onLongPress = handlers.onLongPress;
    
    this.attachListeners();
  }

  private attachListeners() {
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });
  }

  private handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    this.startY = touch.clientY;
    this.startX = touch.clientX;
    this.startTime = Date.now();
    

    if (this.onLongPress) {
      this.longPressTimer = setTimeout(() => {
        this.onLongPress?.();
        this.longPressTimer = null;
      }, this.LONG_PRESS_DURATION);
    }
  };

  private handleTouchMove = (e: TouchEvent) => {

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    const touch = e.changedTouches[0];
    const endY = touch.clientY;
    const endX = touch.clientX;
    const endTime = Date.now();
    
    const deltaY = endY - this.startY;
    const deltaX = endX - this.startX;
    const deltaTime = endTime - this.startTime;
    

    if (
      deltaTime < 300 &&
      Math.abs(deltaX) < this.TAP_THRESHOLD &&
      Math.abs(deltaY) < this.TAP_THRESHOLD
    ) {
      this.onTap?.();
      return;
    }
    

    if (Math.abs(deltaY) > this.SWIPE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY < 0) {
        this.onSwipeUp?.();
      } else {
        this.onSwipeDown?.();
      }
    }
  };

  private handleTouchCancel = () => {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  };

  destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }
}


export const preventBodyScroll = (prevent: boolean) => {
  if (prevent) {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  } else {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }
};


export const getMobileDropdownStyles = (isOpen: boolean, triggerRect?: DOMRect) => {
  if (!isMobileDevice()) {
    return {};
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (viewportWidth <= 640) {
    return {
      position: 'fixed' as const,
      top: isOpen ? '50%' : '100%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90vw',
      maxWidth: '400px',
      maxHeight: '70vh',
      zIndex: 9999,
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      transition: 'all 0.2s ease-in-out',
    };
  }

  return {};
};


export const useMobileDropdown = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTouch, setIsTouch] = React.useState(false);

  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(isMobileDevice());
      setIsTouch(isTouchDevice());
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  return {
    isMobile,
    isTouch,
    shouldUseNativeSelect: isMobile && window.innerWidth <= 480,
    touchFriendlySize: isTouch,
  };
};


import React from 'react';