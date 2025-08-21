import { useEffect, useRef, useState, useMemo } from "react";
import { ShoppingCart, Plus, Eye, Heart, MessageCircle, Share2 } from "lucide-react";

// Restored — Instagram-like smooth one-item vertical paging with infinite loop
export default function ProductScroll({ products = [] }) {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [toast, setToast] = useState("");

  // safety
  const segmentSize = Math.max(0, products.length);
  const loopedProducts = segmentSize ? [...products, ...products, ...products] : [];

  // consistent seeded counts if product doesn't provide counts
  const seededCounts = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      const s = String(p.id ?? p.name ?? p.title ?? Math.random());
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
      map.set(p.id, {
        likes: (p.likes ?? (120 + (h % 880))),
        reviews: (p.reviews ?? (7 + ((Math.floor(h / 7)) % 193)))
      });
    }
    return map;
  }, [products]);

  // set initial scroll to middle segment, and keep it centered on resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el || segmentSize === 0) return;
    const setToMiddle = () => {
      const vh = window.innerHeight;
      el.scrollTop = segmentSize * vh;
    };
    // small delay to allow layout
    setTimeout(setToMiddle, 50);
    window.addEventListener('resize', setToMiddle);
    return () => window.removeEventListener('resize', setToMiddle);
  }, [segmentSize]);

  // lightweight scroll updater using rAF (no heavy observers per frame)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || segmentSize === 0) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const vh = window.innerHeight;
        const physicalIndex = Math.round(el.scrollTop / vh);
        const normalized = ((physicalIndex % segmentSize) + segmentSize) % segmentSize;
        setActiveIndex(normalized);
        ticking = false;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [segmentSize]);

  // robust touch snapping: ONLY one-step per flick (prevents skipping multiple items)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || segmentSize === 0) return;

    let startScroll = 0;
    let startTime = 0;
    let moved = false;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      startScroll = el.scrollTop;
      startTime = Date.now();
      moved = false;
    };

    const onTouchMove = () => {
      moved = true;
    };

    const normalizeToMiddleIfNeeded = (targetPhysical, targetTop) => {
      const vh = window.innerHeight;
      // if user lands in first copy, jump forward by segmentSize
      if (targetPhysical < segmentSize) {
        // after smooth snap, jump to middle segment instantly
        requestAnimationFrame(() => {
          // small timeout to let smooth scroll settle visually
          setTimeout(() => {
            el.scrollTo({ top: targetTop + segmentSize * vh, behavior: 'auto' });
          }, 80);
        });
      } else if (targetPhysical >= 2 * segmentSize) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            el.scrollTo({ top: targetTop - segmentSize * vh, behavior: 'auto' });
          }, 80);
        });
      }
    };

    const onTouchEnd = () => {
      if (!moved) return; // treat as tap
      const endScroll = el.scrollTop;
      const dy = endScroll - startScroll; // positive -> moved up -> next
      const dt = Math.max(1, Date.now() - startTime);
      const vh = window.innerHeight;

      // threshold to ignore tiny micro-movements; this keeps snaps predictable
      const threshold = Math.min(0.08 * vh, 48);

      // Determine single-step direction only — prevents multi-skip
      let direction = 0;
      if (dy > threshold) direction = 1;
      else if (dy < -threshold) direction = -1;
      else direction = 0;

      const startPhysical = Math.round(startScroll / vh);
      let targetPhysical = startPhysical + direction;

      // clamp to allowed range of physical indexes (0 .. loopedProducts.length-1)
      targetPhysical = Math.max(0, Math.min(targetPhysical, loopedProducts.length - 1));

      const targetTop = targetPhysical * vh;

      // Smooth snap to the computed single-target position
      el.scrollTo({ top: targetTop, behavior: 'smooth' });

      // After smooth scroll finishes (visually), normalize to middle segment if needed
      normalizeToMiddleIfNeeded(targetPhysical, targetTop);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [segmentSize, loopedProducts.length]);

  // share / copy handler
  const handleShare = async (product) => {
    try {
      const url = (product.url || window.location.href) + `#product-${product.id}`;
      if (navigator.share) await navigator.share({ title: product.name || product.title || '', text: product.description || '', url });
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setToast('Link copied to clipboard!');
        setTimeout(() => setToast(''), 1800);
      }
    } catch (err) {
      console.error('share failed', err);
    }
  };

  // simple rendered UI — restored original layout intent:
  // - image uses object-contain with h-[80vh] so bottom action row is always visible
  // - right rail sits above that bottom actions using an explicit offset
  const ACTION_ROW_H = 96; // px — adjust if you change bottom actions

  if (segmentSize === 0) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">No products found.</div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* Scroll container: CSS snap + stop to prefer JS snapping for reliability */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {loopedProducts.map((product, i) => {
          const counts = seededCounts.get(product.id) || { likes: 0, reviews: 0 };
          return (
            <section key={i} className="relative h-screen w-full snap-start flex-shrink-0 overflow-hidden">
              {/* image takes 80vh so bottom area reserved for actions */}
              <img
                src={product.image || product.thumbnail}
                alt={product.name || product.title}
                onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/1200x1600/0B1220/FFFFFF?text=No+Image')}
                className="mx-auto block object-contain h-[80vh] max-h-full max-w-full"
              />

              {/* gradient for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

              {/* right-side action rail aligned above bottom actions */}
              <div className="absolute right-3 flex flex-col items-center gap-4 z-30" style={{ bottom: `${ACTION_ROW_H + 20}px` }}>
                <div className="flex flex-col items-center">
                  <button className="bg-white/10 p-3 rounded-full text-white" aria-label="like">
                    <Heart className="h-6 w-6" />
                  </button>
                  <span className="text-xs text-white mt-1">{(product.likes ?? counts.likes).toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-center">
                  <button className="bg-white/10 p-3 rounded-full text-white" aria-label="reviews">
                    <MessageCircle className="h-6 w-6" />
                  </button>
                  <span className="text-xs text-white mt-1">{(product.reviews ?? counts.reviews).toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-center">
                  <button className="bg-white/10 p-3 rounded-full text-white" aria-label="share" onClick={() => handleShare(product)}>
                    <Share2 className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* bottom action area — restored to be visible and tappable */}
              <div className="absolute left-4 right-4 bottom-4 z-20">
                <div className="text-white">
                  <h2 className="text-2xl font-semibold">{product.name}</h2>
                  <p className="text-sm text-gray-300 line-clamp-2 mt-1">{product.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <div className="text-amber-400 font-bold text-2xl">${(product.price ?? 0).toFixed(2)}</div>
                      <div className="text-xs text-gray-400">incl. taxes</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="bg-white text-black rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                        <ShoppingCart className="h-5 w-5" />
                        <span>Add</span>
                      </button>
                      <button className="bg-amber-500 text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                        <Plus className="h-5 w-5" />
                        <span>Buy</span>
                      </button>
                      <button className="bg-white/10 text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                        <Eye className="h-5 w-5" />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* toast */}
      {toast && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
