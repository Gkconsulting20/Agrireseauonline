# AgriRéseau Pro — Togo

## Overview
AgriRéseau Pro is a comprehensive agricultural and livestock network platform designed to connect all actors across the complete value chain in Togo. Its primary purpose is to facilitate collaboration, logistics coordination, cost management, and geographic visualization of stakeholders including producers (crops and livestock), livestock farmers (cattle, poultry, pigs), transporters, processors, wholesalers, retailers, and institutions across Togo's diverse regions. The platform aims to enhance efficiency and connectivity within both the agricultural and livestock sectors.

## User Preferences
The user prefers detailed explanations of changes and functionality. The user wants to be informed about how new features affect the overall system and user workflow. The user prefers clear, concise communication regarding technical implementations and architectural decisions.

## System Architecture
AgriRéseau Pro utilizes a modern web stack:
- **Backend**: Node.js with Express for handling API requests and business logic.
- **Database**: PostgreSQL, specifically a Neon-backed serverless instance, for robust and scalable data storage.
- **Frontend**: A lightweight, responsive interface built with Vanilla HTML, CSS, and JavaScript.
- **Mapping**: Leaflet.js is integrated for dynamic geographic visualization of agricultural actors.
- **Authentication**: Session-based authentication using `bcryptjs` for secure user management.
- **Deployment**: Configured for Autoscale, ensuring automatic scaling based on traffic.

**UI/UX Decisions**:
- Modern green gradient header and professional styling.
- Smooth animations, transitions, and enhanced card shadows with hover effects.
- Improved typography and spacing for readability.
- Mobile-responsive layout ensuring accessibility across devices.
- Focus states with green highlights for interactive elements.
- A clear freemium model with distinct Free and Premium plans, visually differentiated with a "💎 PREMIUM" badge for premium actors.

**Technical Implementations & Feature Specifications**:
- **Actors Management**: Full CRUD operations for all value chain actors (producers, livestock farmers, transporters, processors, wholesalers, retailers, institutions) with detailed profiles including location, products (crops, meat, eggs, dairy, processed goods), contact info, price, photos, and certifications.
- **Stock Summary (Public)**: A publicly accessible aggregate view of all available products and quantities, displaying average prices and allowing search/filter by product or region.
- **Geographic Mapping**: Actors' locations are visualized on a Leaflet map, with user geolocation and distance calculation features.
- **Logistics**: Functionality to track transport and logistics needs and offers.
- **Cost Calculation & Budgeting**:
    - **Budget Module (Prévisionnel)**: Allows creation of forecast budgets for activities, tracking planned expenses, and calculating projected revenue and profit. It provides a side-by-side comparison with real costs.
    - **Coût de Revient Module (Dépenses Réelles)**: A simplified form to record real expenses chronologically, linked to specific budgets for automatic accumulation and comparison.
    - **Harvest Product Linkage**: `activities` are linked to specific actors and `harvest_product` for accurate, real-time stock tracking.
    - **Automatic Availability Display**: Endpoint `/api/actors/:id/harvests` aggregates actual harvest quantities by product, automatically displaying "📦 Disponible: [product]: [quantity] kg" on actor cards.
- **User Authentication & Authorization**: 
    - Register/login system with session management and role-based access control.
    - **Enhanced Registration**: Users can register with phone OR email (flexible authentication).
    - **Geolocation Support**: Registration captures user lat/lng coordinates for proximity features.
    - **Account Status Management**: Users have a `status` field (active, blocked, pending) checked during login.
    - Phone numbers are normalized (spaces removed) to prevent authentication mismatches.
    - **User Account Settings** (Added November 2025):
        - Dedicated "Paramètres" tab for logged-in users to manage their profile
        - Profile modification: Update name, email, phone, WhatsApp, region, and role
        - Password change: Secure password update with current password verification
        - Role preservation: Backend ensures role is never accidentally cleared during updates
    - **Password Recovery System** (Added November 2025):
        - "Mot de passe oublié" link in login dialog for easy access
        - Token-based password reset with 1-hour expiration
        - Database table `password_reset_tokens` stores secure reset tokens
        - Reset link generation with shareable URL (#reset-password?token=XXX)
        - WhatsApp integration: Users with WhatsApp can send reset link directly via WhatsApp
        - Copy-to-clipboard functionality for easy link sharing
        - Complete reset flow with password confirmation and validation
- **Subscription System**:
    - **Free Plan**: Limited to 2 actors per user.
    - **Premium Plan**: Offers unlimited actors, a premium badge, and access to advanced features:
        - **Statistics & Analytics Dashboard** (Added November 2025): Comprehensive dashboard with KPIs (actors count, budgets, views, expenses, harvests, ratings), actor performance metrics (ratings, views, products, available harvests), budget variance analysis (planned vs real, variance %, profit, status), visual evolution charts, and CSV/PDF export functionality.
        - **Mobile Money Payment Integration** (Added November 2025): PayGate integration for T-Money and Flooz payments, payment initiation UI with provider selection and phone number input, transaction history display with status badges (completed, pending, failed), automatic premium activation upon successful payment.
        - **Notification System** (Added November 2025): Twilio-ready endpoints for SMS and WhatsApp notifications, notification history display with status tracking, test notification functionality for integration validation.
- **Admin System** (Added November 2025):
    - **Role-Based Authorization**: `is_admin` flag in users table enables admin privileges.
    - **Admin Panel**: Dedicated "Administration" tab visible only to admins.
    - **User Management**: Complete CRUD operations for user accounts:
        - View all users with details (ID, name, email, phone, region, role, status, admin flag)
        - Edit user information and permissions
        - Block/unblock user accounts (prevents login when status='blocked')
        - Delete users (with self-deletion protection for admins)
    - **Security Implementation**:
        - `requireAdmin` middleware protects all admin routes
        - Admin endpoints whitelist safe fields (exclude password_hash)
        - Session includes `is_admin` and `status` for proper authorization
        - Premium activation requires admin privileges
    - **Test Admin Credentials**: admin@agrireseau.tg / Admin2025!
- **Trust & Reputation System**:
    - **Rating System**: Users can rate actors (1-5 stars) with optional comments, displayed as an average rating with count on actor cards.
    - **Certification Badges**: Visual badges for Bio (🌿), Qualité (✅), and Commerce Équitable (🤝) certifications on actor cards.
- **Product Presentation**: Support for product photos. Harvest quantities are visible on actor cards ("📦 Disponible: [product]: [quantity] kg"), but prices are hidden to encourage direct negotiation between buyers and sellers.
- **Enhanced Communication**: WhatsApp integration with pre-filled message templates.
- **Monetization Infrastructure** (Added November 2025):
    - **Payment Processing**: Complete PayGate API integration for T-Money (60% market share) and Flooz (40% market share) mobile money payments.
    - **Payment Endpoints**: `/api/payments/initiate` (requireAuth) for payment initiation with transaction tracking, `/api/payments/callback` for PayGate webhook processing and auto-premium activation, `/api/payments/history` (requireAuth) for transaction history.
    - **Notification Endpoints**: `/api/notifications/send` (requireAuth) for SMS/WhatsApp sending via Twilio, `/api/notifications/history` (requireAuth) for notification tracking.
    - **Database Tables**: `payments` table for transaction tracking (user_id, amount, payment_method, provider, transaction_id, status, metadata), `notifications` table for notification logging (user_id, type, channel, recipient, message, status, sent_at, error_message).
    - **Security**: All payment and notification endpoints protected by requireAuth middleware, environment variables for API keys (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, PAYGATE_API_KEY), transaction ID generation with unique identifiers.

**System Design Choices**:
- Separation of concerns between frontend and backend.
- Use of environment variables for sensitive configurations.
- Connection pooling for database performance.
- Asynchronous programming with `async/await` for better error handling and responsiveness.
- Database schema supports users, subscriptions, actors, ratings, logistics, activities, activity items, budget entries, regions, products, payments, and notifications.
- Progressive monetization model: Freemium (2 actors) → Premium subscription (1,000 FCFA/month, unlimited actors + analytics) → Future: Transaction fees, Featured actors, Financial services.

## External Dependencies
- **PostgreSQL (Neon serverless)**: Primary database for all application data.
- **Leaflet.js**: JavaScript library for interactive maps.
- **bcryptjs**: Library for password hashing and security.
- **PayGate**: Payment gateway integration for T-Money and Flooz mobile money services. Infrastructure ready, awaiting API credentials for live activation. See INTEGRATION_GUIDE.md for setup instructions.
- **Twilio**: SMS and WhatsApp notification service. Framework ready, awaiting API credentials for live activation. See INTEGRATION_GUIDE.md for setup instructions.

## Production Deployment Checklist
Before deploying to production, configure the following environment variables:
- [ ] `SESSION_SECRET` - Secure random string for session encryption
- [ ] `TWILIO_ACCOUNT_SID` - Twilio Account SID (for SMS/WhatsApp notifications)
- [ ] `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- [ ] `TWILIO_PHONE_NUMBER` - Twilio phone number (format: +1234567890)
- [ ] `PAYGATE_API_KEY` - PayGate API Key (UUID format)
- [ ] `PAYGATE_MERCHANT_ID` - PayGate Merchant ID
- [ ] `PAYGATE_CALLBACK_URL` - PayGate callback URL (https://your-app.replit.app/api/payments/callback)

Refer to INTEGRATION_GUIDE.md for detailed configuration instructions and testing procedures.