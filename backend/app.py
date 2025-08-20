from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def calculate_search_score(product, query, query_terms):
    """Calculate relevance score for search results"""
    score = 0
    title = product.get("title", "").lower()
    description = product.get("description", "").lower()
    category = product.get("category", "").lower()
    
    # Exact matches get highest scores
    if query.lower() in title:
        score += 100
    if query.lower() in description:
        score += 50
    if query.lower() in category:
        score += 75
    
    # Partial word matches
    for term in query_terms:
        if term in title:
            score += 30
        if term in description:
            score += 15
        if term in category:
            score += 25
    
    # Category relevance bonus
    if any(term in category for term in query_terms):
        score += 20
    
    return score

@app.route("/search")
def search():
    try:
        query = request.args.get("q", "").strip()
        
        if not query:
            return jsonify([])
        
        # Use Fake Store API (doesn't support search, so we'll filter locally)
        response = requests.get("https://fakestoreapi.com/products")
        data = response.json()
        
        # Split query into terms for better matching
        query_terms = re.findall(r'\b\w+\b', query.lower())
        
        # Enhanced search across multiple fields
        results = []
        for product in data:
            title = product.get("title", "").lower()
            description = product.get("description", "").lower()
            category = product.get("category", "").lower()
            
            # Check if query matches any field
            if (query.lower() in title or 
                query.lower() in description or 
                query.lower() in category or
                any(term in title for term in query_terms) or
                any(term in description for term in query_terms) or
                any(term in category for term in query_terms)):
                
                # Calculate relevance score
                score = calculate_search_score(product, query, query_terms)
                product_with_score = product.copy()
                product_with_score["_search_score"] = score
                results.append(product_with_score)
        
        # Sort by relevance score (highest first)
        results.sort(key=lambda x: x.get("_search_score", 0), reverse=True)
        
        # Remove the score from the response (it was just for sorting)
        for product in results:
            product.pop("_search_score", None)
        
        return jsonify(results)
        
    except requests.RequestException as e:
        print(f"Error fetching from Fake Store API: {e}")
        return jsonify({"error": "Failed to fetch products from external API"}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/search-suggestions")
def search_suggestions():
    """Get search suggestions based on available products"""
    try:
        response = requests.get("https://fakestoreapi.com/products")
        data = response.json()
        
        # Extract unique categories and common words from titles
        categories = list(set(product.get("category", "") for product in data))
        title_words = []
        for product in data:
            title = product.get("title", "")
            words = re.findall(r'\b\w+\b', title.lower())
            title_words.extend(words)
        
        # Get most common words (excluding very common words)
        common_words = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"]
        word_counts = {}
        for word in title_words:
            if word not in common_words and len(word) > 2:
                word_counts[word] = word_counts.get(word, 0) + 1
        
        # Get top 10 most common words
        top_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        suggestions = {
            "categories": categories,
            "popular_terms": [word for word, count in top_words],
            "examples": [
                "shirt", "jacket", "phone", "laptop", "watch", "shoes", "bag", "jewelry"
            ]
        }
        
        return jsonify(suggestions)
        
    except requests.RequestException as e:
        print(f"Error fetching from Fake Store API: {e}")
        return jsonify({"error": "Failed to fetch suggestions"}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/products")
def get_all_products():
    """Get all products from Fake Store API"""
    try:
        response = requests.get("https://fakestoreapi.com/products")
        data = response.json()
        return jsonify(data)
    except requests.RequestException as e:
        print(f"Error fetching from Fake Store API: {e}")
        return jsonify({"error": "Failed to fetch products from external API"}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/health")
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Backend is running with Fake Store API integration"})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
