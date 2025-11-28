import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  UserCheck,
  UserX,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, formatTime, getFullName, formatStatus, getStatusColor } from '../../lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

function StatCard({ title, value, icon: Icon, trend, trendValue, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400',
    warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400',
    danger: 'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400',
  };

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend === 'up' ? 'text-success-600' : 'text-danger-600'
            }`}>
              {trend === 'up' ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function VisitCard({ visit }) {
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors">
      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold text-sm">
        {visit.visitor?.firstName?.[0]}{visit.visitor?.lastName?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 dark:text-white truncate">
          {getFullName(visit.visitor)}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {visit.visitor?.company || 'No company'}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          {formatTime(visit.scheduledTimeIn)}
        </p>
        <span className={getStatusColor(visit.status)}>
          {formatStatus(visit.status)}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  
  // Fetch dashboard data based on role
  const endpoint = user?.role === 'ADMIN' 
    ? '/dashboard/admin' 
    : user?.role === 'HOST_EMPLOYEE'
    ? '/dashboard/host'
    : user?.role === 'SECURITY_GUARD'
    ? '/dashboard/security'
    : user?.role === 'SECURITY_MANAGER'
    ? '/dashboard/security-manager'
    : '/dashboard/stats';
  
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', user?.role],
    queryFn: async () => {
      const response = await api.get(endpoint);
      return response.data.data;
    },
  });

  const { data: trendsData } = useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: async () => {
      const response = await api.get('/dashboard/trends');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6 h-32">
              <div className="skeleton h-4 w-24 mb-2" />
              <div className="skeleton h-8 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = data?.stats || data || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="page-subtitle">
          Here's what's happening with your visitors today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user?.role === 'ADMIN' && (
          <>
            <StatCard
              title="Total Users"
              value={stats.totalUsers || 0}
              icon={Users}
              color="primary"
            />
            <StatCard
              title="Pending Approvals"
              value={stats.pendingUserApprovals || 0}
              icon={AlertCircle}
              color="warning"
            />
            <StatCard
              title="Today's Visits"
              value={stats.todayVisits || 0}
              icon={Calendar}
              color="success"
            />
            <StatCard
              title="Checked In Now"
              value={stats.checkedInNow || 0}
              icon={UserCheck}
              color="primary"
            />
          </>
        )}

        {user?.role === 'HOST_EMPLOYEE' && (
          <>
            <StatCard
              title="My Total Visitors"
              value={stats.totalMyVisitors || 0}
              icon={Users}
              color="primary"
            />
            <StatCard
              title="Today Scheduled"
              value={stats.todayScheduled || 0}
              icon={Calendar}
              color="success"
            />
            <StatCard
              title="Pending Approval"
              value={stats.pendingApproval || 0}
              icon={Clock}
              color="warning"
            />
            <StatCard
              title="Currently Here"
              value={stats.checkedInNow || 0}
              icon={UserCheck}
              color="primary"
            />
          </>
        )}

        {(user?.role === 'SECURITY_GUARD' || user?.role === 'SECURITY_MANAGER') && (
          <>
            <StatCard
              title="Expected Today"
              value={stats.expectedToday || 0}
              icon={Calendar}
              color="primary"
            />
            <StatCard
              title="Checked In"
              value={stats.checkedInNow || 0}
              icon={UserCheck}
              color="success"
            />
            <StatCard
              title="Checked Out"
              value={stats.checkedOutToday || 0}
              icon={UserX}
              color="warning"
            />
            <StatCard
              title="Walk-Ins Today"
              value={stats.walkInsToday || 0}
              icon={Users}
              color="primary"
            />
          </>
        )}

        {user?.role === 'PROCESS_ADMIN' && (
          <>
            <StatCard
              title="Pending Approvals"
              value={stats.pendingApprovals || 0}
              icon={AlertCircle}
              color="warning"
            />
            <StatCard
              title="Approved Today"
              value={stats.approvedToday || 0}
              icon={CheckCircle}
              color="success"
            />
            <StatCard
              title="Rejected Today"
              value={stats.rejectedToday || 0}
              icon={UserX}
              color="danger"
            />
          </>
        )}
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visits Trend Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Visit Trends
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Last 30 days
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendsData?.dailyTrend || []}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => formatDate(val, 'MMM d')}
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                  labelFormatter={(val) => formatDate(val, 'MMMM d, yyyy')}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Purpose Distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Visit Purposes
          </h2>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trendsData?.purposeDistribution?.map((p, i) => ({
                    name: p.purpose,
                    value: p._count?.purpose || 0,
                  })) || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {trendsData?.purposeDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="space-y-2 mt-4">
            {trendsData?.purposeDistribution?.slice(0, 4).map((item, index) => (
              <div key={item.purpose} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-slate-600 dark:text-slate-400">
                    {item.purpose?.charAt(0) + item.purpose?.slice(1).toLowerCase()}
                  </span>
                </div>
                <span className="font-medium text-slate-900 dark:text-white">
                  {item._count?.purpose || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent/Upcoming Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Visits */}
        <div className="card">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {user?.role === 'HOST_EMPLOYEE' ? 'My Upcoming Visits' : 'Upcoming Visits'}
              </h2>
              <Link 
                to="/visits" 
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {(data?.upcomingVisits || []).slice(0, 5).map((visit) => (
              <VisitCard key={visit.id} visit={visit} />
            ))}
            {(!data?.upcomingVisits || data.upcomingVisits.length === 0) && (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No upcoming visits
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity / Pending */}
        <div className="card">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {user?.role === 'ADMIN' ? 'Recent Users' : 'Recent Visits'}
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {user?.role === 'ADMIN' && data?.recentUsers?.map((u) => (
              <div key={u.id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm">
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {u.email}
                  </p>
                </div>
                <span className={getStatusColor(u.status)}>
                  {formatStatus(u.status)}
                </span>
              </div>
            ))}
            {user?.role !== 'ADMIN' && (data?.recentVisits || []).slice(0, 5).map((visit) => (
              <VisitCard key={visit.id} visit={visit} />
            ))}
            {(user?.role === 'ADMIN' ? !data?.recentUsers?.length : !data?.recentVisits?.length) && (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
