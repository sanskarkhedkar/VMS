# Visitor Management System (VMS)

A complete, modern, corporate-styled Visitor Management System built with React, Node.js, Express, and PostgreSQL.

![VMS Banner](https://via.placeholder.com/800x400?text=Visitor+Management+System)

## 🌟 Features

### Role-Based Access Control
- **Admin**: Full system access, user management, settings
- **Host Employee**: Invite visitors, manage own visits, generate reports
- **Process Admin**: Approve/reject visitor requests
- **Security Guard**: Check-in/out visitors, register walk-ins
- **Security Manager**: All security functions + approvals + reports

### Core Functionality
- 📧 **Visitor Invitations**: Email-based invitation system
- 📱 **QR Code Check-in**: Scan QR codes for quick visitor check-in
- 👥 **Walk-in Registration**: On-the-spot visitor registration
- ✅ **Approval Workflow**: Multi-level approval system
- 📊 **Comprehensive Reports**: CSV/PDF export capabilities
- 🔔 **Real-time Notifications**: In-app notification system
- 🌙 **Dark Mode**: Full dark theme support
- 📱 **Responsive Design**: Works on all devices

## 🏗️ Tech Stack

### Backend
- Node.js + Express.js
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Nodemailer (Email)
- QRCode generation

### Frontend
- React 18
- Vite
- TailwindCSS
- React Query
- React Router v6
- Zustand (State Management)
- Recharts (Charts)
- React Hook Form + Zod

## 📁 Project Structure

```
vms/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.js          # Database seeding
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Utility functions
│   │   └── index.js         # App entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── layouts/         # Layout components
    │   ├── pages/           # Page components
    │   ├── store/           # Zustand stores
    │   ├── lib/             # Utilities & API
    │   ├── App.jsx          # Main app component
    │   └── main.jsx         # Entry point
    ├── tailwind.config.js
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Desktop Notification Agent (Tauri)
- Location: `./vms-notification-agent-tauri` (replaces the legacy Electron agent)
- Install & run: `cd vms-notification-agent-tauri && npm install && npm run tauri dev`
- Backend URL: enter your VMS API host (e.g., `http://localhost:5000`) in the agent; it will call `/api/auth/login` and open a Socket.IO connection to the same host.
- Build installers: `npm run build` (outputs to `src-tauri/target/release/bundle/`)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your database URL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/vms_db"
JWT_SECRET="your-secret-key"
FRONTEND_URL="http://localhost:3000"
```

5. Run database migrations:
```bash
npx prisma migrate dev
```

6. Seed the database:
```bash
npm run db:seed
```

7. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vms.com | Admin@123 |
| Host Employee | host@vms.com | Host@123 |
| Process Admin | process@vms.com | Process@123 |
| Security Guard | guard@vms.com | Guard@123 |
| Security Manager | security.manager@vms.com | Manager@123 |

## 📋 API Documentation

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - List all users
- `GET /api/users/pending` - Get pending approvals
- `POST /api/users/:id/approve` - Approve user
- `POST /api/users/:id/reject` - Reject user

### Visitors
- `GET /api/visitors` - List all visitors
- `GET /api/visitors/search` - Search visitors
- `GET /api/visitors/:id` - Get visitor details
- `POST /api/visitors/:id/blacklist` - Blacklist visitor

### Visits
- `GET /api/visits` - List all visits
- `POST /api/visits/invite` - Create invitation
- `POST /api/visits/walkin` - Create walk-in
- `POST /api/visits/:id/approve` - Approve visit
- `POST /api/visits/:id/checkin` - Check-in visitor
- `POST /api/visits/:id/checkout` - Check-out visitor
- `POST /api/visits/checkin-qr` - Check-in via QR

### Dashboard
- `GET /api/dashboard/stats` - General statistics
- `GET /api/dashboard/admin` - Admin dashboard
- `GET /api/dashboard/host` - Host dashboard
- `GET /api/dashboard/security` - Security dashboard

### Reports
- `GET /api/reports/visitors` - Visitor report
- `GET /api/reports/visitors/export/csv` - Export CSV
- `GET /api/reports/visitors/export/pdf` - Export PDF

## 🎨 UI Features

- Modern corporate design with blue/slate color scheme
- Smooth animations and transitions
- Responsive sidebar navigation
- Data tables with sorting and pagination
- Interactive charts and graphs
- Toast notifications
- Modal dialogs
- Form validation
- Loading skeletons

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Input validation
- XSS protection
- CORS configuration

## 📧 Email Templates

Professional HTML email templates for:
- User signup pending approval
- User account approved
- Visitor invitation
- Visit approved (with QR code)
- Visitor arrival notification
- Password reset

## 🚀 Deployment

### Backend
```bash
npm run build
npm start
```

### Frontend
```bash
npm run build
```

Deploy the `dist` folder to your static hosting service.

## 📝 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using React & Node.js
