import { useState, useEffect } from "react";

export default function SearchBar({ onSearch }) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch search suggestions when component mounts
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/search-suggestions`)
      .then((res) => res.json())
      .then((data) => setSuggestions(data))
      .catch((err) => console.error("Failed to fetch suggestions:", err));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (term) => {
    setInput(term);
    onSearch(term);
    setShowSuggestions(false);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className="relative w-full px-2">
      <form onSubmit={handleSubmit} className="flex justify-center gap-2 w-full">
        <div className="relative flex-1 max-w-full sm:max-w-xl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Search products..."
            className="w-full rounded-full border border-gray-300 bg-white/80 backdrop-blur px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-amber-400 shadow-sm transition"
          />

          {/* Search Suggestions Dropdown */}
          {showSuggestions && suggestions && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl mt-2 z-10 max-h-72 sm:max-h-96 overflow-y-auto text-sm sm:text-base">
              {/* Popular Search Terms */}
              <div className="p-3 border-b border-gray-200">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Popular Searches</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.popular_terms?.slice(0, 8).map((term, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(term)}
                      className="px-2.5 sm:px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs sm:text-sm transition-colors shadow-sm"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="p-3 border-b border-gray-200">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.categories?.map((category, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(category)}
                      className="px-2.5 sm:px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs sm:text-sm transition-colors shadow-sm"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Example Searches */}
              <div className="p-3">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Try These</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.examples?.map((example, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(example)}
                      className="px-2.5 sm:px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs sm:text-sm transition-colors shadow-sm"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 shadow-lg font-semibold text-sm sm:text-base transition-transform active:scale-95"
        >
          Search
        </button>
      </form>
    </div>
  );
}
