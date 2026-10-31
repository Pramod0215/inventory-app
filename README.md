# Inventory Commerce App

A full-stack storefront and inventory management app for construction and hardware products. The React frontend uses an Express API, MongoDB for persistent catalog/orders/users, and Kafka for commerce events.

## Features

- Browse products by construction and hardware category.
- Stock-aware cart and checkout with UPI or cash payment selection.
- Customer registration/login, JWT-protected orders, and printable order invoices.
- Admin dashboard and product create/update/soft-delete workflows.
- Customer feedback submissions saved to MongoDB.
- Authenticated AI customer support chat powered by Hugging Face Inference Providers.
- English, Hindi, and Bengali interface translations with persistent light and dark themes.
- Validated API requests and database model constraints.
- Optional Kafka events for product changes and placed orders.
- Docker Compose, Kubernetes/Kustomize manifests, and GitHub Actions CI.

## Technology

- Frontend: React 19, Vite, Vitest, Testing Library
- Backend: Node.js, Express 4, Mongoose, JWT, KafkaJS
- Data services: MongoDB 7, Apache Kafka 3.9
- Containers: Docker Compose, Kubernetes, Kustomize

## Requirements

- Node.js 20 or newer and npm
- MongoDB 7 (for local development), or Docker Desktop with Compose
- Kafka is optional for local development; it is enabled in the Compose setup

## Local development

Install dependencies from the repository root and both app folders:

```powershell
npm install
npm ci --prefix backend
npm ci --prefix clientapp
```

Create the backend environment file:

```powershell
Copy-Item backend/.env.example backend/.env
```

Set `MONGODB_URI` and a unique `JWT_SECRET` in `backend/.env`. Kafka is disabled by default for local development (`KAFKA_ENABLED=false`). To use Kafka locally, set it to `true` and configure `KAFKA_BROKERS`.
To enable AI support, set `HF_TOKEN` to a Hugging Face token with Inference Providers access. `HF_MODEL` optionally selects the chat model; it defaults to `Qwen/Qwen2.5-7B-Instruct`. The token stays on the backend and is never sent to the browser. Without a token, the support API returns a clear configuration error; the feedback form remains available.

With MongoDB running, seed the catalog and start the frontend/API:

```powershell
npm --prefix backend run seed
npm run dev
```

The storefront is at `http://localhost:3000`; the API listens on `http://localhost:5000`. You can also start the API and frontend separately with `npm --prefix backend run dev` and `npm --prefix clientapp run dev`.

To enable admin product management, set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `backend/.env`, then run:

```powershell
npm --prefix backend run create-admin
```

Public registration always creates a customer account; administrator access is provisioned separately.

## Validation

Client forms check required fields, email format, password length/confirmation, product text lengths, stock quantity, price precision, rating range, image URL format, and order stock limits before submission. The API repeats validation and is authoritative: it rejects malformed JSON, unknown fields, invalid IDs, unsupported categories/payment methods, invalid numeric ranges, and malformed order items. Mongoose schemas apply matching constraints at persistence time.

Authentication requires a valid email and an 8-character minimum password (up to 72 UTF-8 bytes). Product prices allow up to two decimal places; product quantity must be a whole number. Product image values must be an HTTP(S) URL or a root-relative path.

## Docker Compose

Set `JWT_SECRET` in the shell or a root `.env` file before using Compose; the Compose fallback is for development only. Set `HF_TOKEN` in the shell or root `.env` to enable the AI chat in Compose.

```powershell
npm run docker:up
```

Compose starts MongoDB and Kafka, seeds the sample catalog, then starts the API and Nginx-served frontend. The frontend is available at `http://localhost:3000`, the API at `http://localhost:5000`, and Kafka at `localhost:9094`. Stop the services with `npm run docker:down`.

## Tests and coverage

Run both test suites, or run one app at a time:

```powershell
npm test
npm run test:coverage
npm --prefix backend test
npm --prefix clientapp test
```

Tests are under `backend/tests/unit/` and `clientapp/tests/unit/`. Coverage reports (text, HTML, and LCOV) are generated under `backend/coverage/` and `clientapp/coverage/`.

## CI and container publishing

The GitHub Actions workflow runs on pull requests, pushes to `main`/`master`, and version tags. It installs dependencies, checks backend JavaScript syntax, runs coverage-enabled tests, enforces at least 60 executed test cases, builds the frontend, and validates Compose configuration. Successful pushes publish backend and frontend images to GHCR using `GITHUB_TOKEN`; enable GitHub Actions and package write access for the repository.

## Kubernetes

The `k8s/` Kustomize configuration deploys the frontend, backend, single-node MongoDB and Kafka, persistent database storage, and catalog/admin jobs. A cluster with a default StorageClass and LoadBalancer support is required. The provided MongoDB/Kafka configuration is for development and small deployments, not high availability.

Create the namespace and secrets before applying the manifests. Use a unique JWT secret and strong administrator credentials:

```powershell
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic inventory-app-secrets -n inventory-app `
  --from-literal=MONGODB_URI=mongodb://mongodb:27017/inventory_app `
  --from-literal=JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET `
  --from-literal=HF_TOKEN=REPLACE_WITH_A_HUGGING_FACE_TOKEN `
  --from-literal=ADMIN_NAME="Store Admin" `
  --from-literal=ADMIN_EMAIL=admin@example.com `
  --from-literal=ADMIN_PASSWORD=REPLACE_WITH_A_STRONG_PASSWORD
kubectl apply -k k8s
kubectl wait --for=condition=complete job/catalog-seed -n inventory-app --timeout=180s
kubectl wait --for=condition=complete job/create-admin -n inventory-app --timeout=180s
kubectl get services -n inventory-app
```

The frontend service exposes the app; its Nginx proxy forwards `/api/` requests to the backend. The manifests use `latest` GHCR tags published from the default branch. For private GHCR packages, configure an image-pull secret on the namespace's default service account.

## API overview

Base path: `/api/v1`

| Method | Path | Purpose | Access |
|---|---|---|---|
| `POST` | `/auth/signup` | Create a customer account | Public |
| `POST` | `/auth/login` | Sign in | Public |
| `GET` | `/products?category=construction\|hardware` | List active products | Public |
| `POST` | `/products` | Create a product | Admin |
| `PUT` | `/products/:id` | Update a product | Admin |
| `DELETE` | `/products/:id` | Soft-delete a product | Admin |
| `POST` | `/orders` | Place an order | Signed-in user |
| `GET` | `/orders` | List customer orders (admins can list all) | Signed-in user |
| `POST` | `/feedback` | Submit customer feedback | Signed-in user |
| `POST` | `/support/chat` | Send a message to AI customer support | Signed-in user |
| `GET` | `/api/health` | API and Kafka status | Public |

The separate `/api/v1/inventory` endpoints provide inventory item CRUD operations. Product/order changes publish events to the configured Kafka topic (`commerce.events` by default). For Kubernetes, add `HF_TOKEN` to the `inventory-app-secrets` Secret to enable chat.

## Project layout

```text
inventory-app/
├── .github/workflows/       # CI and GHCR publishing
├── backend/
│   ├── scripts/             # Catalog seed and admin provisioning
│   ├── src/
│   │   ├── config/          # MongoDB and Kafka
│   │   ├── controllers/     # API request handlers
│   │   ├── middleware/      # Authentication and error handling
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/
│   │   ├── services/        # Order workflow
│   │   └── utils/           # API helpers and validation
│   └── tests/unit/
├── clientapp/
│   ├── src/                 # React app, components, pages, styles
│   └── tests/unit/
├── k8s/                     # Kubernetes manifests and Kustomize config
├── scripts/                 # CI test-count checker
├── docker-compose.yml
└── package.json
```
