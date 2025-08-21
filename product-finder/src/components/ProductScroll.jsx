import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ShoppingCart, Plus, Eye, Heart, MessageCircle, X, Share2 } from "lucide-react";
import { usePremiumScroll } from "./usePremiumScroll"; // The gesture-based hook (updated)

export default function ProductScroll({ products }) {
  // --- same state/logic as before (likes, bursts, reviews, etc) ---
  const [likedIds, setLikedIds] = useState(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem("likedProducts");
      const arr = raw ? JSON.parse(raw) : [];
      setLikedIds(new Set(arr));
    } catch {}
  }, []);

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

  const [burstProductId, setBurstProductId] = useState(null);
  const triggerBurst = (id) => {
    setBurstProductId(id);
    window.setTimeout(() => {
      setBurstProductId((curr) => (curr === id ? null : curr));
    }, 550);
  };

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

  const productsWithData = useMemo(() => {
    return products.map(p => {
      const s = String(p.id ?? p.title ?? "id");
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 10000;
      return {
        ...p,
        seededCounts: {
          likes: 120 + (h % 880),
          reviews: 7 + Math.floor(h / 7) % 193,
        }
      };
    });
  }, [products]);
  
  const [reviewsOpenFor, setReviewsOpenFor] = useState(null);
  useEffect(() => {
    if (!reviewsOpenFor) return;
    const onEsc = (e) => e.key === "Escape" && setReviewsOpenFor(null);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [reviewsOpenFor]);

  const mockReviews = [
    { user: "Aditi", rating: 5, text: "Great quality, totally worth it!" },
    { user: "Rohit", rating: 4, text: "Looks premium, delivery was fast." },
    { user: "Maya", rating: 4, text: "Exactly as shown. Good value." },
  ];

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
    } catch {}
  };

  // --- Fix for mobile viewport (100vh on iOS) ---
  useEffect(() => {
    const setVh = () => {
      // set a --vh CSS variable so we can reliably use true viewport height on mobile browsers
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  // --- position the right-side action stack slightly higher on very short screens ---
  const [actionTop, setActionTop] = useState('70%');
  useEffect(() => {
    const calc = () => {
      const h = window.innerHeight;
      if (h <= 640) setActionTop('55%');
      else if (h <= 800) setActionTop('62%');
      else setActionTop('70%');
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  // Use the (updated) gesture hook
  const { containerRef, activeIndex, wrapperProps } = usePremiumScroll(productsWithData);

  const renderedProducts = useMemo(() => {
    const items = [];
    const vh = window.innerHeight;
    for (let i = activeIndex - 1; i <= activeIndex + 1; i++) {
      if (i >= 0 && i < productsWithData.length) {
        items.push({
          product: productsWithData[i],
          position: i * vh,
          index: i,
        });
      }
    }
    return items;
  }, [activeIndex, productsWithData]);


  if (products.length === 0) {
    return <div className="flex items-center justify-center h-screen text-gray-400">No products found.</div>;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black overflow-hidden"
      style={{
        // use the --vh CSS variable so 100% height equals the true viewport height on mobile (fixes iOS issues)
        height: 'calc(var(--vh, 1vh) * 100)',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      }}
    >
      <style>{`
        @keyframes like-pop { 0% { transform: scale(0.9); } 45% { transform: scale(1.25); } 100% { transform: scale(1); } }
        .like-pop { animation: like-pop 280ms cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes heart-burst { 0% { transform: scale(0.8); opacity: 0; } 20% { opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
        .heart-burst { animation: heart-burst 550ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
      `}</style>
      
      <div className="relative h-full w-full" {...wrapperProps}>
        {renderedProducts.map(({ product, position, index }) => {
          const { likes = 0, reviews = 0 } = product.seededCounts;
          const displayLikes = likes + (likedIds.has(product.id) ? 1 : 0);
          const isActive = index === activeIndex;

          return (
            <div
              key={product.id}
              className="absolute top-0 left-0 h-full w-full flex items-center justify-center"
              style={{
                transform: `translateY(${position}px)`,
                zIndex: isActive ? 10 : 1,
              }}
              onDoubleClick={() => {
                if (!likedIds.has(product.id)) toggleLike(product.id);
                triggerBurst(product.id);
              }}
              onTouchEndCapture={() => handleTapLike(product.id)}
            >
              <img
                src={product.thumbnail}
                alt={product.title}
                // keep object fit but use a maxHeight based on the real viewport to avoid overflow on mobile
                style={{ maxHeight: 'calc(var(--vh, 1vh) * 0.8)', maxWidth: '100%', objectFit: 'contain' }}
                className="object-contain"
              />
              {burstProductId === product.id && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
                  <Heart className="h-28 w-28 text-red-500 fill-red-500 heart-burst" />
                </div>
              )}

              {/* Right side vertical action buttons. Position adjusted dynamically on small screens to avoid overlap with bottom controls */}
              <div
                className="pointer-events-auto absolute right-4 -translate-y-1/2 flex flex-col items-center gap-3 sm:gap-4 z-30"
                style={{ top: actionTop }}
              >
                <button type="button" onClick={() => toggleLike(product.id)} className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/30 text-white">
                  <Heart className={`h-8 w-8 transition-all ${likedIds.has(product.id) ? "fill-red-500 text-red-500" : "text-white"} ${likePopId === product.id ? "like-pop" : ""}`} />
                </button>
                <span className="text-xs text-white/90">{displayLikes.toLocaleString()}</span>
                <button type="button" onClick={() => setReviewsOpenFor(product.id)} className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/30 text-white">
                  <MessageCircle className="h-8 w-8" />
                </button>
                <span className="text-xs text-white/90">{reviews.toLocaleString()}</span>
                <button type="button" onClick={() => shareProduct(product)} className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/30 text-white">
                  <Share2 className="h-8 w-8" />
                </button>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 z-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
                <div className="text-white px-4 pb-4 md:px-8">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold">{product.title}</h2>
                  <p className="text-amber-400 font-bold text-3xl mt-4">${product.price?.toFixed(2) || "N/A"}</p>
                  <div className="mt-6 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
                    <button className="inline-flex flex-auto sm:flex-none items-center justify-center gap-2 px-5 py-3 rounded-full bg-amber-500 text-white font-medium min-w-0">
                      <ShoppingCart className="h-6 w-6 sm:h-5 sm:w-5" />
                      <span className="truncate ml-2">Buy Now</span>
                    </button>
                    <button className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-slate-700 text-gray-200">
                      <Plus className="h-6 w-6 sm:h-5 sm:w-5" />
                    </button>
                    <button className="hidden sm:inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-slate-700 text-gray-200">
                      <Eye className="h-6 w-6 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white text-sm px-3 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
      {reviewsOpenFor && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setReviewsOpenFor(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900 border-t border-slate-700 rounded-t-2xl max-h-[70vh] overflow-y-auto shadow-2xl">
            {/* Reviews Drawer Content... */}
          </div>
        </>
      )}
    </div>
  );
}