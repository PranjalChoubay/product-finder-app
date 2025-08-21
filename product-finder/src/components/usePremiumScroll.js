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

      // Debounce the state update to avoid rapid changes while scrolling
      debounceTimeoutRef.current = setTimeout(() => {
        const newIndex = parseInt(intersectingEntry.target.dataset.index, 10);
        setActiveIndex(newIndex);
      }, 100);
    };

    const observer = new window.IntersectionObserver(observerCallback, {
      root: container,
      threshold: 0.8, // Trigger when 80% of the item is visible
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
  }, [products.length]); // Depend only on the number of products

  // Drag & Release Scrolling for Mobile
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startY = 0;
    let startTop = 0;
    let startTime = 0;
    let isDragging = false;
    let animationFrameId = null;

    const onTouchStart = (e) => {
      isDragging = true;
      startY = e.touches[0].clientY;
      startTop = el.scrollTop;
      startTime = Date.now();
      el.style.scrollSnapType = "none"; // Disable snap while dragging
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    const onTouchMove = (e) => {
      if (!isDragging) return;
      const updateScroll = () => {
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        el.scrollTop = startTop - deltaY;
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

      // Re-enable snap for the "release" animation
      el.style.scrollSnapType = "y mandatory";
      const currentPhysicalIndex = Math.round(startTop / vh);
      let targetPhysicalIndex = currentPhysicalIndex;

      // Determine target based on flick velocity or drag distance
      const flickThreshold = 0.1;
      const distanceThreshold = vh * 0.1;

      if (Math.abs(velocity) > flickThreshold) {
        targetPhysicalIndex = velocity > 0 ? currentPhysicalIndex + 1 : currentPhysicalIndex - 1;
      } else if (Math.abs(dy) > distanceThreshold) {
        targetPhysicalIndex = dy > 0 ? currentPhysicalIndex + 1 : currentPhysicalIndex - 1;
      }

      // Clamp the target index to be within bounds
      targetPhysicalIndex = Math.max(0, Math.min(products.length - 1, targetPhysicalIndex));
      
      const targetTop = targetPhysicalIndex * vh;
      el.scrollTo({ top: targetTop, behavior: "smooth" });
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [products.length]); // Also depend on products.length for clamping logic

  return {
    containerRef,
    sectionRefs,
    activeIndex,
  };
}