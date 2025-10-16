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
- **Database**: SQLite with better-sqlite3
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Map**: Leaflet.js for geographic visualization
- **Authentication**: Session-based with bcryptjs

## Project Structure
```
/
├── server.js           # Main Express server
├── package.json        # Node.js dependencies
├── public/            # Frontend assets
│   ├── index.html     # Main HTML file
│   ├── app.js         # Frontend JavaScript
│   ├── style.css      # Styles
│   └── assets/        # Images and static files
└── agri_reseau.sqlite # SQLite database (auto-created)
```

## Features
1. **Actors Management**: CRUD operations for agricultural actors (producers, transporters, etc.)
2. **Geographic Mapping**: Leaflet-based map showing actor locations
3. **Logistics**: Track transport and logistics needs/offers
4. **Cost Calculation**: Calculate production costs with inputs and labor
5. **Budget Tracking**: Income and expense management
6. **User Authentication**: Register/login system with session management

## Database Schema
- **users**: User accounts with email, password, region, role
- **actors**: Agricultural actors with location, products, contact info
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

## Recent Changes (Oct 16, 2025)
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
