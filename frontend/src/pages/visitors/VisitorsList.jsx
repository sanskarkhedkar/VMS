import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatDate, getFullName, formatStatus, getStatusColor, truncate } from '../../lib/utils';
import { Search, Filter, UserPlus, Eye, MoreVertical, Building2 } from 'lucide-react';

export default function VisitorsList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['visitors', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      const response = await api.get(`/visitors?${params}`);
      return response.data;
    },
  });

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Visitors</h1>
          <p className="page-subtitle">Manage all visitors in the system</p>
        </div>
        <Link to="/visitors/invite" className="btn-primary">
          <UserPlus className="w-5 h-5" />
          Invite Visitor
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search visitors..."
              className="input pl-10"
            />
          </div>
          <button className="btn-secondary">
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>
      </div>

      {/* Visitors Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Last Visit</th>
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
                data.data.map((visitor) => (
                  <tr key={visitor.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold text-sm">
                          {visitor.firstName?.[0]}{visitor.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {visitor.firstName} {visitor.lastName}
                          </p>
                          {visitor.designation && (
                            <p className="text-sm text-slate-500">{visitor.designation}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {visitor.company || '-'}
                      </div>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{visitor.email}</td>
                    <td className="text-slate-600 dark:text-slate-300">{visitor.phone || '-'}</td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {visitor.visits?.[0] ? formatDate(visitor.visits[0].scheduledDate) : '-'}
                    </td>
                    <td>
                      {visitor.isBlacklisted ? (
                        <span className="badge-danger">Blacklisted</span>
                      ) : (
                        <span className="badge-success">Active</span>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/visitors/${visitor.id}`}
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
                    No visitors found
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
