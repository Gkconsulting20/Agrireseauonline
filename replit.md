# AgriRéseau Pro — Togo

## Overview
AgriRéseau Pro is a comprehensive agricultural and livestock network platform for Togo, connecting all actors across the value chain. It aims to facilitate collaboration, logistics, cost management, and geographic visualization for producers, farmers, transporters, processors, wholesalers, retailers, and institutions. The platform enhances efficiency and connectivity within both agricultural and livestock sectors.

## User Preferences
The user prefers detailed explanations of changes and functionality. The user wants to be informed about how new features affect the overall system and user workflow. The user prefers clear, concise communication regarding technical implementations and architectural decisions.

## System Architecture
AgriRéseau Pro uses a modern web stack:
- **Backend**: Node.js with Express.
- **Database**: PostgreSQL (Neon-backed serverless instance).
- **Frontend**: Vanilla HTML, CSS, and JavaScript.
- **Mapping**: Leaflet.js for geographic visualization.
- **Authentication**: Session-based with `bcryptjs`.
- **Deployment**: Configured for Autoscale.

**UI/UX Decisions**:
- Modern green gradient header, professional styling, smooth animations, enhanced card shadows, improved typography, and mobile-responsive layout.
- Focus states with green highlights.
- Freemium model visually differentiates Free and Premium plans with a "💎 PREMIUM" badge.

**Technical Implementations & Feature Specifications**:
- **Flexible Units of Measure**: Customizable units (kg, unité, plateau, litre, sac, tonne, tête, boîte, bouteille, paquet) replace fixed "kg" for quantity displays, adapting to activity-specific needs.
- **Actors Management**: Full CRUD for all value chain actors with detailed profiles. Enhanced product management allows actors to add multiple products with specific production sites and images.
- **Stock Summary (Public)**: Publicly accessible aggregated view of available products, quantities, and average prices, with search/filter capabilities.
- **Geographic Mapping**: Actors' locations visualized on a Leaflet map, with user geolocation and distance calculation.
- **Cost Calculation & Budgeting**:
    - **Budget Module (Prévisionnel)**: Forecast budgets for activities with flexible units, tracking planned expenses, and projecting revenue/profit, with comparison to real costs.
    - **Coût de Revient Module (Dépenses Réelles)**: Records real expenses chronologically, linked to budgets for accumulation and comparison.
    - **Role-Adapted Expense Categories** (Added November 2025): Dynamic expense categories automatically adapt based on actor role. Each role has specific, relevant categories:
        - **Producteur**: Agricultural inputs (seeds, fertilizers, pesticides), labor, logistics, irrigation
        - **Éleveur**: Animal feed (poultry, pigs, cattle), veterinary (vaccines, antibiotics), equipment (feeders, drinkers, cages), animal care
        - **Transporteur**: Vehicle costs (fuel, maintenance, tires), operations (tolls, parking), insurance, driver salaries
        - **Transformateur**: Raw materials, energy (electricity, gas), packaging, machinery, processing labor
        - **Grossiste**: Stock purchases, warehouse infrastructure, logistics, warehouse staff
        - **Détaillant**: Merchandise, shop rent, retail staff, deliveries, advertising
        - **Institution**: Office supplies, employee salaries, infrastructure (rent, utilities), travel expenses
    - Category selection automatically updates when user selects a budget linked to an actor, displaying only relevant expense types for that business
    - **Automatic Availability Display**: Endpoint `/api/actors/:id/harvests` aggregates actual harvest quantities by product and unit, displayed on actor cards.
    - **Automatic Evaluation Table**: Dynamic monitoring dashboard comparing planned vs. actual for all budgets, showing variance, profit analysis, and harvest progress.
- **User Authentication & Authorization**:
    - Register/login with session management and role-based access.
    - Enhanced registration supports phone OR email, captures user geolocation, and manages account status.
    - **User Account Settings**: Dedicated "Paramètres" tab for profile management (name, email, phone, WhatsApp, region, role, password change).
    - **My Actors Management**: Self-service section in Settings to view, edit, delete, and add actors.
    - **Password Recovery System**: Token-based password reset via "Mot de passe oublié" link, with WhatsApp integration and copy-to-clipboard functionality.
- **Subscription System**:
    - **Free Plan**: Limited to 2 actors per user.
    - **Premium Plan**: Unlimited actors, premium badge, and advanced features.
        - **Statistics & Analytics Dashboard**: Comprehensive KPIs, actor performance metrics, budget variance analysis, visual charts, and export functionality.
        - **Mobile Money & Card Payment Integration**: FedaPay integration for T-Money, Flooz, and Visa/MasterCard, with webhook processing for automatic premium activation.
        - **Notification System (Premium Only)**: Twilio-based SMS and WhatsApp notifications with history and test functionality.
- **Admin System**:
    - **Role-Based Authorization**: `is_admin` flag for admin privileges.
    - **Admin Panel**: Dedicated "Administration" tab for user and logistics management.
    - **User Management**: CRUD operations for user accounts (view, edit, block/unblock, delete).
    - **Logistics Management**: Admins can manage all logistics publications (view, edit, delete).
- **Commercial Sales Team System** (Added November 2025):
    - **Role-Based Account System**: `is_commercial` flag in users table enables commercial team accounts with specialized read-only permissions.
    - **Referral Code System**: Each commercial user receives a unique code (format: COM-[NAME]-[4-digit random]) for recruit tracking.
    - **Recruitment Tracking**: Users joining with a commercial code are automatically linked as recruits, enabling performance metrics and commission calculation.
    - **Commercial Restrictions**: `blockCommercial` middleware enforces API-level restrictions preventing commercial accounts from creating/modifying actors, budgets, logistics, or activities. UI-level restrictions hide all tabs except Performance dashboard.
    - **Performance Dashboard**: Real-time KPIs for commercial users showing total recruits, total actors created by recruits, premium conversions, and conversion rates. Displays referral code with copy function and detailed recruits list.
    - **CSV Report Generation**: Individual commercial reports, admin reports for specific commercials, and consolidated reports for all commercials with UTF-8 BOM for Excel compatibility. CSV injection protection via `escapeCSV` function that neutralizes dangerous characters (=, +, -, @, \t, \r).
    - **Admin Management of Commercials** (Added November 2025):
        - Dedicated section in admin panel for commercial account management
        - View all commercials with performance metrics (recruits, actors, premium conversions)
        - Block/unblock commercial accounts to control access (blocked commercials cannot login)
        - Delete commercial accounts with confirmation (protects against self-deletion)
        - Modify commercial details with email/phone uniqueness validation
        - Download individual and consolidated performance reports
    - **Security Implementation**:
        - `requireCommercial` middleware protects commercial-only endpoints
        - `blockCommercial` middleware prevents commercial users from modifying platform content
        - `requireAdmin` middleware protects all admin commercial management endpoints
        - Profile update endpoint preserves `is_commercial` flag across all session refresh paths
        - Email/phone uniqueness validation prevents duplicate accounts
    - **Test Commercial Credentials**: koffi.commercial@agrireseau.tg / Commercial2025!
- **Trust & Reputation System**:
    - **Rating System**: 1-5 star ratings with optional comments for actors.
    - **Certification Badges**: Visual badges for Bio, Qualité, and Commerce Équitable certifications.
- **Product Presentation**: Support for product photos and display of harvest quantities on actor cards, with prices hidden.
- **Enhanced Communication**: WhatsApp integration with pre-filled message templates.
- **Monetization Infrastructure**: Complete FedaPay API integration for mobile money and card payments, including payment initiation, webhook processing, and transaction history. Twilio integration for SMS/WhatsApp notifications.

**System Design Choices**:
- Separation of concerns.
- Environment variables for sensitive configurations.
- Connection pooling for database performance.
- Asynchronous programming with `async/await`.
- Database schema supports users, subscriptions, actors, ratings, logistics, activities, activity items, budget entries, regions, products, payments, and notifications.
- Progressive monetization model (Freemium, Premium subscription, future transaction fees).

## External Dependencies
- **PostgreSQL (Neon serverless)**: Primary database.
- **Leaflet.js**: Interactive maps.
- **bcryptjs**: Password hashing.
- **FedaPay**: Pan-African payment gateway for mobile money (T-Money, Flooz) and Visa/MasterCard.
- **Twilio**: SMS and WhatsApp notification service (Premium only).