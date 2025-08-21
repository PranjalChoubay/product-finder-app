import { useEffect, useMemo, useRef, useState } from "react";
import { ShoppingCart, Plus, Eye, Heart, MessageCircle, X, Share2 } from "lucide-react";
import { usePremiumScroll } from "./usePremiumScroll";

// Individual Product component remains largely the same, but now gets its position via props
const ProductItem = ({ product, isVisible, position, interactionProps }) => {
  const [likedIds, setLikedIds] = useState(new Set()); // Simplified like state for example
  const { likes = 0, reviews = 0 } = product.seededCounts || {};

  return (
    <div
      className="absolute top-0 left-0 h-full w-full flex items-center justify-center bg-black"
      style={{ transform: `translateY(${position}px)` }}
      {...interactionProps}
    >
      <img src={product.thumbnail} alt={product.title} className="object-contain max-h-full max-w-full h-[80vh]" />
      <div className="absolute inset-x-0 bottom-0 z-10">
        {/* All other UI elements like title, price, buttons go here */}
        <div className="text-white px-4 pb-8 md:px-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-snug line-clamp-2">{product.title}</h2>
            <p className="text-amber-400 font-bold text-3xl mt-4">${product.price?.toFixed(2) || "N/A"}</p>
        </div>
      </div>
    </div>
  );
};

export default function ProductScroll({ products }) {
  // Memoize products with seeded counts to prevent recalculation
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

  const { containerRef, activeIndex, wrapperProps } = usePremiumScroll(productsWithData);

  // Determine which products to render (virtualization window)
  const renderedProducts = useMemo(() => {
    const items = [];
    const vh = window.innerHeight;
    for (let i = activeIndex - 1; i <= activeIndex + 1; i++) {
      if (i >= 0 && i < productsWithData.length) {
        items.push({
          product: productsWithData[i],
          position: i * vh,
          isVisible: i === activeIndex,
        });
      }
    }
    return items;
  }, [activeIndex, productsWithData]);

  if (products.length === 0) {
    return <div className="flex items-center justify-center h-screen text-gray-400">No products found.</div>;
  }

  return (
    // The container now hides overflow, as we are not using native scroll
    <div
      ref={containerRef}
      className="relative h-screen w-full bg-black overflow-hidden"
    >
      {/* This wrapper is the element that moves up and down via transform */}
      <div
        className="relative h-full w-full"
        {...wrapperProps}
      >
        {renderedProducts.map(({ product, position, isVisible }) => (
          <ProductItem
            key={product.id}
            product={product}
            position={position}
            isVisible={isVisible}
          />
        ))}
      </div>
    </div>
  );
}