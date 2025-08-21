import { useState, useEffect } from "react";
import SearchBar from "./components/SearchBar";
import ProductList from "./components/ProductList";
import ProductScroll from "./components/ProductScroll";

export default function App() {
  const [products, setProducts] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTips, setSearchTips] = useState([]);
  const [isFullscreenScroll, setIsFullscreenScroll] = useState(false);

  const tips = [
    "Try searching by category (e.g., 'electronics', 'clothing')",
    "Search by product type (e.g., 'shirt', 'jacket', 'monitor')",
    "Use specific terms like 'backpack', 'bracelet', or 'hard drive')",
    "The search looks in titles, descriptions, and categories"
  ];

  useEffect(() => {
    if (query) {
      setLoading(true);
      setError("");
      // This is the line that has been corrected
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setProducts(data);
          if (data.length === 0) {
            setError(`No products found for "${query}". Try a different search term.`);
            setSearchTips(tips);
          } else {
            setSearchTips([]);
          }
        })
        .catch((err) => {
          console.error("Search error:", err);
          setError("Unable to search products. Please check if the backend is running.");
          setProducts([]);
          setSearchTips(tips);
        })
        .finally(() => setLoading(false));
    } else {
      setProducts([]);
      setError("");
      setSearchTips([]);
      setLoading(false);
    }
  }, [query]);

  // Allow exiting fullscreen scroll with Escape key
  useEffect(() => {
    if (!isFullscreenScroll) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsFullscreenScroll(false);
        document.body.style.overflow = "";
        setViewMode("list");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreenScroll]);

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100">
      {/* Header */}
      <header className={`sticky top-0 z-10 border-b border-slate-700 bg-slate-900/80 backdrop-blur py-6 ${isFullscreenScroll ? "hidden" : "mb-6"}`}>
        <h1 className="text-3xl md:text-4xl font-semibold text-center text-white tracking-tight">
          🛍️ Product Finder
        </h1>
        <p className="text-center text-gray-400 mt-2">
          Find the best products across stores in one place
        </p>
      </header>

      <main className={`max-w-6xl mx-auto px-4 ${isFullscreenScroll ? "hidden" : "block"}`}>
        <SearchBar onSearch={setQuery} />

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div>
            <p className="mt-4 text-gray-300 text-lg">Searching products...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-6 py-4 rounded-2xl mb-6 text-center shadow-lg">
            <span className="font-semibold">⚠️ {error}</span>
          </div>
        )}

        {searchTips.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 text-gray-100 px-6 py-5 rounded-2xl mb-6 shadow-lg">
            <h3 className="text-white font-semibold mb-3">💡 Search Tips:</h3>
            <ul className="text-sm space-y-2 list-disc list-inside marker:text-gray-500">
              {searchTips.map((tip, index) => (
                <li key={index} className="text-gray-400">{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="mb-6 text-center text-gray-400">
            Found{" "}
            <span className="font-semibold text-white">{products.length}</span>{" "}
            product{products.length !== 1 ? "s" : ""} for{" "}
            <span className="font-semibold text-amber-400">"{query}"</span>
          </div>
        )}

        {/* Toggle buttons */}
        <div className="flex justify-center gap-4 my-6">
          <button
            className={`px-5 py-2 rounded-full text-sm font-medium shadow-md transition-colors ${
              viewMode === "list"
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-slate-700 hover:bg-slate-600 text-gray-200"
            }`}
            onClick={() => setViewMode("list")}
          >
            List View
          </button>
          <button
            className={`px-5 py-2 rounded-full text-sm font-medium shadow-md transition-colors ${
              viewMode === "scroll"
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-slate-700 hover:bg-slate-600 text-gray-200"
            }`}
            onClick={() => {
              setViewMode("scroll");
              setIsFullscreenScroll(true);
              // lock body scroll
              document.body.style.overflow = "hidden";
            }}
          >
            Scroll View
          </button>
        </div>

        {viewMode === "list" ? (
          <ProductList products={products} />
        ) : null}

        {/* Welcome section */}
        {!query && !loading && !error && products.length === 0 && (
          <div className="text-center py-16">
            <div className="text-7xl mb-6">🔍</div>
            <h2 className="text-3xl font-semibold text-white mb-4">Welcome to Product Finder!</h2>
            <p className="text-lg text-gray-300 mb-8">
              Start searching for products above to discover amazing items.
            </p>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-2xl mx-auto shadow-lg hover:shadow-amber-500/20">
              <h3 className="font-semibold text-white mb-4">What you can search for:</h3>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-amber-400 mb-2">Categories</h4>
                  <p className="text-gray-400">electronics, clothing, jewelry</p>
                </div>
                <div>
                  <h4 className="font-medium text-amber-400 mb-2">Product Types</h4>
                  <p className="text-gray-400">shirt, jacket, monitor, bracelet</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fullscreen Scroll Overlay */}
      {isFullscreenScroll && (
        <div className="fixed inset-0 z-40">
          <ProductScroll products={products} />
          <button
            className="absolute top-4 right-4 z-50 px-4 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-gray-200 text-sm shadow-md"
            onClick={() => {
              setIsFullscreenScroll(false);
              // unlock body scroll
              document.body.style.overflow = "";
              setViewMode("list");
            }}
          >
            Exit
          </button>
        </div>
      )}
    </div>
  );
}