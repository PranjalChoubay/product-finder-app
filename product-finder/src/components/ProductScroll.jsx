import { useEffect, useRef, useState } from "react";
import { ChevronDown, ShoppingCart, Plus, Eye, Heart, MessageCircle, X } from "lucide-react";

export default function ProductScroll({ products }) {
  const containerRef = useRef(null);
  const sectionRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const segmentSize = products.length;
  const loopedProducts = segmentSize > 0 ? [...products, ...products, ...products] : [];
  const isJumpingRef = useRef(false); // Ref to prevent scroll events during programmatic jumps

  // Likes persisted in localStorage shared with cards
  const [likedIds, setLikedIds] = useState(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem("likedProducts");
      const arr = raw ? JSON.parse(raw) : [];
      setLikedIds(new Set(arr));
    } catch {}
  }, []);

  // small pop animation on heart icon
  const [likePopId, setLikePopId] = useState(null);
  const toggleLike = (id) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // trigger IG-like pop on the small heart
        setLikePopId(id);
        window.setTimeout(() => {
          setLikePopId((curr) => (curr === id ? null : curr));
        }, 300);
      }
      try {
        localStorage.setItem("likedProducts", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Double-tap like red heart burst (center)
  const [burstProductId, setBurstProductId] = useState(null);
  const triggerBurst = (id) => {
    setBurstProductId(id);
    window.setTimeout(() => {
      setBurstProductId((curr) => (curr === id ? null : curr));
    }, 550);
  };

  // Touch double-tap detection per IG style
  const lastTapRef = useRef({ time: 0, id: null });
  const handleTapLike = (id) => {
    const now = Date.now();
    const { time, id: lastId } = lastTapRef.current;
    if (lastId === id && now - time < 300) {
      if (!likedIds.has(id)) toggleLike(id);
      triggerBurst(id);
    }
    lastTapRef.current = { time: now, id };
  };

  // Handle keyboard navigation
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

  // --- NEW: Intersection Observer for perfect scroll detection ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container || segmentSize === 0) return;

    const vh = window.innerHeight;
    
    // Set initial scroll to the middle segment for infinite loop
    container.scrollTop = segmentSize * vh;

    const observerCallback = (entries) => {
      if (isJumpingRef.current) return; // Ignore observer events during a jump

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const newIndex = parseInt(entry.target.dataset.index, 10);
          const normalizedIndex = ((newIndex % segmentSize) + segmentSize) % segmentSize;
          setActiveIndex(normalizedIndex);

          // Logic for seamless infinite loop
          if (newIndex < segmentSize) {
            isJumpingRef.current = true;
            container.scrollTop += segmentSize * vh;
            setTimeout(() => { isJumpingRef.current = false; }, 100); // Reset jump flag
          } else if (newIndex >= 2 * segmentSize) {
            isJumpingRef.current = true;
            container.scrollTop -= segmentSize * vh;
            setTimeout(() => { isJumpingRef.current = false; }, 100); // Reset jump flag
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: container,
      threshold: 0.5, // Trigger when 50% of the item is visible
    });

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      sectionRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [segmentSize]);


  // --- Reviews Drawer ---
  const [reviewsOpenFor, setReviewsOpenFor] = useState(null);
  useEffect(() => {
    if (!reviewsOpenFor) return;
    const onEsc = (e) => e.key === "Escape" && setReviewsOpenFor(null);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [reviewsOpenFor]);

  // simple mock reviews (replace with backend later)
  const mockReviews = [
    { user: "Aditi", rating: 5, text: "Great quality, totally worth it!" },
    { user: "Rohit", rating: 4, text: "Looks premium, delivery was fast." },
    { user: "Maya", rating: 4, text: "Exactly as shown. Good value." },
  ];

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        No products found.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black"
    >
      {/* Local styles for IG-like heart animations */}
      <style>{`
        @keyframes like-pop {
          0% { transform: scale(0.9); }
          45% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        .like-pop { animation: like-pop 280ms ease-out; }

        @keyframes heart-burst {
          0% { transform: scale(0.8); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .heart-burst { animation: heart-burst 550ms ease-out forwards; }
      `}</style>

      {loopedProducts.map((p, i) => (
        <section
          key={i}
          data-index={i}
          ref={(el) => (sectionRefs.current[i] = el)}
          className="relative h-screen w-full snap-start flex items-center justify-center bg-black"
          onDoubleClick={() => {
            const id = p.id;
            if (!likedIds.has(id)) toggleLike(id);
            triggerBurst(id);
          }}
          onTouchEnd={() => handleTapLike(p.id)}
        >
          {/* Product image centered */}
          <img
            src={p.thumbnail}
            alt={p.title}
            onError={(e) =>
              (e.target.src =
                "https://via.placeholder.com/1200x1600/0B1220/FFFFFF?text=No+Image")
            }
            className={`object-contain max-h-full max-w-full h-[80vh] transition-opacity duration-700 ${
              activeIndex === ((i % segmentSize) + segmentSize) % segmentSize ? "opacity-100" : "opacity-70"
            }`}
          />

          {/* IG-style red heart burst (center) */}
          {burstProductId === p.id && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
              <Heart className="h-28 w-28 text-red-500 fill-red-500 heart-burst drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
            </div>
          )}

          {/* IG-style action rail on the right */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-30">
            {/* Like button */}
            <button
              type="button"
              aria-label="Like product"
              aria-pressed={likedIds.has(p.id)}
              onClick={() => {
                if (!likedIds.has(p.id)) triggerBurst(p.id);
                toggleLike(p.id);
              }}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white shadow-lg transition-colors"
            >
              <Heart
                className={`h-6 w-6 transition-all ${
                  likedIds.has(p.id)
                    ? "fill-red-500 text-red-500"
                    : "text-white"
                } ${likePopId === p.id ? "like-pop" : ""}`}
              />
            </button>

            {/* Reviews button */}
            <button
              type="button"
              aria-label="Open reviews"
              onClick={() => setReviewsOpenFor(p.id)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white shadow-lg transition-colors"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Overlay gradient at bottom */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Text overlay bottom */}
          <div className="absolute inset-x-0 bottom-0 z-10">
            <div className="text-white px-4 pb-8 md:px-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-snug line-clamp-2">
                {p.title}
              </h2>
              {p.category && (
                <p className="mt-1 text-sm text-gray-300 capitalize">{p.category}</p>
              )}
              <div className="mt-4 flex items-end gap-4">
                <p className="text-amber-400 font-bold text-3xl">${p.price?.toFixed(2) || "N/A"}</p>
                <span className="text-xs text-gray-400">incl. taxes</span>
              </div>
              {/* Forcefully aligned buttons for mobile */}
              <div className="mt-6 flex flex-nowrap items-center gap-2 sm:gap-3">
                <button className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-medium shadow-md">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Buy Now</span>
                </button>
                <button className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-gray-200 text-xs sm:text-sm">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add to Cart</span>
                </button>
                <button className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-gray-200 text-xs sm:text-sm">
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">View Details</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Scroll hint */}
      {activeIndex === 0 && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center text-white/80">
          <span className="text-xs mb-1">Scroll</span>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      )}

      {/* Reviews Drawer (bottom sheet) */}
      {reviewsOpenFor && (
        <>
          {/* Dim background */}
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setReviewsOpenFor(null)}
          />
          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900 border-t border-slate-700 rounded-t-2xl max-h-[70vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm p-4 border-b border-slate-800 rounded-t-2xl flex items-center justify-between">
              <div className="h-1.5 w-12 bg-slate-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 -mt-3" />
              <h3 className="text-gray-100 font-semibold">Reviews</h3>
              <button
                onClick={() => setReviewsOpenFor(null)}
                className="p-1 rounded-full hover:bg-slate-800 text-gray-300"
                aria-label="Close reviews"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <ul className="space-y-4">
                {mockReviews.map((r, idx) => (
                  <li key={idx} className="flex gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-xs text-gray-200">
                      {r.user.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-200 font-medium">{r.user}</span>
                        <span className="text-amber-400 text-xs">
                          {"★".repeat(r.rating)}{" "}
                          <span className="text-slate-500">{"★".repeat(5 - r.rating)}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{r.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {/* Placeholder input (UI only) */}
              <div className="mt-4 border-t border-slate-800 pt-4">
                <div className="flex gap-2">
                  <input
                    disabled
                    placeholder="Write a review (mock UI)…"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
                  />
                  <button className="px-3 py-2 rounded-xl bg-amber-500 text-white text-sm opacity-60 cursor-not-allowed">
                    Send
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Hook this to your backend later to submit & fetch real reviews.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
