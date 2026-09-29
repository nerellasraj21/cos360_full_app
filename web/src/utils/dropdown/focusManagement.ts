


export class FocusTrap {
  private container: HTMLElement;
  private focusableElements: HTMLElement[] = [];
  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;
  private previousActiveElement: Element | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.updateFocusableElements();
  }

  private updateFocusableElements() {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="option"]:not([aria-disabled="true"])',
    ].join(', ');

    this.focusableElements = Array.from(
      this.container.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    this.firstFocusableElement = this.focusableElements[0] || null;
    this.lastFocusableElement = 
      this.focusableElements[this.focusableElements.length - 1] || null;
  }

  activate() {
    this.previousActiveElement = document.activeElement;
    this.updateFocusableElements();
    

    if (this.firstFocusableElement) {
      this.firstFocusableElement.focus();
    }


    document.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate() {
    document.removeEventListener('keydown', this.handleKeyDown);
    

    if (this.previousActiveElement && 'focus' in this.previousActiveElement) {
      (this.previousActiveElement as HTMLElement).focus();
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    this.updateFocusableElements();

    if (this.focusableElements.length === 0) {
      e.preventDefault();
      return;
    }

    if (e.shiftKey) {

      if (document.activeElement === this.firstFocusableElement) {
        e.preventDefault();
        this.lastFocusableElement?.focus();
      }
    } else {

      if (document.activeElement === this.lastFocusableElement) {
        e.preventDefault();
        this.firstFocusableElement?.focus();
      }
    }
  };
}


export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);


  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};


export const isFocusable = (element: HTMLElement): boolean => {
  if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }

  return true;
};


export const findNextFocusableElement = (
  elements: HTMLElement[],
  currentIndex: number,
  direction: 'forward' | 'backward' = 'forward'
): number => {
  const increment = direction === 'forward' ? 1 : -1;
  let nextIndex = currentIndex + increment;


  if (nextIndex >= elements.length) {
    nextIndex = 0;
  } else if (nextIndex < 0) {
    nextIndex = elements.length - 1;
  }


  let attempts = 0;
  while (attempts < elements.length) {
    if (elements[nextIndex] && isFocusable(elements[nextIndex])) {
      return nextIndex;
    }
    
    nextIndex += increment;
    if (nextIndex >= elements.length) {
      nextIndex = 0;
    } else if (nextIndex < 0) {
      nextIndex = elements.length - 1;
    }
    
    attempts++;
  }

  return currentIndex;
};

/**
 * Scrolls element into view with proper positioning
 */
export const scrollIntoViewIfNeeded = (element: HTMLElement, container?: HTMLElement) => {
  const targetContainer = container || element.parentElement;
  if (!targetContainer) return;

  const elementRect = element.getBoundingClientRect();
  const containerRect = targetContainer.getBoundingClientRect();

  const isVisible = 
    elementRect.top >= containerRect.top &&
    elementRect.bottom <= containerRect.bottom;

  if (!isVisible) {
    element.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  }
};

/**
 * Creates a unique ID for accessibility purposes
 */
export const createAccessibilityId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};