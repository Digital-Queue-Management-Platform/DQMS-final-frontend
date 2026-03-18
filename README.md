# DQMP Frontend Architecture

A modern, high-performance web application serving as the primary interface for **Digital Queue Management Platform**. Built with React and Vite, this application delivers seamless user experiences across kiosks, TV displays and administrative dashboards.

---

## Key Technologies

- **Library:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Data Fetching:** React Query
- **Routing:** React Router DOM (v6)
- **Visualization:** Recharts

## Project Structure

- **`src/pages`**: Main application views (Kiosks, Dashboards, Displays).
- **`src/components`**: UI building blocks (Buttons, Modals, Cards).
- **`src/hooks`**: Custom React hooks for global state and logic.
- **`src/api`**: Axios-based API client and query definitions.
- **`src/context`**: Global state management (Auth, Settings).
- **`src/styles`**: Tailwind configuration and global styles.

## Deployment & Development

### 1. Prerequisites
- Node.js (Latest LTS)
- npm or yarn

### 2. Setup
```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install
```

### 3. Environment Config
Configure `.env` variables:
```env
VITE_API_URL="http://localhost:5000/api"
VITE_WS_URL="ws://localhost:5000"
```

### 4. Run Development
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

## Design Principles

1.  **Premium Aesthetics:** DQMP follows a clean, modern design with deep blues and crisp typography suited for the SLT brand.
2.  **Responsiveness:** Interfaces are designed for diverse hardware—from vertical kiosks to 4K TV displays.
3.  **Real-time Updates:** Near-zero latency with WebSocket integration for token ticket progression and announcements.
4.  **Accessibility:** High contrast and large click targets for customer-facing kiosk modules.

---

> [!TIP]  
> Use `npm run preview` to test the production build locally before deployment.
