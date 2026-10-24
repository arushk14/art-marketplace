# art-marketplace

A full-stack online marketplace where artists can showcase and sell their artwork and buyers can discover, purchase, and review pieces from independent creators.

## Overview

Art Marketplace is a web application designed to connect artists with buyers through an online shopping experience. The platform supports artwork listings, artist profiles, shopping carts, secure checkout, and artist dashboards for managing artwork and tracking sales.

The project focuses on building a functional marketplace with secure authentication, database authorization, and integrated payment processing.

## Features

- **User Authentication:** Account registration, login, and session management.
- **Artwork Management:** Create, view, edit, and delete artwork listings.
- **Artist Profiles:** Individual artist pages showcasing artwork.
- **Shopping Cart:** Browse and purchase artwork through a cart-based shopping experience.
- **Payment Processing:** Stripe Checkout integration for artwork purchases.
- **Artist Payouts:** Stripe Connect integration for artist onboarding and marketplace payments.
- **Buyer Dashboard:** View purchases and access buyer functionality.
- **Artist Dashboard:** Manage listings and view sales and revenue information.
- **Reviews and Wishlists:** Support artwork reviews and save artwork for later.
- **Search and Filtering:** Discover artwork through available search and filtering functionality.
- **Image Storage:** Supabase Storage integration for artwork images.
- **Database Security:** Supabase Row Level Security (RLS) policies to restrict access to protected data.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend UI |
| TypeScript | Type safety |
| Vite | Development server and build tooling |
| Tailwind CSS | Styling and responsive layouts |
| Supabase | PostgreSQL database, authentication, and image storage |
| Supabase Edge Functions | Server-side operations and payment integration |
| Stripe Checkout | Payment processing |
| Stripe Connect | Artist onboarding and marketplace payment distribution |
| Git and GitHub | Version control |

## Architecture

The application connects a React frontend to Supabase services and Stripe payment infrastructure.

- **Frontend:** React, TypeScript, and Tailwind CSS.
- **Backend:** Supabase Edge Functions for server-side operations.
- **Database:** PostgreSQL with Row Level Security policies.
- **Authentication:** Supabase Auth.
- **Storage:** Supabase Storage for artwork images.
- **Payments:** Stripe Checkout and Stripe Connect.

Payment-sensitive operations are handled server-side, with artwork prices retrieved from the database rather than trusted from client-submitted values. Stripe webhooks synchronize payment events with marketplace records.

## Getting Started

### Prerequisites

- Node.js and npm
- A Supabase project
- A Stripe account for payment integration

### Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/art-marketplace.git
cd art-marketplace
```

Install dependencies:

```bash
npm install
```

Create a local environment file based on `.env.example`:

```bash
cp .env.example .env
```

Configure the required frontend environment variables in `.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use the environment variable names expected by the application. Configure server-side secrets separately through Supabase Edge Function secrets.

### Run Locally

```bash
npm run dev
```

### Validate the Build

Run the available project checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Security Considerations

- Never commit `.env` files or actual secrets to GitHub.
- Keep Stripe secret keys, Stripe webhook signing secrets, and Supabase service-role keys server-side.
- Use Row Level Security to enforce database access restrictions.
- Validate authentication and authorization for sensitive operations.
- Verify Stripe webhook signatures before processing payment events.
- Use server-side price validation and inventory controls for purchases.

## Project Status

The application has been developed with core marketplace functionality, including artwork management, authentication, database integration, and Stripe payment processing. Testing and production-readiness verification should be completed before accepting live payments.

## Future Improvements

Potential future work includes expanding automated test coverage, improving monitoring and error reporting, and completing additional production-readiness checks.

## Author

Developed as a full-stack software engineering project.
