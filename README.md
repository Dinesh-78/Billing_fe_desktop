# Billing Desktop - Offline Shop Management

A clean, offline-first desktop billing application for shop keepers built with **Electron**, **React**, **TypeScript**, and **SQLite**.

## Features

- **Product Management** – Add, edit, delete products with code, name, image, pricing, HSN, stock, category, low stock threshold
- **Category Management** – Categories with GST rates (Country/State code, CGST, SGST)
- **Orders** – Create invoices with customer name, phone, items, totals
- **Customers** – Auto-track customers and total purchases
- **Low Stock Alerts** – Notification bar when products fall below threshold
- **Delete Protection** – Products can only be deleted if no invoice references exist

## Tech Stack

- **Electron** – Cross-platform desktop
- **React 18 + TypeScript** – UI
- **Vite** – Build tool
- **Tailwind CSS** – Styling
- **better-sqlite3** – Embedded SQLite (WAL mode, indexes)
- **Lucide React** – Icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Install

```bash
npm install
```

This runs `electron-rebuild` automatically to compile `better-sqlite3` for Electron.

### Development

```bash
npm run dev
```

This starts Vite and Electron. The app loads from the dev server (e.g. `http://localhost:5173`).

### Build for Production

```bash
npm run dist
```

Output is in the `release` folder.

## Data Storage

Data is stored in SQLite at:

- **Windows**: `%APPDATA%/billing-desktop/billing.db`
- **macOS**: `~/Library/Application Support/billing-desktop/billing.db`
- **Linux**: `~/.config/billing-desktop/billing.db`

WAL mode is enabled for better concurrency. Indexes are added for products, categories, orders, and order items.

## Project Structure

```
├── electron/
│   ├── main.ts       # Electron main process, IPC handlers
│   ├── preload.ts    # Context bridge for renderer
│   └── database.ts   # SQLite schema and service layer
├── src/
│   ├── components/   # Reusable UI (Modal, forms, LowStockAlert)
│   ├── pages/        # Dashboard, Products, Categories, Orders, Customers
│   ├── lib/          # DB API types
│   └── types/        # Shared TypeScript types
├── index.html
└── package.json
```

## License

MIT
