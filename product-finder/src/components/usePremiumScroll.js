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

  const vh = window.innerHeight;

  // This effect recalculates the container's position whenever the activeIndex changes.
  useEffect(() => {
    setTranslateY(-activeIndex * vh);
  }, [activeIndex, vh]);

  const onTouchStart = useCallback((e) => {
    gestureRef.startY = e.touches[0].clientY;
    gestureRef.lastY = e.touches[0].clientY;
    gestureRef.startTranslateY = -activeIndex * vh;
    gestureRef.lastTime = Date.now();
    gestureRef.velocity = 0;
    setTransitionDuration('0ms'); // No transition while dragging
  }, [activeIndex, vh, gestureRef]);

  const onTouchMove = useCallback((e) => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - gestureRef.startY;
    const currentTime = Date.now();
    const deltaTime = currentTime - gestureRef.lastTime;

    // Calculate velocity
    if (deltaTime > 0) {
      gestureRef.velocity = (currentY - gestureRef.lastY) / deltaTime;
    }
    gestureRef.lastY = currentY;
    gestureRef.lastTime = currentTime;

    setTranslateY(gestureRef.startTranslateY + deltaY);
  }, [gestureRef]);

  const onTouchEnd = useCallback(() => {
    setTransitionDuration('300ms'); // Re-enable smooth transition for the snap
    const finalTranslateY = translateY;
    const endTranslateY = -activeIndex * vh;
    const deltaY = finalTranslateY - endTranslateY;

    const flickThreshold = 0.3; // High velocity flick
    const distanceThreshold = vh * 0.05; // Drag 5% of the screen

    // Decision logic to change the active index
    // 1. Check for a fast flick down (to next item)
    if (gestureRef.velocity < -flickThreshold && activeIndex < products.length - 1) {
      setActiveIndex(activeIndex + 1);
    // 2. Check for a fast flick up (to previous item)
    } else if (gestureRef.velocity > flickThreshold && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    // 3. Check for a long drag down
    } else if (deltaY < -distanceThreshold && activeIndex < products.length - 1) {
      setActiveIndex(activeIndex + 1);
    // 4. Check for a long drag up
    } else if (deltaY > distanceThreshold && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    // 5. If none of the above, snap back to the current item
    } else {
      setTranslateY(endTranslateY);
    }
  }, [activeIndex, products.length, translateY, vh, gestureRef]);

  return {
    containerRef,
    activeIndex,
    // The props to be applied to the gesture-controlled wrapper
    wrapperProps: {
      style: {
        transform: `translateY(${translateY}px)`,
        transition: `transform ${transitionDuration}`,
      },
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}