import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { formatDate, formatTime, formatStatus, getStatusColor, getFullName, formatPurpose } from '../../lib/utils';
import QRCode from 'react-qr-code';
import { 
  ArrowLeft, Mail, Phone, Building2, Calendar, Clock, User, 
  CheckCircle, XCircle, LogIn, LogOut, Loader2, QrCode 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VisitDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: visit, isLoading } = useQuery({
    queryKey: ['visit', id],
    queryFn: async () => {
      const response = await api.get(`/visits/${id}`);
      return response.data.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/visits/${id}/approve`),
    onSuccess: () => {
      toast.success('Visit approved');
      queryClient.invalidateQueries(['visit', id]);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason) => api.post(`/visits/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Visit rejected');
      queryClient.invalidateQueries(['visit', id]);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to reject'),
  });

  const checkInMutation = useMutation({
    mutationFn: () => api.post(`/visits/${id}/checkin`),
    onSuccess: () => {
      toast.success('Visitor checked in');
      queryClient.invalidateQueries(['visit', id]);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to check in'),
  });

  const checkOutMutation = useMutation({
    mutationFn: () => api.post(`/visits/${id}/checkout`),
    onSuccess: () => {
      toast.success('Visitor checked out');
      queryClient.invalidateQueries(['visit', id]);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to check out'),
  });

  const canApprove = ['ADMIN', 'PROCESS_ADMIN', 'SECURITY_MANAGER'].includes(user?.role);
  const canCheckIn = ['SECURITY_GUARD', 'SECURITY_MANAGER'].includes(user?.role);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="card p-6"><div className="skeleton h-48 w-full" /></div>
      </div>
    );
  }

  if (!visit) {
    return <div className="text-center py-12 text-slate-500">Visit not found</div>;
  }

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visit Status Card */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className={`${getStatusColor(visit.status)} text-sm`}>
                  {formatStatus(visit.status)}
                </span>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                  {visit.passNumber || 'Pending Pass'}
                </h1>
              </div>
              {visit.isWalkIn && (
                <span className="badge-warning">Walk-In</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">Scheduled Date</p>
                <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  {formatDate(visit.scheduledDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Time Slot</p>
                <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-500" />
                  {formatTime(visit.scheduledTimeIn)} - {formatTime(visit.scheduledTimeOut)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Purpose</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {formatPurpose(visit.purpose)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Guests</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {visit.numberOfGuests || 1} person(s)
                </p>
              </div>
            </div>

            {visit.purposeDetails && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 mb-1">Details</p>
                <p className="text-slate-700 dark:text-slate-300">{visit.purposeDetails}</p>
              </div>
            )}

            {/* Actions */}
            {visit.status === 'PENDING_APPROVAL' && canApprove && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="btn-success flex-1"
                >
                  {approveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Approve
                </button>
                <button
                  onClick={() => rejectMutation.mutate('Rejected by admin')}
                  disabled={rejectMutation.isPending}
                  className="btn-danger flex-1"
                >
                  {rejectMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                  Reject
                </button>
              </div>
            )}

            {visit.status === 'APPROVED' && canCheckIn && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                  className="btn-success w-full"
                >
                  {checkInMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  Check In Visitor
                </button>
              </div>
            )}

            {visit.status === 'CHECKED_IN' && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => checkOutMutation.mutate()}
                  disabled={checkOutMutation.isPending}
                  className="btn-warning w-full"
                >
                  {checkOutMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                  Check Out Visitor
                </button>
              </div>
            )}
          </div>

          {/* Visitor Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" /> Visitor Information
            </h2>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-xl">
                {visit.visitor?.firstName?.[0]}{visit.visitor?.lastName?.[0]}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="font-medium text-slate-900 dark:text-white">{getFullName(visit.visitor)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium text-slate-900 dark:text-white">{visit.visitor?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="font-medium text-slate-900 dark:text-white">{visit.visitor?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Company</p>
                  <p className="font-medium text-slate-900 dark:text-white">{visit.visitor?.company || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Host Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Host Employee</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold">
                {visit.hostEmployee?.firstName?.[0]}{visit.hostEmployee?.lastName?.[0]}
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{getFullName(visit.hostEmployee)}</p>
                <p className="text-sm text-slate-500">{visit.hostEmployee?.department || 'No department'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Sidebar */}
        <div className="space-y-6">
          {visit.qrCode && (
            <div className="card p-6 text-center">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-primary-500" /> Entry Pass
              </h2>
              <div className="bg-white p-4 rounded-xl inline-block">
                <QRCode value={visit.qrCode} size={180} />
              </div>
              <p className="mt-4 font-mono text-lg font-bold text-primary-600">
                {visit.passNumber}
              </p>
            </div>
          )}

          {/* Check-in/out Times */}
          {(visit.actualTimeIn || visit.actualTimeOut) && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Actual Times</h2>
              <div className="space-y-3">
                {visit.actualTimeIn && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Checked In</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatTime(visit.actualTimeIn)}
                    </span>
                  </div>
                )}
                {visit.actualTimeOut && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Checked Out</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatTime(visit.actualTimeOut)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
