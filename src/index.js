const express = require('express');
const app     = express();

app.use(express.json());

// Mount order routes
const orderRoutes = require('./routes/orders');
app.use('/api/orders', orderRoutes);

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} does not exist`
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong on the server'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Food Delivery API running on http://localhost:${PORT}`);
  console.log(`Seed order available at GET /api/orders/ord-demo-001`);
});
