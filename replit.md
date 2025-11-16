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
- **User Authentication & Authorization**: Register/login system with session management and role-based access control.
- **Subscription System**:
    - **Free Plan**: Limited to 2 actors per user.
    - **Premium Plan**: Offers unlimited actors, a premium badge, and access to future advanced features like analytics, internal messaging, alerts, digital contracts, stock history, and weather forecasts.
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