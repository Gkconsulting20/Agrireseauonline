# AgriRéseau Pro — Togo

## Overview
AgriRéseau Pro is an agricultural network platform designed to connect agricultural actors in Togo. Its primary purpose is to facilitate collaboration, logistics coordination, cost management, and geographic visualization of agricultural stakeholders (producers, transporters, processors, wholesalers, retailers, and institutions) across Togo's diverse regions. The platform aims to enhance efficiency and connectivity within the agricultural sector.

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
- **Actors Management**: Full CRUD operations for various agricultural actors with detailed profiles including location, products, contact info, price, photos, and certifications.
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
    - **Premium Plan**: Offers unlimited actors, a premium badge, and access to future advanced features like analytics, internal messaging, alerts, digital contracts, stock history, and weather forecasts.
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
- **Product Presentation**: Support for product photos and price display (FCFA/kg) on actor cards and in stock summaries.
- **Enhanced Communication**: WhatsApp integration with pre-filled message templates.

**System Design Choices**:
- Separation of concerns between frontend and backend.
- Use of environment variables for sensitive configurations.
- Connection pooling for database performance.
- Asynchronous programming with `async/await` for better error handling and responsiveness.
- Database schema supports users, subscriptions, actors, ratings, logistics, activities, activity items, budget entries, regions, and products.

## External Dependencies
- **PostgreSQL (Neon serverless)**: Primary database for all application data.
- **Leaflet.js**: JavaScript library for interactive maps.
- **bcryptjs**: Library for password hashing and security.
- **PayGate**: Payment gateway integration planned for T-Money and Flooz mobile money services (awaiting API credentials for full activation).