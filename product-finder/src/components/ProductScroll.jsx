import { useEffect, useRef, useState, useMemo } from "react";
import {
  ChevronDown,
  ShoppingCart,
  Plus,
  Eye,
  Heart,
  MessageCircle,
  X,
  Share2,
} from "lucide-react";

/**
 * ProductScroll.jsx
 * - IG-like single-item vertical paging on mobile
 * - Right-side action rail aligned above bottom action row
 * - Stable seeded likes/reviews shown under icons
 * - Share button added
 * - Bigger bottom action buttons for mobile
 *
 * Notes:
 * - Expects `products` array of objects with { id, title, thumbnail, price, category, url? }
 * - Keep images reasonably sized server-side for best performance
 */

export default function ProductScroll({ products = [] }) {
  const ACTION_ROW_H = 78; // px - height of bottom action container (used to position right rail)
  const containerRef = useRef(null);
  const sectionRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0); // normalized index 0..segmentSize-1
  const [likedIds, setLikedIds] = useState(new Set());
  const [likePopId, setLikePopId] = useState(null);
  const [burstProductId, setBurstProductId] = useState(null);
  const [reviewsOpenFor, setReviewsOpenFor] = useState(null);
  const [toast, setToast] = useState("");
  const segmentSize = products.length;
  const loopedProducts = segmentSize ? [...products, ...products, ...products] : [];

  // stable seeded counts so numbers look realistic and deterministic
  const seededCounts = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      const s = String(p.id ?? p.title ?? Math.random());
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
      const likes = 120 + (h % 880); // 120..999
      const reviews = 7 + ((Math.floor(h / 7)) % 193); // 7..199
      map.set(p.id, { likes, reviews });
    }
    return map;
  }, [products]);

  // load liked ids from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("likedProducts");
      const arr = raw ? JSON.parse(raw) : [];
      setLikedIds(new Set(arr));
    } catch {
      setLikedIds(new Set());
    }
  }, []);

  const toggleLike = (id) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        setLikePopId(id);
        setTimeout(() => {
          setLikePopId((cur) => (cur === id ? null : cur));
        }, 300);
      }
      try {
        localStorage.setItem("likedProducts", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const triggerBurst = (id) => {
    setBurstProductId(id);
    setTimeout(() => {
      setBurstProductId((curr) => (curr === id ? null : curr));
    }, 550);
  };

  // double-tap detection on touch (IG-style)
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

  // keyboard navigation for desktop/dev
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current) return;
      const vh = window.innerHeight;
      if (e.key === "ArrowDown") containerRef.current.scrollBy({ top: vh, behavior: "smooth" });
      if (e.key === "ArrowUp") containerRef.current.scrollBy({ top: -vh, behavior: "smooth" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Share handler with Web Share API fallback to clipboard
  const shareProduct = async (p) => {
    const url = (p.url || window.location.href) + `#product-${p.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: p.title, text: p.title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setToast("Link copied to clipboard");
        setTimeout(() => setToast(""), 1400);
      }
    } catch {
      // ignore share cancel/errors
    }
  };

  // --- Setup initial scroll (to middle segment) once on mount & when screen size changes ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el || segmentSize === 0) return;
    // ensure this runs after layout
    const setStart = () => {
      const vh = window.innerHeight;
      el.scrollTop = segmentSize * vh;
    };
    setStart();
    // if orientation/size changes, reset to center again
    window.addEventListener("resize", setStart);
    return () => window.removeEventListener("resize", setStart);
  }, [segmentSize]);

  // --- Smooth, low-cost scroll handler: update active index via rAF only ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el || segmentSize === 0) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const vh = window.innerHeight;
        const physical = Math.round(el.scrollTop / vh);
        // map physical (0..3*segmentSize-1) -> normalized
        const normalized = ((physical % segmentSize) + segmentSize) % segmentSize;
        setActiveIndex(normalized);
        ticking = false;
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [segmentSize]);

  // --- Mobile-only: single-item-per-flick logic and re-centering to middle segment ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el || segmentSize === 0) return;

    let startY = 0;
    let startScroll = 0;
    let startTime = 0;
    let moved = false;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      startScroll = el.scrollTop;
      startTime = Date.now();
      moved = false;
    };

    const onTouchMove = () => {
      moved = true;
    };

    const snapToPhysical = (targetPhysical) => {
      const vh = window.innerHeight;
      const targetTop = targetPhysical * vh;
      el.scrollTo({ top: targetTop, behavior: "smooth" });

      // watch for scroll settle, then normalize to middle segment instantly
      const settleCheck = () => {
        // when smooth scroll is close to target, jump to middle segment if needed
        if (Math.abs(el.scrollTop - targetTop) < 2 || Math.abs(el.scrollTop - targetTop) / vh < 0.01) {
          // normalize: if target is in first segment (0..segmentSize-1) -> shift +segmentSize
          // if in third (2*segmentSize .. ) -> shift -segmentSize
          if (targetPhysical < segmentSize) {
            el.scrollTo({ top: targetTop + segmentSize * vh, behavior: "auto" });
          } else if (targetPhysical >= 2 * segmentSize) {
            el.scrollTo({ top: targetTop - segmentSize * vh, behavior: "auto" });
          }
          return;
        }
        requestAnimationFrame(settleCheck);
      };
      requestAnimationFrame(settleCheck);
    };

    const onTouchEnd = () => {
      if (!moved) return; // it was a tap
      const dy = el.scrollTop - startScroll; // positive -> user moved content up => go to next
      const dt = Math.max(1, Date.now() - startTime);
      const vh = window.innerHeight;

      // Strong rule: go exactly one item per flick, ignoring how hard the user flicked.
      // Direction derived purely from dy sign (and a tiny threshold to ignore micro-movements)
      const threshold = Math.min(0.05 * vh, 36); // ignore micro-movements
      let direction = 0;
      if (dy > threshold) direction = 1;
      else if (dy < -threshold) direction = -1;
      else direction = 0; // if negligible, snap back to nearest

      const currentPhysical = Math.round(startScroll / vh);
      let targetPhysical = currentPhysical + direction;

      // clamp but we have looping so allow values 0 .. 3*segmentSize-1
      if (targetPhysical < 0) targetPhysical = 0;
      if (targetPhysical >= loopedProducts.length) targetPhysical = loopedProducts.length - 1;

      snapToPhysical(targetPhysical);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [segmentSize, loopedProducts.length]);

  // Reviews escape key
  useEffect(() => {
    if (!reviewsOpenFor) return;
    const onEsc = (e) => e.key === "Escape" && setReviewsOpenFor(null);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [reviewsOpenFor]);

  if (segmentSize === 0) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        No products found.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      // inject CSS variable for action-row height so rail can align
      style={{ ["--action-row-h"]: `${ACTION_ROW_H}px` }}
      className="relative h-screen w-full overflow-y-auto touch-pan-y scrollbar-hide bg-black snap-y snap-mandatory scroll-smooth -webkit-overflow-scrolling-touch"
    >
      {/* local animations & small utility styles */}
      <style>{`
        /* animations */
        @keyframes like-pop {
          0% { transform: scale(0.88); }
          45% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        .like-pop { animation: like-pop 280ms ease-out; }

        @keyframes heart-burst {
          0% { transform: scale(0.8); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .heart-burst { animation: heart-burst 550ms ease-out forwards; }

        /* ensure each section is a strict page */
        .snap-start { scroll-snap-align: start; scroll-snap-stop: always; }
      `}</style>

      {/* left progress indicator - subtle */}
      <div className="fixed left-3 top-1/2 -translate-y-1/2 h-3/5 z-40 flex items-center">
        <div className="w-1.5 h-full rounded-full bg-slate-700 relative overflow-hidden">
          <div
            className="absolute left-0 top-0 w-full bg-amber-400 rounded-full transition-transform"
            style={{
              height: `${Math.max(6, (activeIndex / Math.max(1, segmentSize - 1)) * 100)}%`,
              transformOrigin: "top",
            }}
          />
        </div>
      </div>

      {loopedProducts.map((p, i) => {
        const normalized = ((i % segmentSize) + segmentSize) % segmentSize;
        const isActive = normalized === activeIndex;
        const counts = seededCounts.get(p.id) || { likes: 0, reviews: 0 };
        const displayLikes = counts.likes + (likedIds.has(p.id) ? 1 : 0);

        // Pull some image loading priority: center segment (middle) gets higher fetch priority
        const centerSegmentStart = segmentSize;
        const isCenterPhysical = i >= centerSegmentStart && i < centerSegmentStart + segmentSize && normalized === activeIndex;

        return (
          <section
            key={`${p.id}-${i}`}
            data-index={i}
            ref={(el) => (sectionRefs.current[i] = el)}
            className="relative h-screen w-full snap-start flex items-center justify-center bg-black"
            onDoubleClick={() => {
              const id = p.id;
              if (!likedIds.has(id)) toggleLike(id);
              triggerBurst(id);
            }}
            onTouchEnd={() => handleTapLike(p.id)}
            aria-hidden={false}
          >
            {/* Parallax + subtle scale on active item */}
            <img
              src={p.thumbnail}
              alt={p.title}
              decoding="async"
              loading="lazy"
              fetchpriority={isCenterPhysical ? "high" : "auto"}
              onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/1200x1600/0B1220/FFFFFF?text=No+Image")}
              className={`object-contain max-h-full max-w-full h-[80vh] transition-transform duration-400 ease-out will-change-transform ${
                isActive ? "scale-100" : "scale-[0.985] opacity-80"
              }`}
              style={{
                transform: isActive ? "scale(1)" : "scale(.985)",
                transition: "transform 420ms cubic-bezier(.2,.9,.2,1), opacity 300ms",
                willChange: "transform, opacity",
              }}
            />

            {/* Center burst animation */}
            {burstProductId === p.id && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-30">
                <Heart className="h-28 w-28 text-red-500 fill-red-500 heart-burst drop-shadow-[0_0_18px_rgba(239,68,68,0.6)]" />
              </div>
            )}

            {/* Right-side action rail: aligned above bottom action row using CSS var */}
            <div
              className="absolute right-4 z-30 flex flex-col items-center gap-3"
              style={{ bottom: `calc(var(--action-row-h) + 18px)` }}
            >
              {/* Like */}
              <button
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
              <span className="text-[12px] leading-none text-white/90">{displayLikes.toLocaleString()}</span>

              {/* Reviews */}
              <button
                aria-label="Open reviews"
                onClick={() => setReviewsOpenFor(p.id)}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white shadow-lg transition-colors"
              >
                <MessageCircle className="h-8 w-8" />
              </button>
              <span className="text-[12px] leading-none text-white/90">{counts.reviews.toLocaleString()}</span>

              {/* Share */}
              <button
                aria-label="Share product"
                onClick={() => shareProduct(p)}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white shadow-lg transition-colors"
              >
                <Share2 className="h-8 w-8" />
              </button>
            </div>

            {/* Bottom gradient for readability */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(var(--action-row-h)+120px)] bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

            {/* Bottom details + action row */}
            <div className="absolute inset-x-0 bottom-0 z-20" style={{ height: `var(--action-row-h)` }}>
              <div className="text-white px-4 pb-4 md:px-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-snug line-clamp-2">
                  {p.title}
                </h2>
                {p.category && <p className="mt-1 text-sm text-gray-300 capitalize">{p.category}</p>}
                <div className="mt-2 flex items-end gap-4">
                  <p className="text-amber-400 font-bold text-3xl">${p.price?.toFixed(2) || "N/A"}</p>
                  <span className="text-xs text-gray-400">incl. taxes</span>
                </div>

                {/* action row (big tappable) - larger icons & hit area for mobile */}
                <div className="mt-4 flex flex-nowrap items-center gap-3">
                  <button
                    className="inline-flex flex-1 items-center justify-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-base font-medium shadow-lg min-h-[50px]"
                    onClick={() => {
                      /* wire to buy flow */
                    }}
                  >
                    <ShoppingCart className="h-6 w-6" />
                    <span>Buy Now</span>
                  </button>

                  <button
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-slate-700 hover:bg-slate-600 text-gray-200 text-base shadow-lg min-h-[50px]"
                    onClick={() => {
                      /* add to cart */
                    }}
                  >
                    <Plus className="h-6 w-6" />
                    <span>Add</span>
                  </button>

                  <button
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-slate-700 hover:bg-slate-600 text-gray-200 text-base shadow-lg min-h-[50px]"
                    onClick={() => {
                      /* view details */
                    }}
                  >
                    <Eye className="h-6 w-6" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* scroll hint */}
      {activeIndex === 0 && (
        <div className="pointer-events-none absolute bottom-[calc(var(--action-row-h)+8px)] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center text-white/80">
          <span className="text-xs mb-1">Scroll</span>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      )}

      {/* share toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white text-sm px-3 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {/* Reviews Drawer (UI only) */}
      {reviewsOpenFor && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setReviewsOpenFor(null)} />
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
              {/* simple mocked reviews */}
              <ul className="space-y-4">
                {[{ user: "Aditi", rating: 5, text: "Great quality, totally worth it!" },
                  { user: "Rohit", rating: 4, text: "Looks premium, delivery was fast." },
                  { user: "Maya", rating: 4, text: "Exactly as shown. Good value." }].map((r, idx) => (
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
