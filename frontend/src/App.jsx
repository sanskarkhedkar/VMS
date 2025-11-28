import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboard Pages
import Dashboard from './pages/dashboard/Dashboard';

// Visitor Pages
import InviteVisitor from './pages/visitors/InviteVisitor';
import VisitorsList from './pages/visitors/VisitorsList';
import VisitorDetails from './pages/visitors/VisitorDetails';
import CompleteInvitation from './pages/visitors/CompleteInvitation';

// Visit Pages
import VisitsList from './pages/visits/VisitsList';
import VisitDetails from './pages/visits/VisitDetails';
import PendingApprovals from './pages/visits/PendingApprovals';

// Security Pages
import SecurityDashboard from './pages/security/SecurityDashboard';
import CheckIn from './pages/security/CheckIn';
import WalkIn from './pages/security/WalkIn';

// Reports
import Reports from './pages/reports/Reports';

// Admin Pages
import Users from './pages/admin/Users';
import PendingUsers from './pages/admin/PendingUsers';
import Settings from './pages/admin/Settings';

// Notifications
import Notifications from './pages/notifications/Notifications';

// Profile
import Profile from './pages/profile/Profile';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Public Route Component (redirects if logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } 
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* Visitor Invitation Completion (Public) */}
      <Route path="/visitor/complete/:token" element={<CompleteInvitation />} />

      {/* Protected Routes */}
      <Route 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Visitors */}
        <Route path="/visitors" element={<VisitorsList />} />
        <Route path="/visitors/invite" element={<InviteVisitor />} />
        <Route path="/visitors/:id" element={<VisitorDetails />} />
        
        {/* Visits */}
        <Route path="/visits" element={<VisitsList />} />
        <Route path="/visits/:id" element={<VisitDetails />} />
        <Route 
          path="/visits/pending" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'PROCESS_ADMIN', 'SECURITY_MANAGER']}>
              <PendingApprovals />
            </ProtectedRoute>
          } 
        />
        
        {/* Security */}
        <Route 
          path="/security" 
          element={
            <ProtectedRoute allowedRoles={['SECURITY_GUARD', 'SECURITY_MANAGER']}>
              <SecurityDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/security/checkin" 
          element={
            <ProtectedRoute allowedRoles={['SECURITY_GUARD', 'SECURITY_MANAGER']}>
              <CheckIn />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/security/walkin" 
          element={
            <ProtectedRoute allowedRoles={['SECURITY_GUARD', 'SECURITY_MANAGER']}>
              <WalkIn />
            </ProtectedRoute>
          } 
        />
        
        {/* Reports */}
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HOST_EMPLOYEE', 'SECURITY_MANAGER', 'PROCESS_ADMIN']}>
              <Reports />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin */}
        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Users />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/pending-users" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <PendingUsers />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/settings" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Settings />
            </ProtectedRoute>
          } 
        />
        
        {/* Notifications */}
        <Route path="/notifications" element={<Notifications />} />
        
        {/* Profile */}
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
