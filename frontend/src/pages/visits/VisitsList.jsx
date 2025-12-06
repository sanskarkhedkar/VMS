import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { formatDate, formatTime, getFullName, formatStatus, getStatusColor, formatPurpose } from '../../lib/utils';
import { Search, Filter, Calendar, Eye, UserPlus } from 'lucide-react';

export default function VisitsList() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const endpoint = user?.role === 'HOST_EMPLOYEE' ? '/visits/my-visits' : '/visits';

  const { data, isLoading } = useQuery({
    queryKey: ['visits', search, status, page, user?.role],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      const response = await api.get(`${endpoint}?${params}`);
      return response.data;
    },
  });

  const statuses = [
    { value: '', label: 'All Statuses' },
    { value: 'INVITED', label: 'Invited' },
    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'CHECKED_IN', label: 'Checked In' },
    { value: 'MEETING_OVER', label: 'Meeting Over' },
    { value: 'CHECKED_OUT', label: 'Checked Out' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">
            {user?.role === 'HOST_EMPLOYEE' ? 'My Visits' : 'All Visits'}
          </h1>
          <p className="page-subtitle">View and manage visitor appointments</p>
        </div>
        {user?.role === 'HOST_EMPLOYEE' && (
          <Link to="/visitors/invite" className="btn-primary">
            <UserPlus className="w-5 h-5" />
            Invite Visitor
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by visitor name or pass number..."
              className="input pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="select w-auto"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Visits Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Pass #</th>
                <th>Visitor</th>
                <th>Host</th>
                <th>Purpose</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="skeleton h-12 w-full" />
                    </td>
                  </tr>
                ))
              ) : data?.data?.length > 0 ? (
                data.data.map((visit) => (
                  <tr key={visit.id}>
                    <td>
                      <span className="font-mono text-sm text-primary-600 dark:text-primary-400">
                        {visit.passNumber || '-'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold text-xs">
                          {visit.visitor?.firstName?.[0]}{visit.visitor?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">
                            {getFullName(visit.visitor)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {visit.visitor?.company || 'No company'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-slate-600 dark:text-slate-300">
                      {getFullName(visit.hostEmployee)}
                    </td>
                    <td className="text-sm text-slate-600 dark:text-slate-300">
                      {formatPurpose(visit.purpose)}
                    </td>
                    <td>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {formatDate(visit.scheduledDate)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatTime(visit.scheduledTimeIn)} - {formatTime(visit.scheduledTimeOut)}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span className={getStatusColor(visit.status)}>
                        {formatStatus(visit.status)}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/visits/${visit.id}`}
                        className="btn-ghost btn-sm"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No visits found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.pagination.total)} of {data.pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data.pagination.pages}
                className="btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
