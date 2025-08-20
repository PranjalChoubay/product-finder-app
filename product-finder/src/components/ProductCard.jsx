import { useState, useMemo, useEffect } from "react";
import { Heart, ShoppingCart, Plus } from "lucide-react";

export default function ProductCard({ product }) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Derive a stable hue from product title/id for subtle, varied gradients
  const hue = useMemo(() => {
    const str = String(product?.title ?? product?.id ?? "");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const value = Math.abs(hash % 360);
    return value;
  }, [product?.title, product?.id]);

  const gradientStyle = useMemo(() => {
    const hue2 = (hue + 50) % 360;
    return {
      background:
        `radial-gradient(120% 90% at 0% 0%, hsla(${hue}, 80%, 55%, 0.18) 0%, transparent 50%),` +
        `radial-gradient(120% 90% at 100% 100%, hsla(${hue2}, 80%, 55%, 0.18) 0%, transparent 50%)`,
    };
  }, [hue]);

  const handleImageError = (e) => {
    e.target.src =
      "https://via.placeholder.com/600x750/1f2937/FFFFFF?text=No+Image";
  };

  // Like state persisted to localStorage
  const [isLiked, setIsLiked] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("likedProducts");
      const arr = raw ? JSON.parse(raw) : [];
      setIsLiked(arr.includes(product?.id));
    } catch {}
  }, [product?.id]);

  const toggleLike = () => {
    try {
      const raw = localStorage.getItem("likedProducts");
      const arr = raw ? JSON.parse(raw) : [];
      let next;
      if (arr.includes(product?.id)) {
        next = arr.filter((id) => id !== product?.id);
        setIsLiked(false);
      } else {
        next = [...arr, product?.id];
        setIsLiked(true);
      }
      localStorage.setItem("likedProducts", JSON.stringify(next));
    } catch {}
  };

  return (
    <div className="group relative">
      {/* Card */}
      <div className="relative rounded-2xl bg-slate-800 border border-slate-700 shadow-lg hover:shadow-amber-500/20 transition-all duration-300 overflow-hidden">
        {/* Subtle per-card gradient background */}
        <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity" style={gradientStyle} />
        {/* Image */}
        <div className="relative aspect-[4/5] bg-slate-900 flex items-center justify-center">
          {/* Shimmer while loading */}
          {!isImageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-slate-800" />
          )}
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            onLoad={() => setIsImageLoaded(true)}
            onError={handleImageError}
            className="h-full w-auto max-h-full object-contain drop-shadow-2xl transition-transform duration-500 ease-out group-hover:scale-105"
          />

          {/* Floating action icons */}
          <button
            type="button"
            aria-label="Like product"
            aria-pressed={isLiked}
            onClick={toggleLike}
            className={`absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors ${
              isLiked ? "bg-amber-500 text-white" : "bg-slate-700 hover:bg-slate-600 text-gray-200"
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "" : ""}`} />
          </button>
          <div className="absolute left-3 top-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="inline-flex h-8 items-center rounded-full bg-slate-700 px-2 text-xs font-medium text-gray-200 shadow">Featured</span>
            <span className="inline-flex h-8 items-center rounded-full bg-amber-500 px-2 text-xs font-medium text-white shadow">New</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h2 className="text-gray-100 font-semibold text-base leading-snug line-clamp-2 min-h-[2.5rem]">
            {product.title}
          </h2>

          {/* Meta */}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-amber-400 font-bold text-lg">${product.price?.toFixed(2) || "N/A"}</p>
            {product.category && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-700 text-gray-200 capitalize border border-slate-600">
                {product.category}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium shadow-md">
              <ShoppingCart className="h-4 w-4" />
              Buy Now
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-gray-200 text-sm font-medium">
              <Plus className="h-4 w-4" />
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
