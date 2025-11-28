import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatDate, formatRole } from '../../lib/utils';
import { UserCheck, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PendingUsers() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => {
      const response = await api.get('/users/pending');
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/approve`),
    onSuccess: () => {
      toast.success('User approved');
      queryClient.invalidateQueries(['pending-users']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/reject`, { reason: 'Rejected by admin' }),
    onSuccess: () => {
      toast.success('User rejected');
      queryClient.invalidateQueries(['pending-users']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to reject'),
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <UserCheck className="w-7 h-7 text-warning-500" />
          Pending User Approvals
        </h1>
        <p className="page-subtitle">Review and approve new user registrations</p>
      </div>

      {/* Stats */}
      <div className="card p-4 mb-6 bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/50 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-warning-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{data?.count || 0}</p>
            <p className="text-sm text-slate-500">Pending approvals</p>
          </div>
        </div>
      </div>

      {/* Pending List */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="card p-6"><div className="skeleton h-20 w-full" /></div>
          ))
        ) : data?.data?.length > 0 ? (
          data.data.map((user) => (
            <div key={user.id} className="card p-6 hover:shadow-soft-lg transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span className="badge-primary">{formatRole(user.role)}</span>
                      {user.department && (
                        <span className="text-slate-600 dark:text-slate-300">
                          🏢 {user.department}
                        </span>
                      )}
                      {user.employeeId && (
                        <span className="text-slate-600 dark:text-slate-300 font-mono">
                          #{user.employeeId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Registered: {formatDate(user.createdAt, 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approveMutation.mutate(user.id)}
                    disabled={approveMutation.isPending}
                    className="btn-success"
                  >
                    {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(user.id)}
                    disabled={rejectMutation.isPending}
                    className="btn-danger"
                  >
                    {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card p-12 text-center">
            <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">All caught up!</h3>
            <p className="text-slate-500">No pending user approvals.</p>
          </div>
        )}
      </div>
    </div>
  );
}
