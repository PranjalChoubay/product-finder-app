import { useState, useRef, useEffect, useCallback } from 'react';

export function usePremiumScroll(products) {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [transitionDuration, setTransitionDuration] = useState('300ms');

  const gestureRef = useRef({
    startY: 0,
    startTranslateY: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
  }).current;

  // Keep a reactive viewport height so translations/snap thresholds adapt when mobile chrome/navbar shows/hides
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Recalculate position when active item changes or viewport height changes
  useEffect(() => {
    setTranslateY(-activeIndex * vh);
  }, [activeIndex, vh]);

  const onTouchStart = useCallback((e) => {
    const startY = e.touches[0].clientY;
    gestureRef.startY = startY;
    gestureRef.lastY = startY;
    gestureRef.startTranslateY = -activeIndex * vh;
    gestureRef.lastTime = Date.now();
    gestureRef.velocity = 0;
    setTransitionDuration('0ms'); // No transition while dragging
  }, [activeIndex, vh, gestureRef]);

  const onTouchMove = useCallback((e) => {
    const currentY = e.touches[0].clientY;
    const currentTime = Date.now();
    const deltaTime = currentTime - gestureRef.lastTime;

    if (deltaTime > 0) {
      gestureRef.velocity = (currentY - gestureRef.lastY) / deltaTime;
    }
    gestureRef.lastY = currentY;
    gestureRef.lastTime = currentTime;

    const deltaY = currentY - gestureRef.startY;
    setTranslateY(gestureRef.startTranslateY + deltaY);
  }, [gestureRef]);

  const onTouchEnd = useCallback(() => {
    setTransitionDuration('300ms'); // Re-enable smooth transition for the snap
    const finalTranslateY = translateY;
    const endTranslateY = -activeIndex * vh;
    const deltaY = finalTranslateY - endTranslateY;

    const flickThreshold = 0.3; // High velocity flick
    const distanceThreshold = vh * 0.05; // Drag 5% of the screen

    if (gestureRef.velocity < -flickThreshold && activeIndex < products.length - 1) {
      setActiveIndex(i => Math.min(i + 1, products.length - 1));
    } else if (gestureRef.velocity > flickThreshold && activeIndex > 0) {
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (deltaY < -distanceThreshold && activeIndex < products.length - 1) {
      setActiveIndex(i => Math.min(i + 1, products.length - 1));
    } else if (deltaY > distanceThreshold && activeIndex > 0) {
      setActiveIndex(i => Math.max(i - 1, 0));
    } else {
      setTranslateY(endTranslateY);
    }
  }, [activeIndex, products.length, translateY, vh, gestureRef]);

  // Enable wheel scroll on desktop
useEffect(() => {
  const el = containerRef.current;
  if (!el) return;

  const onWheel = (e) => {
    if (e.deltaY > 0 && activeIndex < products.length - 1) {
      setActiveIndex((i) => Math.min(i + 1, products.length - 1));
    } else if (e.deltaY < 0 && activeIndex > 0) {
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
  };

  el.addEventListener("wheel", onWheel, { passive: true });
  return () => el.removeEventListener("wheel", onWheel);
}, [activeIndex, products.length]);

// Enable keyboard navigation (ArrowUp / ArrowDown)
useEffect(() => {
  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" && activeIndex < products.length - 1) {
      setActiveIndex((i) => Math.min(i + 1, products.length - 1));
    } else if (e.key === "ArrowUp" && activeIndex > 0) {
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [activeIndex, products.length]);


  return {
    containerRef,
    activeIndex,
    wrapperProps: {
      style: {
        transform: `translateY(${translateY}px)`,
        transition: `transform ${transitionDuration} cubic-bezier(0.22,1,0.36,1)`,
        willChange: 'transform',
        touchAction: 'pan-y',
      },
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
