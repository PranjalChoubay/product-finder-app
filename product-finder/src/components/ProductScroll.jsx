import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ShoppingCart, Plus, Eye, Heart, MessageCircle, X, Share2 } from "lucide-react";
import { usePremiumScroll } from "./usePremiumScroll";

export default function ProductScroll({ products }) {
  // Use the custom hook for all scroll logic
  const {
    containerRef,
    sectionRefs,
    activeIndex,
    setActiveIndex,
    loopedProducts,
    segmentSize,
  } = usePremiumScroll(products);

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

  // --- Stable seeded counts (likes & reviews) per product ---
  const seededCounts = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      const s = String(p.id ?? p.title ?? "id");
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 10000;
      const likes = 120 + (h % 880); // 120–999
      const reviews = 7 + Math.floor(h / 7) % 193; // 7–199
      map.set(p.id, { likes, reviews });
    }
    return map;
  }, [products]);

  // --- Reviews Drawer ---
  const [reviewsOpenFor, setReviewsOpenFor] = useState(null);
  useEffect(() => {
    if (!reviewsOpenFor) return;
    const onEsc = (e) => e.key === "Escape" && setReviewsOpenFor(null);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [reviewsOpenFor]);

  // simple mock reviews
  const mockReviews = [
    { user: "Aditi", rating: 5, text: "Great quality, totally worth it!" },
    { user: "Rohit", rating: 4, text: "Looks premium, delivery was fast." },
    { user: "Maya", rating: 4, text: "Exactly as shown. Good value." },
  ];

  // --- Share handler + tiny toast ---
  const [toast, setToast] = useState("");
  const shareProduct = async (p) => {
    const url = (p.url || window.location.href) + `#product-${p.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: p.title, text: p.title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setToast("Link copied to clipboard");
        setTimeout(() => setToast(""), 1500);
      }
    } catch {
      /* user cancelled or unsupported */
    }
  };

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">No products found.</div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-y-scroll snap-y snap-mandatory overscroll-contain touch-pan-y scrollbar-hide bg-black"
    >
      {/* Local styles for IG-like heart animations */}
      <style>{`
        @keyframes like-pop { 0% { transform: scale(0.9); } 45% { transform: scale(1.25); } 100% { transform: scale(1); } }
        .like-pop { animation: like-pop 280ms cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes heart-burst { 0% { transform: scale(0.8); opacity: 0; } 20% { opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
        .heart-burst { animation: heart-burst 550ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        /* Premium scroll: hardware acceleration & smooth fade/scale */
        .premium-section {
          will-change: transform, opacity;
          transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .premium-section.inactive {
          opacity: 0.7;
          transform: scale(0.97);
        }
        .premium-section.active {
          opacity: 1;
          transform: scale(1);
        }
      `}</style>

      {loopedProducts.map((p, i) => {
        const { likes = 0, reviews = 0 } = seededCounts.get(p.id) || {};
        const displayLikes = likes + (likedIds.has(p.id) ? 1 : 0);
        return (
          <section
            key={i}
            data-index={i}
            ref={(el) => (sectionRefs.current[i] = el)}
            className={`premium-section h-screen w-full snap-start snap-always flex items-center justify-center bg-black ${
              activeIndex === ((i % segmentSize) + segmentSize) % segmentSize ? "active" : "inactive"
            }`}
            onDoubleClick={() => {
              const id = p.id;
              if (!likedIds.has(id)) toggleLike(id);
              triggerBurst(id);
            }}
            onTouchEndCapture={(e) => {
              handleTapLike(p.id);
            }}
          >
            {/* Product image centered */}
            <img
              src={p.thumbnail}
              alt={p.title}
              onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/1200x1600/0B1220/FFFFFF?text=No+Image")}
              className="object-contain max-h-full max-w-full h-[80vh]"
            />
            {/* IG-style red heart burst (center) */}
            {burstProductId === p.id && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
                <Heart className="h-28 w-28 text-red-500 fill-red-500 heart-burst drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
              </div>
            )}
            {/* IG-style action rail on the right */}
            <div className="absolute right-4 top-[70%] -translate-y-1/2 flex flex-col items-center gap-3 sm:gap-4 z-30">
              {/* Like button */}
              <button
                type="button"
                aria-label="Like product"
                aria-pressed={likedIds.has(p.id)}
                onClick={() => {
                  if (!likedIds.has(p.id)) triggerBurst(p.id);
                  toggleLike(p.id);
                }}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white shadow-lg transition-colors"
              >
                <Heart
                  className={`h-8 w-8 transition-all ${likedIds.has(p.id) ? "fill-red-500 text-red-500" : "text-white"} ${
                    likePopId === p.id ? "like-pop" : ""
                  }`}
                />
              </button>
              <span className="text-[11px] leading-none text-white/90">{displayLikes.toLocaleString()}</span>
              {/* Reviews button */}
              <button
                type="button"
                aria-label="Open reviews"
                onClick={() => setReviewsOpenFor(p.id)}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white shadow-lg transition-colors"
              >
                <MessageCircle className="h-8 w-8" />
              </button>
              <span className="text-[11px] leading-none text-white/90">{reviews.toLocaleString()}</span>
              {/* NEW: Share button */}
              <button
                type="button"
                aria-label="Share product"
                onClick={() => shareProduct(p)}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white shadow-lg transition-colors"
              >
                <Share2 className="h-8 w-8" />
              </button>
            </div>
            {/* Overlay gradient at bottom */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            {/* Text overlay bottom */}
            <div className="absolute inset-x-0 bottom-0 z-10">
              <div className="text-white px-4 pb-8 md:px-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-snug line-clamp-2">{p.title}</h2>
                {p.category && <p className="mt-1 text-sm text-gray-300 capitalize">{p.category}</p>}
                <div className="mt-4 flex items-end gap-4">
                  <p className="text-amber-400 font-bold text-3xl">${p.price?.toFixed(2) || "N/A"}</p>
                  <span className="text-xs text-gray-400">incl. taxes</span>
                </div>
                {/* BIGGER mobile buttons */}
                <div className="mt-6 flex flex-nowrap items-center gap-2 sm:gap-3">
                  <button className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-3 sm:px-5 sm:py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-sm sm:text-sm font-medium shadow-md min-h-[50px]">
                    <ShoppingCart className="h-6 w-6 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Buy Now</span>
                  </button>
                  <button className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-5 sm:py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-gray-200 text-sm sm:text-sm shadow-md min-h-[50px]">
                    <Plus className="h-6 w-6 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Add to Cart</span>
                  </button>
                  <button className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-5 sm:py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-gray-200 text-sm sm:text-sm shadow-md min-h-[50px]">
                    <Eye className="h-6 w-6 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">View Details</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      })}
      {/* Scroll hint */}
      {activeIndex === 0 && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center text-white/80">
          <span className="text-xs mb-1">Scroll</span>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      )}
      {/* Tiny toast for share fallback */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white text-sm px-3 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
      {/* Reviews Drawer (bottom sheet) */}
      {reviewsOpenFor && (
        <>
          {/* Dim background */}
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setReviewsOpenFor(null)} />
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
                          {"★".repeat(r.rating)} <span className="text-slate-500">{"★".repeat(5 - r.rating)}</span>
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
                  <button className="px-3 py-2 rounded-xl bg-amber-500 text-white text-sm opacity-60 cursor-not-allowed">Send</button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Hook this to your backend later to submit & fetch real reviews.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}