# AgriRéseau Pro — Togo

## Overview
AgriRéseau Pro is an agricultural network platform designed to connect agricultural actors in Togo. The application helps producers, transporters, processors, wholesalers, retailers, and institutions collaborate and manage their agricultural activities efficiently.

## Purpose
- Connect agricultural stakeholders across different regions of Togo (Maritime, Plateaux, Centrale, Kara, Savanes)
- Facilitate logistics coordination (transport, storage)
- Manage cost calculations and budgeting for agricultural activities
- Provide mapping visualization of agricultural actors

## Technology Stack
- **Backend**: Node.js with Express
- **Database**: PostgreSQL (Neon-backed serverless)
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Map**: Leaflet.js for geographic visualization
- **Authentication**: Session-based with bcryptjs
- **Deployment**: Autoscale (auto-scaling web service)

## Project Structure
```
/
├── server.js                # Main Express server (PostgreSQL)
├── db.js                    # PostgreSQL database connection module
├── package.json             # Node.js dependencies
├── migrate-to-postgres.js   # Migration script (SQLite → PostgreSQL)
├── public/                  # Frontend assets
│   ├── index.html          # Main HTML file
│   ├── app.js              # Frontend JavaScript
│   ├── style.css           # Styles
│   └── assets/             # Images and static files
└── server.sqlite.backup.js  # SQLite backup (for reference)
```

## Features
1. **Actors Management**: CRUD operations for agricultural actors (producers, transporters, etc.)
2. **Stock Summary (PUBLIC)**: Aggregate view of all available products and quantities across all actors - no login required
3. **Geographic Mapping**: Leaflet-based map showing actor locations
4. **Logistics**: Track transport and logistics needs/offers
5. **Cost Calculation**: Calculate production costs with inputs and labor
6. **Budget Tracking**: Income and expense management
7. **User Authentication**: Register/login system with session management

## Database Schema
- **users**: User accounts with email, password, region, role
- **subscriptions**: User subscriptions (free/premium) with payment tracking
- **actors**: Agricultural actors with location, products, contact info, price, photo_url, certifications
- **ratings**: Actor ratings (1-5 stars) with comments, one per user per actor
- **logistics**: Transport and logistics offers/needs
- **activities**: Cost calculation activities
- **activity_items**: Input and labor items for activities
- **budget_entries**: Income and expense entries
- **regions**: Reference table for Togo regions
- **products**: Reference table for agricultural products

## Running the Application
The server runs on port 5000 and is configured for the Replit environment:
- Port: 5000 (required for Replit)
- Host: 0.0.0.0 (accessible via Replit proxy)
- Cache headers disabled for development

## Subscription System (Freemium Model)

### Free Plan (Default)
- **Limit**: 2 acteurs maximum
- **Access**: All basic features (stock view, map, logistics, costing, budget)
- **Contact**: WhatsApp, Email, Phone
- **Price**: FREE

### Premium Plan (5,000 FCFA/month)
- **Limit**: Acteurs illimités
- **Badge**: 💎 PREMIUM visible on actor cards
- **Future features** (coming soon):
  - 📊 Analytics dashboard (views, contacts tracking)
  - 💬 Internal messaging between actors
  - 🔔 SMS/Email alerts (new products, price changes)
  - 📝 Digital contracts
  - 📈 Stock history tracking
  - 🌤️ Agricultural weather forecasts

### Payment Integration (Ready for T-Money & Flooz)
- Infrastructure prepared for PayGate integration
- Database schema supports payment tracking
- Awaiting PayGate API credentials for activation
- Will accept both T-Money and Flooz mobile money

## Recent Changes

### October 20, 2025 - Payment System Implementation 💳
- **Manual Payment Flow (ACTIVE)**:
  - Complete payment instructions for T-Money (*145#) and Flooz (*155#)
  - Beautiful modal interface showing payment steps
  - WhatsApp contact integration for transaction confirmation
  - 24h activation promise for manual payments
  - Backend endpoint `/api/admin/activate-premium` for manual activation
  - Transaction tracking with transaction_id and payment_method

- **PayGate Integration (PREPARED)**:
  - Complete integration guide in `PAYGATE_INTEGRATION.md`
  - Architecture designed for automatic T-Money & Flooz payments
  - Endpoints planned: `/api/payment/initiate`, `/api/paygate/callback`
  - Security measures documented (signature verification, HTTPS)
  - Sandbox testing instructions included
  - Ready for activation when PayGate account is created

- **User Experience**:
  - "💎 Passer à Premium maintenant" button in subscription modal
  - Clear upgrade path from Free to Premium
  - Professional payment instruction interface
  - Email reminder shown in payment instructions
  - Expiry date display for Premium subscribers

- **Backend Improvements**:
  - Premium activation endpoint with full validation
  - Automatic 1-month subscription period calculation
  - Transaction ID tracking in subscriptions table
  - Payment method field (tmoney/flooz/paygate/manual)
  - Support for both manual and automatic activation flows

### October 18, 2025 - Production Deployment Ready 🚀
- **PostgreSQL Migration**:
  - Migrated from SQLite to PostgreSQL (Neon serverless)
  - Created db.js module for database connection pooling
  - Adapted all queries to use async/await with parameterized queries
  - Successfully migrated all data (users, actors, ratings, subscriptions)
  - Removed SQLite dependencies for production compatibility

- **Autoscale Deployment**:
  - Configured for Autoscale deployment (auto-scaling web service)
  - Production-ready with persistent PostgreSQL database
  - Optimized for variable traffic with automatic scaling
  - Cost-effective: scales down when idle, up when busy

- **Technical Improvements**:
  - Connection pooling for better database performance
  - Async/await pattern throughout for better error handling
  - Boolean types properly handled (PostgreSQL vs SQLite)
  - Environment variables for database configuration

### October 17, 2025 - Freemium Infrastructure ⚙️
- **Subscription System**:
  - Added subscriptions table to database
  - Free plan: Limited to 2 actors per user
  - Premium plan: Unlimited actors with badge
  - Auto-creation of free subscription on registration
  - "💎 Abonnement" button in header (logged users only)
  - Subscription info dialog showing plan status and limits
  - Error handling when free users reach 2-actor limit

- **Premium Features Prepared**:
  - Premium badge (💎 PREMIUM) displayed on actor cards
  - Database ready for payment tracking (T-Money/Flooz)
  - Infrastructure ready for PayGate integration
  - Future premium features planned and documented

### October 17, 2025 - Pack 1: Trust & Reputation System 🎯
- **⭐ Rating System**:
  - Users can rate actors from 1 to 5 stars
  - Optional comment/review with each rating
  - Average rating displayed on actor cards with yellow badge
  - Rating count shown (e.g., "⭐⭐⭐⭐ 4.0 (3)")
  - "Noter" button available on all actor cards (login required)
  - One rating per user per actor (can be updated)

- **🏆 Certification Badges**:
  - Three certification types: Bio (🌿), Qualité (✅), Commerce Équitable (🤝)
  - Certifications displayed as green badges on actor cards
  - Selectable via checkboxes in actor creation/edit form
  - Multiple certifications can be assigned to one actor
  - Visual trust indicators for buyers

### October 17, 2025 - Core Features Added
- **💰 Price System**:
  - Price field added to actors (FCFA/kg)
  - Average price calculation and display in stock summary
  - Price badges shown with green background in public stock view
  - Individual prices displayed on each actor card
  
- **📸 Product Photos**:
  - Photo URL field added to actors
  - Photos displayed as thumbnails on actor cards
  - Sample photos from Unsplash for demo data
  - Visual quality improvement for product presentation
  
- **📍 Distance Calculation**:
  - Automatic distance calculation using Haversine formula
  - Shows distance from user location to each actor
  - Blue distance badges displayed on actor cards (e.g., "📍 45.2 km")
  - Requires user to click "Me localiser" button first
  
- **📱 Enhanced WhatsApp Integration**:
  - WhatsApp links now include pre-filled message template
  - Message: "Bonjour, je suis intéressé par vos produits"
  - Direct communication between actors and buyers

### October 16, 2025
- Imported from GitHub and configured for Replit environment
- Updated port from 3000 to 5000 for Replit compatibility
- Added cache control headers to prevent caching issues
- Configured server to bind to 0.0.0.0 for proper proxy access
- Set up workflow for automatic server startup
- **Added Geolocation Features**:
  - Browser-based geolocation to detect user's current position
  - "Use My Location" button in actor creation/edit dialog to auto-fill coordinates
  - "Locate Me" button on map to show user's current position
  - User location marker displayed on map with blue icon
  - Map automatically centers on user location when obtained
- **Improved Frontend Design**:
  - Modern green gradient header with professional styling
  - Smooth animations and transitions throughout
  - Enhanced card shadows with hover effects
  - Better typography and spacing
  - Mobile-responsive layout
  - Focus states with green highlights
- **Added Public Stock Summary Page**:
  - New "Stock disponible" section visible WITHOUT login
  - Aggregates all products from all actors on the platform
  - Shows total quantities (kg) available for each product
  - Displays average prices per product with green badges
  - Search and filter by product name or region
  - Automatically updates when actors are added/modified
  - Public access - no authentication required
