import { useEffect, useRef, useState } from "react";

export function usePremiumScroll(products) {
  const containerRef = useRef(null);
  const sectionRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceTimeoutRef = useRef(null);

  // Preload images for the next and previous product to reduce flickering
  useEffect(() => {
    if (!products || products.length === 0) return;
    const prev = products[activeIndex - 1];
    const next = products[activeIndex + 1];
    if (prev && prev.thumbnail) {
      const imgPrev = new window.Image();
      imgPrev.src = prev.thumbnail;
    }
    if (next && next.thumbnail) {
      const imgNext = new window.Image();
      imgNext.src = next.thumbnail;
    }
  }, [activeIndex, products]);

  // Keyboard navigation (ArrowUp/ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!containerRef.current) return;
      const vh = window.innerHeight;
      if (e.key === "ArrowDown") {
        containerRef.current.scrollBy({ top: vh, behavior: "smooth" });
      }
      if (e.key === "ArrowUp") {
        containerRef.current.scrollBy({ top: -vh, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Intersection Observer to detect the current active product
  useEffect(() => {
    const container = containerRef.current;
    if (!container || products.length === 0) return;

    const observerCallback = (entries) => {
      const intersectingEntry = entries.find((entry) => entry.isIntersecting);
      if (!intersectingEntry) return;

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        const newIndex = parseInt(intersectingEntry.target.dataset.index, 10);
        setActiveIndex(newIndex);
      }, 100);
    };

    const observer = new window.IntersectionObserver(observerCallback, {
      root: container,
      threshold: 0.8,
    });

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      sectionRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [products.length]);

  // Drag & Release Scrolling for Mobile
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    let scrollStopTimer = null;
    let startY = 0;
    let startX = 0;
    let startTop = 0;
    let startTime = 0;
    let isDragging = false;
    let animationFrameId = null;

    // NEW: This function runs when scrolling stops and re-enables CSS snapping.
    const onScrollStop = () => {
      if (el) {
        el.style.scrollSnapType = 'y mandatory';
      }
    };
    
    // NEW: A scroll listener that resets a timer. When the timer finally runs,
    // we know the scrolling has stopped.
    const handleScroll = () => {
      clearTimeout(scrollStopTimer);
      scrollStopTimer = setTimeout(onScrollStop, 5);
    };
    
    el.addEventListener('scroll', handleScroll);

    const onTouchStart = (e) => {
      clearTimeout(scrollStopTimer);
      isDragging = true;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      startTop = el.scrollTop;
      startTime = Date.now();
      el.style.scrollSnapType = "none";
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    const onTouchMove = (e) => {
      if (!isDragging) return;

      const updateScroll = () => {
        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const deltaY = currentY - startY;
        const deltaX = currentX - startX;

        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          el.scrollTop = startTop - deltaY;
        }
        animationFrameId = null;
      };

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(updateScroll);
    };

    const onTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      const vh = window.innerHeight;
      const dt = Date.now() - startTime;
      const endTop = el.scrollTop;
      const dy = endTop - startTop;
      const velocity = dy / dt;
      
      const currentPhysicalIndex = Math.round(startTop / vh);
      let targetPhysicalIndex = currentPhysicalIndex;

      const flickThreshold = 0.075;
      const distanceThreshold = vh * 0.05;

      if (Math.abs(velocity) > flickThreshold) {
        targetPhysicalIndex = velocity > 0 ? currentPhysicalIndex + 1 : currentPhysicalIndex - 1;
      } else if (Math.abs(dy) > distanceThreshold) {
        targetPhysicalIndex = dy > 0 ? currentPhysicalIndex + 1 : currentPhysicalIndex - 1;
      }

      targetPhysicalIndex = Math.max(0, Math.min(products.length - 1, targetPhysicalIndex));
      
      const targetTop = targetPhysicalIndex * vh;
      el.scrollTo({ top: targetTop, behavior: "smooth" });
      
      // REMOVED: The unreliable setTimeout from here. The scroll listener now handles this.
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive:true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    // Cleanup function for the effect
    return () => {
      el.removeEventListener('scroll', handleScroll);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (scrollStopTimer) clearTimeout(scrollStopTimer);
    };
  }, [products.length]);

  return {
    containerRef,
    sectionRefs,
    activeIndex,
  };
}