import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatTime, getFullName } from '../../lib/utils';
import { QrCode, UserPlus, Users, Clock, LogIn, LogOut, Shield } from 'lucide-react';

function StatCard({ title, value, icon: Icon, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600',
    success: 'bg-success-100 dark:bg-success-900/30 text-success-600',
    warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-600',
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

export default function SecurityDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['security-dashboard'],
    queryFn: async () => {
      const response = await api.get('/dashboard/security');
      return response.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary-500" />
            Security Dashboard
          </h1>
          <p className="page-subtitle">Today's visitor activity overview</p>
        </div>
        <div className="flex gap-3">
          <Link to="/security/checkin" className="btn-primary">
            <QrCode className="w-5 h-5" />
            Scan QR
          </Link>
          <Link to="/security/walkin" className="btn-secondary">
            <UserPlus className="w-5 h-5" />
            Walk-In
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Expected Today"
          value={data?.stats?.expectedToday || 0}
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Currently In"
          value={data?.stats?.checkedInNow || 0}
          icon={LogIn}
          color="success"
        />
        <StatCard
          title="Checked Out"
          value={data?.stats?.checkedOutToday || 0}
          icon={LogOut}
          color="warning"
        />
        <StatCard
          title="Walk-Ins"
          value={data?.stats?.walkInsToday || 0}
          icon={UserPlus}
          color="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Currently Checked In */}
        <div className="card">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <LogIn className="w-5 h-5 text-success-500" />
              Currently Checked In ({data?.currentCheckedIn?.length || 0})
            </h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
            {data?.currentCheckedIn?.length > 0 ? (
              data.currentCheckedIn.map((visit) => (
                <div key={visit.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center text-success-600 font-semibold text-sm">
                      {visit.visitor?.firstName?.[0]}{visit.visitor?.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {getFullName(visit.visitor)}
                      </p>
                      <p className="text-sm text-slate-500">
                        Host: {getFullName(visit.hostEmployee)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      In: {formatTime(visit.actualTimeIn)}
                    </p>
                    <Link 
                      to={`/visits/${visit.id}`}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      View details →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                No visitors currently checked in
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Arrivals */}
        <div className="card">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" />
              Upcoming Arrivals
            </h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
            {data?.upcomingSlots?.length > 0 ? (
              data.upcomingSlots.map((visit) => (
                <div key={visit.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 font-semibold text-sm">
                      {visit.visitor?.firstName?.[0]}{visit.visitor?.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {getFullName(visit.visitor)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {visit.visitor?.company || 'No company'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary-600">
                      {formatTime(visit.scheduledTimeIn)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Host: {getFullName(visit.hostEmployee)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                No upcoming arrivals
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
