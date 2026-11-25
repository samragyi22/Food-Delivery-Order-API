const express = require('express');
const router  = express.Router();
const { orders, uuidv4 } = require('../db');

// ─────────────────────────────────────────────────────────────
// VALID TRANSITIONS  (what statuses can follow which status)
// ─────────────────────────────────────────────────────────────
const VALID_STATUSES   = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
const VALID_TRANSITIONS = {
  pending:          ['confirmed', 'cancelled'],
  confirmed:        ['preparing', 'cancelled'],
  preparing:        ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered:        [],
  cancelled:        []
};

// ─────────────────────────────────────────────────────────────
// HELPER — small ETA calculator (minutes → ISO timestamp)
// ─────────────────────────────────────────────────────────────
function calcEta(status) {
  const minutesMap = {
    pending:          45,
    confirmed:        40,
    preparing:        30,
    out_for_delivery: 15,
    delivered:        0,
    cancelled:        null
  };
  const mins = minutesMap[status];
  if (mins === null) return null;
  return new Date(Date.now() + mins * 60 * 1000).toISOString();
}

// ─────────────────────────────────────────────────────────────
// ENDPOINT 1  POST /api/orders
// Create a new food delivery order
// ─────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { customerId, restaurantId, items, deliveryAddress } = req.body;

  // Validation
  const errors = [];
  if (!customerId)                              errors.push('customerId is required');
  if (!restaurantId)                            errors.push('restaurantId is required');
  if (!deliveryAddress || deliveryAddress.trim() === '') errors.push('deliveryAddress is required');
  if (!Array.isArray(items) || items.length === 0)       errors.push('items must be a non-empty array');
  else {
    items.forEach((item, i) => {
      if (!item.name)              errors.push(`items[${i}].name is required`);
      if (!item.quantity || item.quantity < 1) errors.push(`items[${i}].quantity must be >= 1`);
      if (!item.price  || item.price  <= 0)   errors.push(`items[${i}].price must be > 0`);
    });
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body has validation errors',
        details: errors
      }
    });
  }

  const id = `ord-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  const order = {
    id,
    customerId,
    restaurantId,
    items,
    deliveryAddress,
    status: 'pending',
    eta: calcEta('pending'),
    createdAt: now,
    updatedAt: now
  };
  orders[id] = order;

  return res.status(201).json({ success: true, data: order });
});

// ─────────────────────────────────────────────────────────────
// ENDPOINT 2  GET /api/orders/:id
// Get full order details + current status
// ─────────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const order = orders[req.params.id];
  if (!order) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ORDER_NOT_FOUND',
        message: `No order found with id '${req.params.id}'`
      }
    });
  }
  return res.status(200).json({ success: true, data: order });
});

// ─────────────────────────────────────────────────────────────
// ENDPOINT 3  PATCH /api/orders/:id/status
// Update the delivery status (restaurant / driver dashboard)
// ─────────────────────────────────────────────────────────────
router.patch('/:id/status', (req, res) => {
  const order = orders[req.params.id];
  if (!order) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ORDER_NOT_FOUND',
        message: `No order found with id '${req.params.id}'`
      }
    });
  }

  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "'status' field is required",
        allowedValues: VALID_STATUSES
      }
    });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: `'${status}' is not a valid status`,
        allowedValues: VALID_STATUSES
      }
    });
  }

  if (!VALID_TRANSITIONS[order.status].includes(status)) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'INVALID_TRANSITION',
        message: `Cannot transition from '${order.status}' to '${status}'`,
        allowedNextStatuses: VALID_TRANSITIONS[order.status]
      }
    });
  }

  order.status    = status;
  order.eta       = calcEta(status);
  order.updatedAt = new Date().toISOString();

  return res.status(200).json({ success: true, data: order });
});

// ─────────────────────────────────────────────────────────────
// ENDPOINT 4  GET /api/orders/:id/eta
// Lightweight ETA-only endpoint (for real-time dashboard polls)
// ─────────────────────────────────────────────────────────────
router.get('/:id/eta', (req, res) => {
  const order = orders[req.params.id];
  if (!order) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ORDER_NOT_FOUND',
        message: `No order found with id '${req.params.id}'`
      }
    });
  }

  if (order.status === 'cancelled') {
    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        status: 'cancelled',
        eta: null,
        message: 'Order was cancelled; no ETA available'
      }
    });
  }

  if (order.status === 'delivered') {
    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        status: 'delivered',
        eta: null,
        message: 'Order has already been delivered'
      }
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      orderId:         order.id,
      status:          order.status,
      estimatedDelivery: order.eta,
      minutesRemaining: Math.max(0, Math.round((new Date(order.eta) - Date.now()) / 60000))
    }
  });
});

module.exports = router;
