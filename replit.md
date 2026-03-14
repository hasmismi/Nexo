# Nexo App

## Overview

Nexo is a personalized nutrition mobile app built with Expo React Native and a Node.js/PostgreSQL backend. Users sign in, complete onboarding, and receive tailored product recommendations based on their health goals.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Mobile**: Expo SDK 54 + Expo Router (file-based routing)
- **State**: React Query + Context API + AsyncStorage

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── mobile/             # Expo React Native app
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── tsconfig.json
```

## Mobile App Screens

- **Login** (`app/index.tsx`) — Google Sign-In with demo mode
- **Onboarding** (`app/onboarding.tsx`) — 2-step: profile details + goal selection
- **Dashboard** (`app/(tabs)/index.tsx`) — BMI, nutrition plan, quick actions
- **Products** (`app/(tabs)/products.tsx`) — Product catalog with add-to-cart modal
- **Cart** (`app/cart.tsx`) — Cart management and checkout
- **Orders** (`app/orders.tsx`) — Order history with status
- **Support** (`app/support.tsx`) — Contact info and FAQ accordion

## API Endpoints

- `POST /api/auth/google-login`
- `POST /api/onboarding`
- `GET /api/dashboard?account_id=:id`
- `GET /api/products`
- `POST /api/cart/add`
- `GET /api/cart?account_id=:id`
- `DELETE /api/cart/item/:id`
- `POST /api/checkout`
- `GET /api/orders?account_id=:id`
- `GET /api/support`

## Database Tables

- `accounts` — Google auth records
- `profiles` — User profile + BMI (auto-calculated)
- `goals` — Nutrition goal types (weight_loss, muscle_gain, immunity, energy, vitamins)
- `user_goals` — User's ranked goal selections (max 2)
- `products` — Nutrition powder catalog
- `cart_items` — Shopping cart items
- `orders` + `order_items` — Purchase history

## Recommendation Logic

- Weight > 60kg → 1500g/month
- Weight > 50kg → 1300g/month
- Weight > 40kg → 1000g/month
- Otherwise → 800g/month
- If 2 goals selected, split grams evenly
- Daily serving = total_grams / 30

## Seed Data

Products seeded:
- Nexo Lean (₹0.85/g, weight_loss)
- Nexo Protein (₹0.90/g, muscle_gain)
- Nexo Immunity (₹0.75/g, immunity)
- Nexo Energy (₹0.80/g, energy)
- Nexo Vitamins (₹0.70/g, vitamins)
- Trial Pack (₹399 flat, is_trial=true)

## Design Theme

- Dark mode only: background #0A0A0A, surface #141414
- Primary accent: #00C27B (green)
- Secondary accent: #FF6B35 (orange)
- Font: Inter (400, 500, 600, 700)
