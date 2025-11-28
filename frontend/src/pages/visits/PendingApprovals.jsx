import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatDate, formatTime, getFullName, formatPurpose } from '../../lib/utils';
import { CheckCircle, XCircle, Eye, Loader2, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PendingApprovals() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['pending-visits'],
    queryFn: async () => {
      const response = await api.get('/visits/pending-approval');
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.post(`/visits/${id}/approve`),
    onSuccess: () => {
      toast.success('Visit approved');
      queryClient.invalidateQueries(['pending-visits']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => api.post(`/visits/${id}/reject`, { reason: 'Rejected' }),
    onSuccess: () => {
      toast.success('Visit rejected');
      queryClient.invalidateQueries(['pending-visits']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to reject'),
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Clock className="w-7 h-7 text-warning-500" />
          Pending Approvals
        </h1>
        <p className="page-subtitle">Review and approve visitor requests</p>
      </div>

      {/* Stats */}
      <div className="card p-4 mb-6 bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/50 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-warning-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {data?.count || 0}
            </p>
            <p className="text-sm text-slate-500">Pending approvals</p>
          </div>
        </div>
      </div>

      {/* Pending List */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="skeleton h-24 w-full" />
            </div>
          ))
        ) : data?.data?.length > 0 ? (
          data.data.map((visit) => (
            <div key={visit.id} className="card p-6 hover:shadow-soft-lg transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold">
                    {visit.visitor?.firstName?.[0]}{visit.visitor?.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {getFullName(visit.visitor)}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {visit.visitor?.company || 'No company'} • {visit.visitor?.email}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        📅 {formatDate(visit.scheduledDate)}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        ⏰ {formatTime(visit.scheduledTimeIn)} - {formatTime(visit.scheduledTimeOut)}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        📋 {formatPurpose(visit.purpose)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      Host: {getFullName(visit.hostEmployee)} ({visit.hostEmployee?.department})
                    </p>
                    {visit.isWalkIn && (
                      <span className="badge-warning mt-2">Walk-In</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link to={`/visits/${visit.id}`} className="btn-ghost btn-sm">
                    <Eye className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => approveMutation.mutate(visit.id)}
                    disabled={approveMutation.isPending}
                    className="btn-success btn-sm"
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(visit.id)}
                    disabled={rejectMutation.isPending}
                    className="btn-danger btn-sm"
                  >
                    {rejectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card p-12 text-center">
            <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              All caught up!
            </h3>
            <p className="text-slate-500">No pending approvals at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
