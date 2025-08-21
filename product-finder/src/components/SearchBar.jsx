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
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex justify-center gap-2">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Search products..."
            className="w-80 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          
          {/* Search Suggestions Dropdown */}
          {showSuggestions && suggestions && (
            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-2xl shadow-lg mt-1 z-10 max-h-96 overflow-y-auto">
              {/* Popular Search Terms */}
              <div className="p-3 border-b border-slate-700">
                <h4 className="text-sm font-semibold text-white mb-2">Popular Searches</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.popular_terms?.slice(0, 8).map((term, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(term)}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-full text-sm transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="p-3 border-b border-slate-700">
                <h4 className="text-sm font-semibold text-white mb-2">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.categories?.map((category, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(category)}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-full text-sm transition-colors"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Example Searches */}
              <div className="p-3">
                <h4 className="text-sm font-semibold text-white mb-2">Try These</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.examples?.map((example, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(example)}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-full text-sm transition-colors"
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
          className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 shadow-md"
        >
          Search
        </button>
      </form>
    </div>
  );
}
