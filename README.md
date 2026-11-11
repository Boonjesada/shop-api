# Shop API

A REST API for a small online shop, built with **Node.js, Express and MongoDB**.
It handles user accounts with JWT login, role-based access (customer vs. admin),
a product catalogue, and orders that deduct stock safely.

## Features

- **Authentication** – register and log in; passwords hashed with bcrypt; JWT bearer tokens
- **Role-based access** – customers manage their own profile and orders; admins manage products, users and order status
- **Product catalogue** – CRUD with validation, pagination and category filter
- **Orders with stock control** – stock is deducted only when enough is available; if any item fails, stock already deducted for earlier items is returned
- **Order snapshots** – each order stores the product name and price at purchase time, so later product edits or deletions don't change past orders
- **Consistent errors** – every error is JSON (`{ "message": "..." }`) with the matching HTTP status
- **Container-ready** – Dockerfile, docker-compose with MongoDB, and a `/health` endpoint

## Tech stack

Node.js 22 · Express 4 · MongoDB 7 / Mongoose · JSON Web Tokens · bcrypt · Docker

## Getting started

### Option A – Docker (recommended)

```bash
cp .env.example .env          # then set JWT_SECRET and SEED_ADMIN_PASSWORD
docker compose up -d --build
docker compose run --rm api npm run seed   # creates the admin account and sample products
curl http://localhost:3000/health
```

### Option B – Run locally

Requires Node.js 20+ and a MongoDB instance.

```bash
npm install
cp .env.example .env          # then fill in the values
npm run seed
npm run dev                   # auto-restarts on changes; use `npm start` without it
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign tokens (use 32+ random characters) |
| `PORT` | No | Port to listen on (default `3000`) |
| `JWT_EXPIRES_IN` | No | Token lifetime (default `1d`) |
| `CORS_ORIGIN` | No | Comma-separated front-end origins allowed to call the API |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | For seeding | First admin account created by `npm run seed` |

The app stops at startup with a clear message if a required variable is missing or MongoDB can't be reached.

## API

Base path: `/api/v1`. Send `Authorization: Bearer <token>` for protected routes.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a customer account |
| POST | `/auth/login` | Public | Get a JWT |
| GET | `/auth/me` | Logged in | Current user ID and role |
| GET | `/products` | Public | List products (`?page`, `?limit`, `?category`) |
| GET | `/products/:id` | Public | Product details |
| POST | `/products` | Admin | Create a product |
| PUT | `/products/:id` | Admin | Replace a product |
| DELETE | `/products/:id` | Admin | Delete a product |
| POST | `/orders` | Logged in | Place an order |
| GET | `/orders` | Logged in | Own orders (admins see all) |
| GET | `/orders/:id` | Owner / Admin | Order details |
| PATCH | `/orders/:id/status` | Admin | Set status: `New`, `Preparing`, `Completed` |
| GET | `/users` | Admin | List users |
| POST | `/users` | Admin | Create a customer account |
| GET | `/users/:id` | Self / Admin | User details |
| PUT | `/users/:id` | Self / Admin | Update profile (changing your own password requires `currentPassword`) |
| DELETE | `/users/:id` | Admin | Delete a customer account |
| GET | `/health` | Public | Service and database status (outside `/api/v1`) |

### Example: place an order

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<your password>"}' | jq -r .token)

curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"code":"SH-001","quantity":1},{"code":"LH-001","quantity":2}]}'
```

`201 Created` (abbreviated)

```json
{
  "orderNumber": "ORD-6f1c...",
  "items": [
    { "code": "SH-001", "name": "Siamese", "quantity": 1, "unitPrice": 3500, "lineTotal": 3500 },
    { "code": "LH-001", "name": "Persian", "quantity": 2, "unitPrice": 5500, "lineTotal": 11000 }
  ],
  "totalPrice": 14500,
  "status": "New"
}
```

If a product is missing or out of stock, the API returns `400` and no stock is deducted:

```json
{ "message": "Product LH-001 was not found or has insufficient stock." }
```

## Design notes

- **Stock deduction** uses a conditional atomic update (`stock >= quantity` and `$inc` in a single operation), so two customers can't buy the last unit at the same time.
- **Known limitation:** an order with several items deducts stock item by item and returns it if a later item fails. If the server crashed in the middle, stock could be left deducted. The fix is a MongoDB multi-document transaction, which requires running MongoDB as a replica set; this is on the roadmap.

## Project structure

```
bin/www            Starts the server after connecting to MongoDB
app.js             Express app, routes and JSON error handling
config.js          Reads and checks environment variables
routes/            auth, users, products, orders
middleware/        JWT authentication and admin check
models/            Mongoose schemas
validators/        Shared input validation
scripts/seed.js    Creates the first admin and sample products
```

## Roadmap

- [ ] OpenAPI specification and Swagger UI
- [ ] Automated tests (Jest + Supertest)
- [ ] Multi-document transactions for orders
- [ ] Postman collection
