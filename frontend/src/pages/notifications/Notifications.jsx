import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatRelativeTime } from '../../lib/utils';
import { Bell, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/mark-all-read'),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      toast.success('Notification deleted');
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const getTypeIcon = (type) => {
    const icons = {
      VISITOR_ARRIVED: '👋',
      VISIT_APPROVED: '✅',
      VISIT_REJECTED: '❌',
      USER_APPROVAL_REQUIRED: '👤',
      VISIT_APPROVAL_REQUIRED: '📋',
      WALKIN_APPROVAL_REQUIRED: '🚶',
      REQUEST_PROCESSED: '📝',
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Bell className="w-7 h-7 text-primary-500" />
            Notifications
          </h1>
          <p className="page-subtitle">Stay updated with your activities</p>
        </div>
        {data?.data?.some(n => !n.isRead) && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="btn-secondary btn-sm"
          >
            {markAllReadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="card p-4"><div className="skeleton h-16 w-full" /></div>
          ))
        ) : data?.data?.length > 0 ? (
          data.data.map((notification) => (
            <div
              key={notification.id}
              className={`card p-4 transition-all ${
                notification.isRead 
                  ? 'bg-white dark:bg-slate-800' 
                  : 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl">{getTypeIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          className="btn-ghost btn-sm btn-icon"
                          title="Mark as read"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(notification.id)}
                        className="btn-ghost btn-sm btn-icon text-danger-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card p-12 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No notifications</h3>
            <p className="text-slate-500">You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
