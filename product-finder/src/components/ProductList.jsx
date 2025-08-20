import ProductCard from "./ProductCard";
import { ShoppingBag } from "lucide-react";

export default function ProductList({ products }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <ShoppingBag className="mx-auto h-12 w-12 mb-3 text-gray-500" />
        <p className="text-lg font-medium text-gray-100">No products found</p>
        <p className="text-sm">Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-4">
      {/* Masonry-like responsive grid with modern spacing */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr">
        {products.map((p, i) => (
          <ProductCard key={i} product={p} />
        ))}
      </div>

      {/* Subtle gradient divider */}
      <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
    </div>
  );
}
