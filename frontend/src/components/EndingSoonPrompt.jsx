import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { formatTime } from '../lib/utils';
import { Clock, Bell, Loader2, X } from 'lucide-react';

const EXTEND_OPTIONS = [15, 30, 45, 60];

export default function EndingSoonPrompt() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [notifiedIds, setNotifiedIds] = useState(new Set());
  const [dismissedIds, setDismissedIds] = useState(new Set());

  const isHostRole = user?.role === 'HOST_EMPLOYEE' || user?.role === 'PROCESS_ADMIN';

  const { data } = useQuery({
    queryKey: ['ending-soon'],
    queryFn: async () => {
      const response = await api.get('/visits/ending-soon');
      return response.data?.data || [];
    },
    enabled: isHostRole,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, minutes }) => api.post(`/visits/${id}/extend`, { minutes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['ending-soon']);
      setDismissedIds((prev) => new Set([...prev, selectedVisitId]));
      setSelectedVisitId(null);
    },
  });

  const visits = useMemo(
    () => (data || []).filter((v) => !dismissedIds.has(v.id)),
    [data, dismissedIds]
  );

  useEffect(() => {
    if (!isHostRole || !visits.length) return;

    // Request notification permission once
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const newIds = [];
    visits.forEach((visit) => {
      if (!notifiedIds.has(visit.id) && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const n = new Notification('Meeting ending soon', {
          body: `${visit.visitor.firstName} ${visit.visitor.lastName} visit ends at ${formatTime(visit.scheduledTimeOut)}. Extend?`,
        });
        n.onclick = () => {
          window.focus();
          setSelectedVisitId(visit.id);
        };
        newIds.push(visit.id);
      }
    });

    if (newIds.length) {
      setNotifiedIds((prev) => new Set([...prev, ...newIds]));
    }

    // Auto-select the soonest visit if none selected
    if (!selectedVisitId) {
      const candidate = visits.find((v) => !dismissedIds.has(v.id));
      if (candidate) {
        setSelectedVisitId(candidate.id);
      }
    }
  }, [visits, isHostRole, notifiedIds, selectedVisitId, dismissedIds]);

  const activeVisit = visits.find((v) => v.id === selectedVisitId);

  if (!isHostRole || !activeVisit) return null;

  return (
    <div className="modal-overlay flex items-center justify-center">
      <div className="modal-content p-6 w-full max-w-md">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-500" /> Meeting ending soon
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Visitor: {activeVisit.visitor.firstName} {activeVisit.visitor.lastName} · Ends at {formatTime(activeVisit.scheduledTimeOut)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDismissedIds((prev) => new Set([...prev, activeVisit.id]));
              setSelectedVisitId(null);
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4 text-primary-500" />
            {activeVisit.remainingMinutes} minutes remaining
          </div>

          <div>
            <label className="label">Extend by</label>
            <select
              value={selectedMinutes}
              onChange={(e) => setSelectedMinutes(Number(e.target.value))}
              className="select"
            >
              {EXTEND_OPTIONS.map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                if (activeVisit?.id) {
                  setDismissedIds((prev) => new Set([...prev, activeVisit.id]));
                }
                setSelectedVisitId(null);
              }}
              className="btn-secondary"
              type="button"
            >
              No, thanks
            </button>
            <button
              onClick={() => extendMutation.mutate({ id: activeVisit.id, minutes: selectedMinutes })}
              className="btn-primary"
              disabled={extendMutation.isPending}
              type="button"
            >
              {extendMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extending...
                </>
              ) : (
                'Extend'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
