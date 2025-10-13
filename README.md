# Digital Queue Platform - Frontend

## Overview

React + TypeScript frontend for the SLTMobitel Digital Queue Platform.

## Features

- **Customer Interface**
  - Multi-language support (English, Sinhala, Tamil)
  - QR code registration
  - Real-time queue status tracking
  - Estimated wait time display

- **Officer Dashboard**
  - Secure login
  - Token management (call next, complete service)
  - Status controls (available, on break, logout)
  - Daily performance statistics
  - End-of-day summary

- **Admin Dashboard**
  - Real-time system overview
  - Analytics and reporting
  - Officer performance tracking
  - Customer satisfaction metrics
  - Alert management for negative feedback

- **Feedback System**
  - 5-star rating system
  - Optional comments
  - Automatic alert generation for low ratings

## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Configure environment variables:
\`\`\`bash
cp .env.example .env
# Edit .env with your API and WebSocket URLs
\`\`\`

3. Start development server:
\`\`\`bash
npm run dev
\`\`\`

The app will be available at `http://localhost:3000`

## Build for Production

\`\`\`bash
npm run build
npm run preview
\`\`\`

## Routes

- `/` - Customer registration
- `/register/:outletId` - Registration for specific outlet
- `/queue/:tokenId` - Queue status tracking
- `/feedback/:tokenId` - Feedback submission
- `/qr/:outletId` - QR code display for outlet
- `/officer/login` - Officer login
- `/officer/dashboard` - Officer dashboard
- `/admin` - Admin dashboard

## Technologies

- React 18
- TypeScript
- React Router
- Axios
- Tailwind CSS
- Lucide Icons
- QR Code React
- WebSocket for real-time updates
