// backend/index.js
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors()); // Allow cross-origin requests

// Example API endpoint
app.get('/api/products', (req, res) => {
  res.json({ products: ['item1', 'item2'] });
});

module.exports = app; // Export the app, don't use app.listen()