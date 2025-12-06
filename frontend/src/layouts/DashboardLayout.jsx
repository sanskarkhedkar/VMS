import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { cn, formatRole, getInitials } from '../lib/utils';
import VishayLogo from '../assets/Vishay_Logo.svg';
import VishayLogoDark from '../assets/Vishay_Logo_dark.svg';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Calendar,
  ClipboardCheck,
  Shield,
  QrCode,
  UserCheck,
  FileBarChart,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Moon,
  Sun,
} from 'lucide-react';
import EndingSoonPrompt from '../components/EndingSoonPrompt';

const navigation = {
  ADMIN: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Pending Users', href: '/admin/pending-users', icon: UserCheck },
    { name: 'Visitors', href: '/visitors', icon: Users },
    { name: 'All Visits', href: '/visits', icon: Calendar },
    { name: 'Pending Approvals', href: '/visits/pending', icon: ClipboardCheck },
    { name: 'Reports', href: '/reports', icon: FileBarChart },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  HOST_EMPLOYEE: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Invite Visitor', href: '/visitors/invite', icon: UserPlus },
    { name: 'My Visitors', href: '/visitors', icon: Users },
    { name: 'My Visits', href: '/visits', icon: Calendar },
    { name: 'Reports', href: '/reports', icon: FileBarChart },
  ],
  PROCESS_ADMIN: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Invite Visitor', href: '/visitors/invite', icon: UserPlus },
    { name: 'Visitors', href: '/visitors', icon: Users },
    { name: 'Pending Approvals', href: '/visits/pending', icon: ClipboardCheck },
    { name: 'My Visits', href: '/visits', icon: Calendar },
    { name: 'All Visits', href: '/visits', icon: Calendar },
    { name: 'Reports', href: '/reports', icon: FileBarChart },
  ],
  SECURITY_GUARD: [
    { name: 'Dashboard', href: '/security', icon: Shield },
    { name: 'Check-In', href: '/security/checkin', icon: QrCode },
    { name: 'Walk-In Visitor', href: '/security/walkin', icon: UserPlus },
    { name: "Today's Visits", href: '/visits', icon: Calendar },
  ],
  SECURITY_MANAGER: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Security', href: '/security', icon: Shield },
    { name: 'Check-In', href: '/security/checkin', icon: QrCode },
    { name: 'Walk-In Visitor', href: '/security/walkin', icon: UserPlus },
    { name: 'Pending Approvals', href: '/visits/pending', icon: ClipboardCheck },
    { name: 'All Visits', href: '/visits', icon: Calendar },
    { name: 'Reports', href: '/reports', icon: FileBarChart },
  ],
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const userNavigation = navigation[user?.role] || navigation.HOST_EMPLOYEE;

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadCount = notificationsData?.data?.filter?.((n) => !n.isRead)?.length || 0;
  const hasUnread = unreadCount > 0;
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <EndingSoonPrompt />
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700",
        "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0">
              <img src={VishayLogo} alt="Vishay logo" className="h-8 w-auto dark:hidden" />
              <img src={VishayLogoDark} alt="Vishay logo" className="h-8 w-auto hidden dark:block" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-display leading-tight max-w-[150px] sm:max-w-none">
              Vishay Components VMS
            </span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-8rem)] custom-scrollbar">
          {userNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(isActive ? 'sidebar-link-active' : 'sidebar-link')
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold">
              {getInitials(user?.firstName, user?.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {formatRole(user?.role)}
              </p>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
          <div className="h-full px-4 lg:px-8 flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              {/* Notifications */}
              <NavLink
                to="/notifications"
                className="relative p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                <Bell className="w-5 h-5" />
                {hasUnread && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
                )}
              </NavLink>
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-semibold">
                    {getInitials(user?.firstName, user?.lastName)}
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                
                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-soft-lg border border-slate-200 dark:border-slate-700 py-2 z-50 animate-slide-down">
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {user?.email}
                        </p>
                      </div>
                      
                      <NavLink
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Users className="w-4 h-4" />
                        Profile
                      </NavLink>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
