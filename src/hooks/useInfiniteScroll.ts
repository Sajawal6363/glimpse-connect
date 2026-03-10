import { useEffect, useRef, useState, useCallback } from "react";

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScroll(
  loadMore: () => Promise<void>,
  hasMore: boolean,
  options: UseInfiniteScrollOptions = {},
) {
  const { threshold = 0.1, rootMargin = "100px" } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        async (entries) => {
          if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
            setIsLoadingMore(true);
            try {
              await loadMore();
            } finally {
              setIsLoadingMore(false);
            }
          }
        },
        { threshold, rootMargin },
      );

      if (node) observerRef.current.observe(node);
    },
    [hasMore, isLoadingMore, loadMore, threshold, rootMargin],
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  return { lastElementRef, isLoadingMore };
}
