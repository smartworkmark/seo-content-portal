'use client';

import { useEffect, useRef, useState } from 'react';

interface UseTableHeaderObserverOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useTableHeaderObserver(
  options: UseTableHeaderObserverOptions = {}
) {
  const { threshold = 0, rootMargin = '-80px 0px 0px 0px' } = options;
  const [isIntersecting, setIsIntersecting] = useState(true);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsIntersecting(entry.isIntersecting);
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return { targetRef, isIntersecting };
}
