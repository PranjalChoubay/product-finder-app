# Product Finder Backend

A Flask-based backend API for the Product Finder application that integrates with the Fake Store API.

## Setup

1. **Create Virtual Environment** (if not already created):
   ```bash
   python -m venv venv
   ```

2. **Activate Virtual Environment**:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Backend

1. **Start the server**:
   ```bash
   python app.py
   ```

2. **The API will be available at**: `http://localhost:5000`

## API Endpoints

- `GET /search?q=<query>` - Search products by query using Fake Store API
- `GET /products` - Get all products from Fake Store API
- `GET /health` - Health check endpoint

## Features

- **Fake Store API Integration**: Real product data from https://fakestoreapi.com/products
- **CORS enabled** for frontend integration
- **Search functionality** with local filtering of products
- **Error handling** for API failures and network issues
- **Proper HTTP status codes** and error responses

## Data Source

The backend fetches product data from the Fake Store API, which provides:
- Real product information (titles, prices, images, categories)
- 20+ different products across various categories
- High-quality product images and descriptions

## Search Logic

- Searches are performed locally after fetching all products
- Products are filtered by title containing the search query
- Case-insensitive search for better user experience
