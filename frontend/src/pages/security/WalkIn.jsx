import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { UserPlus, Loader2, CheckCircle, Search, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const walkInSchema = z.object({
  visitorEmail: z.string().email('Valid email required'),
  visitorFirstName: z.string().min(1, 'First name required'),
  visitorLastName: z.string().min(1, 'Last name required'),
  visitorPhone: z.string().optional(),
  visitorCompany: z.string().optional(),
  hostEmployeeId: z.string().min(1, 'Host employee required'),
  purpose: z.enum(['MEETING', 'INTERVIEW', 'DELIVERY', 'MAINTENANCE', 'PERSONAL', 'OFFICIAL', 'OTHER']),
  purposeDetails: z.string().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
});

export default function WalkIn() {
  const [success, setSuccess] = useState(false);
  const [hostSearch, setHostSearch] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(walkInSchema),
    defaultValues: {
      purpose: 'MEETING',
    },
  });

  const selectedHostId = watch('hostEmployeeId');

  // Search hosts
  const { data: hosts, isLoading: hostsLoading } = useQuery({
    queryKey: ['hosts', hostSearch],
    queryFn: async () => {
      const params = hostSearch ? `?search=${hostSearch}` : '';
      const response = await api.get(`/users/hosts${params}`);
      return response.data.data;
    },
  });

  // Create walk-in
  const mutation = useMutation({
    mutationFn: (data) => api.post('/visits/walkin', data),
    onSuccess: () => {
      setSuccess(true);
      toast.success('Walk-in registered! Awaiting host approval.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to register walk-in');
    },
  });

  const selectedHost = hosts?.find(h => h.id === selectedHostId);

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 animate-fade-in">
        <div className="w-20 h-20 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-success-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Walk-In Registered!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          The host employee has been notified. Once approved, you can proceed with check-in.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setSuccess(false)}
            className="btn-primary"
          >
            <UserPlus className="w-5 h-5" />
            Register Another
          </button>
          <button
            onClick={() => navigate('/security')}
            className="btn-secondary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <UserPlus className="w-7 h-7 text-primary-500" />
          Walk-In Visitor
        </h1>
        <p className="page-subtitle">Register an unscheduled visitor</p>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="card p-6 space-y-6">
        {/* Visitor Details */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Visitor Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input
                type="text"
                {...register('visitorFirstName')}
                className={errors.visitorFirstName ? 'input-error' : 'input'}
              />
              {errors.visitorFirstName && (
                <p className="mt-1 text-xs text-danger-600">{errors.visitorFirstName.message}</p>
              )}
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input
                type="text"
                {...register('visitorLastName')}
                className={errors.visitorLastName ? 'input-error' : 'input'}
              />
            </div>
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                {...register('visitorEmail')}
                className={errors.visitorEmail ? 'input-error' : 'input'}
              />
              {errors.visitorEmail && (
                <p className="mt-1 text-xs text-danger-600">{errors.visitorEmail.message}</p>
              )}
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                {...register('visitorPhone')}
                className="input"
              />
            </div>
            <div>
              <label className="label">Company</label>
              <input
                type="text"
                {...register('visitorCompany')}
                className="input"
              />
            </div>
            <div>
              <label className="label">Purpose</label>
              <select {...register('purpose')} className="select">
                <option value="MEETING">Meeting</option>
                <option value="INTERVIEW">Interview</option>
                <option value="DELIVERY">Delivery</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="PERSONAL">Personal</option>
                <option value="OFFICIAL">Official</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* ID Verification */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="label">ID Type</label>
              <select {...register('idType')} className="select">
                <option value="">Select ID Type</option>
                <option value="PASSPORT">Passport</option>
                <option value="DRIVERS_LICENSE">Driver's License</option>
                <option value="NATIONAL_ID">National ID</option>
              </select>
            </div>
            <div>
              <label className="label">ID Number</label>
              <input
                type="text"
                {...register('idNumber')}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Host Selection */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Select Host Employee *
          </h3>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={hostSearch}
              onChange={(e) => setHostSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="input pl-10"
            />
          </div>

          {selectedHost && (
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                  {selectedHost.firstName?.[0]}{selectedHost.lastName?.[0]}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {selectedHost.firstName} {selectedHost.lastName}
                  </p>
                  <p className="text-sm text-slate-500">{selectedHost.department}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setValue('hostEmployeeId', '')}
                className="text-sm text-danger-600 hover:underline"
              >
                Change
              </button>
            </div>
          )}

          {!selectedHost && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {hostsLoading ? (
                <div className="col-span-2 text-center py-4 text-slate-500">Loading...</div>
              ) : hosts?.length > 0 ? (
                hosts.map((host) => (
                  <button
                    key={host.id}
                    type="button"
                    onClick={() => setValue('hostEmployeeId', host.id)}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      {host.firstName?.[0]}{host.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                        {host.firstName} {host.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{host.department}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 text-slate-500">
                  No hosts found
                </div>
              )}
            </div>
          )}
          
          {errors.hostEmployeeId && (
            <p className="mt-2 text-sm text-danger-600">{errors.hostEmployeeId.message}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Register Walk-In
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
