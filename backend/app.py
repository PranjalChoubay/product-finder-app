from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route("/api/search")
def search():
    try:
        query = request.args.get("q", "").strip()
        
        if not query:
            return jsonify([])
        
        # Use DummyJSON's built-in search endpoint (more efficient)
        response = requests.get(f"https://dummyjson.com/products/search?q={query}")
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        
        # The search results are inside the "products" key
        data = response.json()
        products = data.get("products", [])
        
        return jsonify(products)
        
    except requests.RequestException as e:
        print(f"Error fetching from DummyJSON API: {e}")
        return jsonify({"error": "Failed to fetch products from external API"}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/search-suggestions")
def search_suggestions():
    """Get search suggestions from DummyJSON's categories."""
    try:
        # Fetch all available categories from DummyJSON
        response = requests.get("https://dummyjson.com/products/categories")
        response.raise_for_status()
        
        categories = response.json()
        
        suggestions = {
            "categories": categories,
            "popular_terms": ["phone", "laptop", "skin care", "groceries", "shoes"],
            "examples": ["iPhone 9", "perfume", "watch", "motorcycle", "sunglasses"] # This line was added back
        }
        
        return jsonify(suggestions)
        
    except requests.RequestException as e:
        print(f"Error fetching from DummyJSON API: {e}")
        return jsonify({"error": "Failed to fetch suggestions"}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/products")
def get_all_products():
    """Get all products from DummyJSON API"""
    try:
        response = requests.get("https://dummyjson.com/products")
        response.raise_for_status()
        
        data = response.json()
        products = data.get("products", [])
        
        return jsonify(products)
    except requests.RequestException as e:
        print(f"Error fetching from DummyJSON API: {e}")
        return jsonify({"error": "Failed to fetch products from external API"}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/health")
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Backend is running with DummyJSON API integration"})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)