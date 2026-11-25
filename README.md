# 🍕 Food Delivery Order API

A RESTful API for the **Food Delivery Dashboard** — provides real-time order status and delivery ETA updates.

## Quick Start

```bash
npm install
npm start
```

## Endpoints

| # | Method | Path | Description | Status Code |
|---|--------|------|-------------|-------------|
| 1 | `POST` | `/api/orders` | Place a new order | 201 |
| 2 | `GET` | `/api/orders/:id` | Get order details & status | 200 |
| 3 | `PATCH` | `/api/orders/:id/status` | Update delivery status | 200 |
| 4 | `GET` | `/api/orders/:id/eta` | Get ETA for dashboard polling | 200 |

## Order Status Flow

```
pending → confirmed → preparing → out_for_delivery → delivered
   └────────────────────────────────────┘
                 cancelled (from any active state)
```

## 1. Create Order — `POST /api/orders`

**Request**
```json
{
  "customerId":    "cust-99",
  "restaurantId":  "rest-12",
  "items": [
    { "name": "Chicken Burger", "quantity": 2, "price": 8.99 }
  ],
  "deliveryAddress": "456 Elm Street, Shelbyville"
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "id": "ord-63c8ee60",
    "status": "pending",
    "eta": "2026-11-25T09:35:06.173Z",
    "createdAt": "2026-11-25T08:50:06.173Z"
  }
}
```

## 2. Get Order — `GET /api/orders/:id`

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "ord-demo-001",
    "customerId": "cust-42",
    "restaurantId": "rest-07",
    "status": "preparing",
    "eta": "2026-11-25T09:14:29.030Z"
  }
}
```

## 3. Update Status — `PATCH /api/orders/:id/status`

**Request**
```json
{ "status": "out_for_delivery" }
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": { "status": "out_for_delivery", "eta": "2026-11-25T09:05:22.794Z" }
}
```

**Error `422 Unprocessable Entity`** (invalid transition)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot transition from 'preparing' to 'confirmed'",
    "allowedNextStatuses": ["out_for_delivery", "cancelled"]
  }
}
```

## 4. Get ETA — `GET /api/orders/:id/eta`

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "orderId": "ord-demo-001",
    "status": "out_for_delivery",
    "estimatedDelivery": "2026-11-25T09:05:22.794Z",
    "minutesRemaining": 15
  }
}
```

## Error Responses

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Missing / invalid request fields |
| `ORDER_NOT_FOUND` | 404 | No order with that ID |
| `INVALID_STATUS` | 400 | Unknown status value |
| `INVALID_TRANSITION` | 422 | Status change not allowed |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

## Seed Data

A demo order is pre-loaded for testing:

```
GET http://localhost:3000/api/orders/ord-demo-001
```
