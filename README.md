# Digital Queue Management System - Frontend

[![React](https://img.shields.io/badge/React-18.x-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.x-38B2AC.svg)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000.svg)](https://vercel.com/)

A modern, responsive React TypeScript frontend for the Digital Queue Management System, providing seamless user experiences for customers, officers, managers, and administrators across multiple languages and devices.

## Features

### Multi-Language Support
- **English, Sinhala, Tamil** interface support
- **Dynamic language switching** for customer registration
- **Localized content** and error messages
- **RTL support** for compatible languages

### Multi-Role Interfaces

#### Customer Interface
- **QR Code Registration** - Scan outlet QR codes for instant registration
- **Mobile-First Design** - Optimized for smartphones and tablets
- **Real-Time Queue Status** - Live updates on wait times and position
- **Service Selection** - Choose from available services with descriptions
- **Multi-Language Support** - Complete interface in 3 languages
- **Estimated Wait Time** - AI-powered wait time predictions
- **SMS Notifications** - Optional mobile verification and updates

#### Officer Dashboard
- **Secure Authentication** - Role-based login system
- **Token Management** - Call next, skip, and complete services
- **Real-Time Updates** - WebSocket-powered live queue data
- **Status Controls** - Available, on break, offline status management
- **Performance Metrics** - Daily statistics and service counts
- **Break Management** - Track break times and productivity
- **End-of-Day Summary** - Comprehensive daily performance reports

#### Manager Dashboard
- **Regional Oversight** - Manage multiple outlets and branches
- **Officer Management** - Register, monitor, and evaluate staff
- **Analytics & Reporting** - Comprehensive performance insights
- **QR Code Management** - Generate and manage outlet QR codes
- **Break Oversight** - Monitor officer break patterns
- **Comparative Analysis** - Compare performance across branches

#### Admin Dashboard
- **System-Wide Analytics** - Complete organizational overview
- **Real-Time Monitoring** - Live system health and performance
- **User Management** - Manage officers, managers, and regions
- **Alert System** - Automated notifications for issues
- **Service Configuration** - Manage service types and categories
- **Customer Satisfaction** - Feedback analysis and trends

### Analytics & Reporting
- **Interactive Charts** - Beautiful data visualizations using Recharts
- **Performance Metrics** - KPIs for officers, outlets, and regions
- **Customer Satisfaction** - Feedback tracking and sentiment analysis
- **Wait Time Analysis** - Historical trends and optimization insights
- **Service Efficiency** - Throughput and completion rate analytics

### Real-Time Features
- **Live Queue Updates** - WebSocket integration for instant updates
- **Dynamic Status Changes** - Real-time officer and queue status
- **Instant Notifications** - Immediate feedback for all actions
- **Auto-Refresh** - Seamless data synchronization across all interfaces

## Architecture

### Component Structure
```
src/
├── components/              # Reusable UI components
│   ├── ConfirmDialog.tsx   # Confirmation modals
│   ├── Header.tsx          # Main navigation header
│   ├── ServiceName.tsx     # Dynamic service name display
│   ├── IPSpeaker.tsx       # IP speaker integration
│   └── ProtectedRoute.tsx  # Route protection HOCs
├── pages/                  # Main application pages
│   ├── AdminDashboard.tsx  # Admin interface
│   ├── OfficerDashboard.tsx # Officer workspace
│   ├── ManagerDashboard.tsx # Manager interface
│   ├── CustomerRegistration.tsx # Customer entry point
│   ├── QueueStatus.tsx     # Live queue display
│   └── FeedbackPage.tsx    # Customer feedback
├── admin/                  # Admin-specific components
│   ├── adminComponents/    # Admin UI components
│   └── adminPages/         # Admin page layouts
├── hooks/                  # Custom React hooks
│   └── useServiceName.ts   # Service name resolution
├── contexts/               # React contexts
│   └── UserContext.tsx     # Global user state
├── config/                 # Configuration files
│   └── api.ts             # API client setup
├── utils/                  # Utility functions
│   └── serviceUtils.ts     # Service helper functions
└── types/                  # TypeScript definitions
    └── index.ts           # Type definitions
```

### State Management
- **React Context** - Global user authentication and preferences
- **Local State** - Component-specific state management
- **Custom Hooks** - Reusable stateful logic
- **Real-time Sync** - WebSocket state synchronization

## Getting Started

### Prerequisites
- **Node.js 18.x** or higher
- **npm** or **yarn** package manager
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### 1. Clone & Install
```bash
git clone https://github.com/Digital-Queue-Management-Platform/DQMS-final-frontend.git
cd DQMS-final-frontend
npm install
```

### 2. Environment Configuration
Create environment files for different deployment environments:

#### `.env.development`
```env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

#### `.env.production`
```env
VITE_API_URL=https://dqms-final-backend.onrender.com/api
VITE_WS_URL=wss://dqms-final-backend.onrender.com
```

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 4. Build for Production
```bash
npm run build
npm run preview
```

## Development

### Available Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run lint         # Run ESLint for code quality
```

### Code Quality
```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Type checking
npx tsc --noEmit
```

## UI/UX Design

### Design System
- **Tailwind CSS** - Utility-first CSS framework
- **Responsive Design** - Mobile-first approach
- **Dark/Light Mode** - System preference detection
- **Consistent Colors** - Brand-aligned color palette
- **Typography** - Clean, readable font hierarchy

### Component Library
- **Lucide React** - Beautiful, customizable icons
- **React Icons** - Additional icon sets
- **QRCode.react** - QR code generation and display
- **Recharts** - Interactive data visualization

### Accessibility
- **WCAG 2.1 Compliance** - Level AA accessibility standards
- **Keyboard Navigation** - Full keyboard support
- **Screen Reader Support** - ARIA labels and descriptions
- **High Contrast** - Accessible color combinations
- **Focus Management** - Logical tab order and focus indicators

## Routes & Navigation

### Public Routes
```
/                           # Customer registration (home)
/register/:outletId         # Outlet-specific registration
/queue/:tokenId            # Queue status tracking
/feedback/:tokenId         # Customer feedback submission
/qr/:outletId             # QR code display for outlet
```

### Authentication Required
```
/officer/login             # Officer authentication
/officer/dashboard         # Officer workspace
/manager/login             # Manager authentication
/manager/dashboard         # Manager interface
/manager/branches          # Branch management
/manager/officers          # Officer management
/manager/compare           # Performance comparison
/admin/login              # Admin authentication
/admin/dashboard          # Admin overview
/admin/analytics          # System analytics
```

### Protected Routes
All authenticated routes are protected with:
- **Role-based access control**
- **Token validation**
- **Automatic logout** on token expiration
- **Redirect to login** for unauthorized access

## Authentication Flow

### Multi-Role Authentication
```typescript
// Officer Login
POST /api/officer/login
{
  "mobileNumber": "0771234567",
  "outletId": "outlet-uuid"
}

// Manager Login
POST /api/manager/login
{
  "email": "manager@example.com",
  "password": "secure-password"
}

// Admin Login
POST /api/admin/login
{
  "email": "admin@example.com",
  "password": "admin-password"
}
```

### Token Management
- **JWT Tokens** stored in localStorage
- **Automatic refresh** on API calls
- **Role-specific tokens** for different user types
- **Secure logout** with token cleanup

## Real-Time Features

### WebSocket Integration
```typescript
// WebSocket connection
const ws = new WebSocket(WS_URL);

// Event listeners
ws.addEventListener('NEW_TOKEN', handleNewToken);
ws.addEventListener('TOKEN_CALLED', handleTokenCalled);
ws.addEventListener('TOKEN_COMPLETED', handleTokenCompleted);
ws.addEventListener('OFFICER_STATUS_CHANGED', handleOfficerStatusChange);
```

### Live Updates
- **Queue position changes** - Real-time position updates
- **Officer status changes** - Live availability updates
- **New token registrations** - Instant queue additions
- **Service completions** - Immediate queue updates

## Multi-Language Support

### Supported Languages
- **English** - Primary language
- **Sinhala** - Local language support
- **Tamil** - Regional language support

### Implementation
```typescript
// Language selection
const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'si', name: 'සිංහල', flag: '🇱🇰' },
  { code: 'ta', name: 'தமிழ்', flag: '🇱🇰' }
];

// Dynamic content loading
const content = getLocalizedContent(currentLanguage);
```

## Performance Optimization

### Build Optimization
- **Vite Build Tool** - Fast development and optimized builds
- **Code Splitting** - Lazy loading for routes and components
- **Tree Shaking** - Remove unused code
- **Asset Optimization** - Compressed images and fonts

### Runtime Performance
- **React.memo** - Prevent unnecessary re-renders
- **useMemo/useCallback** - Optimize expensive computations
- **Virtual Scrolling** - Handle large lists efficiently
- **Image Lazy Loading** - Load images on demand

### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist
```

## Production Deployment

### Vercel Deployment (Recommended)
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

### Manual Deployment
```bash
# Build for production
npm run build

# Deploy dist/ folder to your hosting provider
```

### Environment Variables
Configure production environment variables in your deployment platform:
```env
VITE_API_URL=https://your-api-domain.com/api
VITE_WS_URL=wss://your-api-domain.com
```

### Docker Deployment
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Testing

### Testing Strategy
- **Component Testing** - Test individual components
- **Integration Testing** - Test component interactions
- **E2E Testing** - Test complete user workflows
- **Accessibility Testing** - Ensure WCAG compliance

### Manual Testing Checklist
```bash
# Customer Flow
✓ QR code scanning
✓ Multi-language registration
✓ Real-time queue updates
✓ Feedback submission

# Officer Flow
✓ Login authentication
✓ Token management
✓ Status updates
✓ Performance metrics

# Manager Flow
✓ Branch oversight
✓ Officer management
✓ Analytics viewing
✓ QR code generation

# Admin Flow
✓ System analytics
✓ User management
✓ Alert handling
✓ Configuration changes
```

## Configuration

### API Configuration
```typescript
// api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000
});
```

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1e40af',
        secondary: '#64748b',
        accent: '#10b981'
      }
    }
  }
};
```

## Security Features

### Client-Side Security
- **XSS Protection** - Input sanitization and validation
- **CSRF Protection** - Token-based request validation
- **Secure Storage** - Encrypted localStorage usage
- **Content Security Policy** - Prevent code injection attacks

### Authentication Security
- **JWT Token Validation** - Client-side token verification
- **Automatic Logout** - Session timeout handling
- **Role-Based Access** - Route-level permission checking
- **Secure API Communication** - HTTPS enforcement

## Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Develop** with proper TypeScript typing
4. **Test** your changes thoroughly
5. **Commit** with conventional commit messages
6. **Push** to your branch
7. **Create** a Pull Request

### Code Standards
- **TypeScript** - Strict type checking enabled
- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting (if configured)
- **Component Structure** - Consistent file organization
- **Naming Conventions** - Clear, descriptive names

### Commit Convention
```bash
feat: add new customer registration flow
fix: resolve queue status update issue
docs: update API integration guide
style: improve mobile responsive design
refactor: optimize service name loading
test: add officer dashboard test cases
```

#### Build Failures
```bash
# Check TypeScript errors
npx tsc --noEmit

# Check for dependency issues
npm audit
npm audit fix
```

#### API Connection Issues
```bash
# Verify environment variables
echo $VITE_API_URL
echo $VITE_WS_URL

# Test API connectivity
curl $VITE_API_URL/health
```

### Performance Issues
- **Check bundle size** - Large bundle affecting load times
- **Monitor memory usage** - Memory leaks in components
- **Network optimization** - API call efficiency
- **Image optimization** - Large image files

## Monitoring & Analytics

### Performance Monitoring
- **Core Web Vitals** - LCP, FID, CLS tracking
- **User Experience** - Page load times and interactions
- **Error Tracking** - JavaScript error monitoring
- **API Performance** - Request/response time tracking

### User Analytics
- **Usage Patterns** - Feature adoption and usage
- **User Journey** - Flow through different interfaces
- **Conversion Rates** - Registration to service completion
- **Satisfaction Metrics** - Feedback and rating analysis

