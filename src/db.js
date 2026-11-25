// In-memory "database" — simulates a data store
const { v4: uuidv4 } = require('uuid');

const orders = {};

// Seed one order so GET /orders/:id works immediately
const seedId = 'ord-demo-001';
orders[seedId] = {
  id: seedId,
  customerId: 'cust-42',
  restaurantId: 'rest-07',
  items: [
    { name: 'Margherita Pizza', quantity: 1, price: 12.99 },
    { name: 'Garlic Bread',     quantity: 2, price: 3.49 }
  ],
  deliveryAddress: '123 Main St, Springfield',
  status: 'preparing',
  eta: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

module.exports = { orders, uuidv4 };
