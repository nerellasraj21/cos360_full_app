

export const BREAKPOINTS = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;


export const useBreakpoint = () => {
  const [currentBreakpoint, setCurrentBreakpoint] = React.useState<Breakpoint>('xs');

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= BREAKPOINTS['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= BREAKPOINTS.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= BREAKPOINTS.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= BREAKPOINTS.md) {
        setCurrentBreakpoint('md');
      } else if (width >= BREAKPOINTS.sm) {
        setCurrentBreakpoint('sm');
      } else {
        setCurrentBreakpoint('xs');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return currentBreakpoint;
};


export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};


export const getResponsiveDropdownConfig = (breakpoint: Breakpoint) => {
  switch (breakpoint) {
    case 'xs':
      return {
        useNativeSelect: true,
        maxHeight: '60vh',
        itemHeight: 48,
        fontSize: 'base',
        padding: 'lg',
        showSearch: false,
      };
    case 'sm':
      return {
        useNativeSelect: false,
        maxHeight: '70vh',
        itemHeight: 44,
        fontSize: 'base',
        padding: 'md',
        showSearch: true,
      };
    case 'md':
    case 'lg':
      return {
        useNativeSelect: false,
        maxHeight: '400px',
        itemHeight: 40,
        fontSize: 'sm',
        padding: 'sm',
        showSearch: true,
      };
    default:
      return {
        useNativeSelect: false,
        maxHeight: '384px',
        itemHeight: 36,
        fontSize: 'sm',
        padding: 'sm',
        showSearch: true,
      };
  }
};


export const getOptimalDropdownPosition = (
  triggerRect: DOMRect,
  contentHeight: number,
  breakpoint: Breakpoint
) => {
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  

  if (breakpoint === 'xs' || breakpoint === 'sm') {
    return {
      strategy: 'fixed' as const,
      position: 'bottom-sheet' as const,
      maxHeight: Math.min(contentHeight, viewportHeight * 0.7),
    };
  }
  

  const spaceBelow = viewportHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  
  return {
    strategy: 'absolute' as const,
    position: spaceBelow >= contentHeight ? 'below' : 'above' as const,
    maxHeight: Math.min(contentHeight, Math.max(spaceBelow, spaceAbove) - 20),
  };
};


export const getResponsiveTextSize = (breakpoint: Breakpoint) => {
  const sizes = {
    xs: { base: 'text-base', small: 'text-sm' },
    sm: { base: 'text-base', small: 'text-sm' },
    md: { base: 'text-sm', small: 'text-xs' },
    lg: { base: 'text-sm', small: 'text-xs' },
    xl: { base: 'text-sm', small: 'text-xs' },
    '2xl': { base: 'text-sm', small: 'text-xs' },
  };
  
  return sizes[breakpoint];
};


export const getResponsiveSpacing = (breakpoint: Breakpoint) => {
  const spacing = {
    xs: { padding: 'p-4', gap: 'gap-3', margin: 'm-2' },
    sm: { padding: 'p-3', gap: 'gap-2', margin: 'm-2' },
    md: { padding: 'p-2', gap: 'gap-1', margin: 'm-1' },
    lg: { padding: 'p-2', gap: 'gap-1', margin: 'm-1' },
    xl: { padding: 'p-2', gap: 'gap-1', margin: 'm-1' },
    '2xl': { padding: 'p-2', gap: 'gap-1', margin: 'm-1' },
  };
  
  return spacing[breakpoint];
};


import React from 'react';