# TourOps

> The Complete Operations Platform for Travel & Visa Businesses.

## Overview

TourOps is a production-grade B2B SaaS platform built for African travel agencies, visa consultants, tour operators, Hajj & Umrah operators, and study abroad consultants.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, TanStack Query, Zustand, Recharts, Framer Motion |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT + Refresh Tokens + RBAC |
| Storage | Cloudinary |
| Email | Nodemailer |
| PDF | PDFKit |
| AI | OpenAI GPT-4o |
| Deployment | Docker, docker-compose |

## Modules

1. Authentication & Authorization (JWT, RBAC, 7 roles)
2. Customer CRM (profiles, passport, tags, merge, archive)
3. Visa Workflow (pipeline, officer assignment, appointments)
4. Tour Packages (itinerary builder, gallery, availability)
5. Booking Management (pipeline, quotations, status history)
6. Payments & Invoices (partial payments, PDF generation)
7. Dashboard (KPIs, revenue charts, activity feed)
8. Customer Portal (self-service tracking)
9. Document Management (upload, versioning, expiry tracking)
10. Notifications (in-app + email)
11. Financial Reports (CSV/PDF export)
12. AI Document Validation (OCR, missing doc detection)
13. AI Reporting (business summary, revenue insights)
14. AI Travel Recommendations (package matching)

## Project Structure

```
TourOps/
├── apps/
│   ├── api/          # Express.js backend
│   │   └── src/
│   │       ├── config/
│   │       ├── controllers/
│   │       ├── jobs/
│   │       ├── middleware/
│   │       ├── models/
│   │       ├── repositories/
│   │       ├── routes/
│   │       ├── services/
│   │       │   └── ai/
│   │       ├── types/
│   │       ├── utils/
│   │       └── validators/
│   └── web/          # Next.js frontend
│       └── src/
│           ├── app/
│           │   ├── (auth)/
│           │   ├── (dashboard)/
│           │   └── portal/
│           ├── components/
│           │   ├── features/
│           │   ├── layout/
│           │   ├── shared/
│           │   └── ui/
│           ├── lib/
│           ├── services/
│           ├── stores/
│           └── types/
├── docker-compose.yml
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- Cloudinary account
- OpenAI API key (for AI features)

### 1. Install dependencies

```bash
# API
cd apps/api && npm install

# Web
cd apps/web && npm install
```

### 2. Configure environment

```bash
# API
cp apps/api/.env.example apps/api/.env
# Fill in MONGO_URI, JWT secrets, Cloudinary, SMTP, OpenAI keys

# Web
cp apps/web/.env.local.example apps/web/.env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Run development servers

```bash
# From root
npm run dev
```

### 4. Docker (full stack)

```bash
docker-compose up --build
```

## API Endpoints

| Module | Base Path |
|---|---|
| Auth | `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout` |
| Customers | `GET/POST /api/v1/customers` |
| Bookings | `GET/POST /api/v1/bookings` |
| Visas | `GET/POST /api/v1/visas` |
| Packages | `GET/POST /api/v1/packages` |
| Invoices | `GET/POST /api/v1/invoices` |
| Documents | `GET/POST /api/v1/documents` |
| Dashboard | `GET /api/v1/dashboard/kpis` |
| Reports | `GET /api/v1/reports/revenue` |
| AI | `POST /api/v1/ai/documents/:id/validate` |

## User Roles

| Role | Access |
|---|---|
| `agency_owner` | Full access |
| `system_admin` | Full access |
| `travel_consultant` | Customers, Bookings, Packages, Documents |
| `visa_officer` | Customers (read), Visas, Documents |
| `finance_officer` | Payments, Reports, Bookings (read) |
| `customer_support` | Customers, Bookings (read), Visas (read) |
| `customer` | Portal only (own data) |
