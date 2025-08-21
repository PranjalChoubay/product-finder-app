import { useEffect, useRef, useState } from "react";

export function usePremiumScroll(products) {
  const containerRef = useRef(null);
  const sectionRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const segmentSize = products.length;
  const loopedProducts = segmentSize > 0 ? [...products, ...products, ...products] : [];
  const isJumpingRef = useRef(false);
  const debounceTimeoutRef = useRef(null);

  // Keyboard navigation (desktop/testing convenience)
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

  // Debounced Intersection Observer + snap-stop to avoid skipping
  useEffect(() => {
    const container = containerRef.current;
    if (!container || segmentSize === 0) return;
    const vh = window.innerHeight;
    container.scrollTop = segmentSize * vh;
    const observerCallback = (entries) => {
      if (isJumpingRef.current) return;
      const intersectingEntry = entries.find((entry) => entry.isIntersecting);
      if (!intersectingEntry) return;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        const newIndex = parseInt(intersectingEntry.target.dataset.index, 10);
        const normalizedIndex = ((newIndex % segmentSize) + segmentSize) % segmentSize;
        setActiveIndex(normalizedIndex);
        // Seamless infinite loop: keep user in the middle segment
        if (newIndex < segmentSize) {
          isJumpingRef.current = true;
          container.style.transition = "none";
          container.style.pointerEvents = "none";
          requestAnimationFrame(() => {
            container.scrollTo({ top: container.scrollTop + segmentSize * vh, behavior: "auto" });
            requestAnimationFrame(() => {
              container.style.transition = "";
              container.style.pointerEvents = "";
              isJumpingRef.current = false;
            });
          });
        } else if (newIndex >= 2 * segmentSize) {
          isJumpingRef.current = true;
          container.style.transition = "none";
          container.style.pointerEvents = "none";
          requestAnimationFrame(() => {
            container.scrollTo({ top: container.scrollTop - segmentSize * vh, behavior: "auto" });
            requestAnimationFrame(() => {
              container.style.transition = "";
              container.style.pointerEvents = "";
              isJumpingRef.current = false;
            });
          });
        }
      }, 120);
    };
    const observer = new window.IntersectionObserver(observerCallback, {
      root: container,
      threshold: 0.9,
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
  }, [segmentSize, loopedProducts]);

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
      el.style.scrollSnapType = "none";
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
      el.style.scrollSnapType = "y mandatory";
      const currentPhysicalIndex = Math.round(startTop / vh);
      let targetPhysicalIndex = currentPhysicalIndex;
      const flickThreshold = 0.05; // ultra sensitive
      const distanceThreshold = vh * 0.03; // ultra sensitive
      if (Math.abs(velocity) > flickThreshold) {
        targetPhysicalIndex = velocity > 0 ? currentPhysicalIndex + 1 : currentPhysicalIndex - 1;
      } else if (Math.abs(dy) > distanceThreshold) {
        targetPhysicalIndex = dy > 0 ? currentPhysicalIndex + 1 : currentPhysicalIndex - 1;
      }
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
  }, []);

  return {
    containerRef,
    sectionRefs,
    activeIndex,
    setActiveIndex,
    loopedProducts,
    segmentSize,
  };
}
