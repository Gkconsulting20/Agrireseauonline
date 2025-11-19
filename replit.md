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
- **Commercial Sales Team System**:
    - **Role-Based Account System**: `is_commercial` flag for specialized read-only permissions.
    - **Referral Code System**: Unique codes for recruit tracking and performance metrics.
    - **Recruitment Tracking**: Links users joining with a commercial code to the commercial user.
    - **Commercial Restrictions**: Middleware (`blockCommercial`) prevents commercial accounts from modifying platform content; UI hides non-relevant tabs.
    - **Performance Dashboard**: Real-time KPIs for commercial users (recruits, actors, premium conversions).
    - **CSV Report Generation**: Individual and consolidated commercial reports with CSV injection protection.
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