import { useEffect, useRef, type RefObject } from 'react';

export const useClickOutside = <T extends HTMLElement>(
  ref: RefObject<T>,
  onOutside: () => void,
  enabled = true,
): void => {
  const handlerRef = useRef(onOutside);

  useEffect(() => {
    handlerRef.current = onOutside;
  }, [onOutside]);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !ref.current) return;
      if (!ref.current.contains(target)) {
        handlerRef.current();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [enabled, ref]);
};
