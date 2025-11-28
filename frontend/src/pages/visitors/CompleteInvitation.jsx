import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { formatDate, formatTime } from '../../lib/utils';
import { Building2, Calendar, Clock, User, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CompleteInvitation() {
  const { token } = useParams();
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const response = await api.get(`/visitors/invitation/${token}`);
      return response.data.data;
    },
  });

  const { register, handleSubmit } = useForm();

  const mutation = useMutation({
    mutationFn: async (formData) => {
      return api.post(`/visitors/invitation/${token}/complete`, formData);
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to complete registration');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-danger-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Invalid or Expired Link
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            This invitation link is invalid or has already been used.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Registration Complete!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Your visit is now pending approval. You'll receive a confirmation email with your entry pass once approved.
          </p>
          <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong>Visit Date:</strong> {formatDate(data.visit.scheduledDate)}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong>Time:</strong> {formatTime(data.visit.scheduledTimeIn)} - {formatTime(data.visit.scheduledTimeOut)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Complete Your Registration
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            You've been invited for a visit
          </p>
        </div>

        {/* Visit Details Card */}
        <div className="card p-6 mb-6 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Visit Details</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-xs text-slate-500">Host</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {data.host.firstName} {data.host.lastName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-xs text-slate-500">Date</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {formatDate(data.visit.scheduledDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-xs text-slate-500">Time</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {formatTime(data.visit.scheduledTimeIn)} - {formatTime(data.visit.scheduledTimeOut)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit((formData) => mutation.mutate(formData))} className="card p-6">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Your Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                {...register('phone')}
                defaultValue={data.visitor.phone || ''}
                className="input"
                placeholder="+1234567890"
              />
            </div>
            
            <div>
              <label className="label">Company</label>
              <input
                type="text"
                {...register('company')}
                defaultValue={data.visitor.company || ''}
                className="input"
                placeholder="Your company name"
              />
            </div>
            
            <div>
              <label className="label">Designation</label>
              <input
                type="text"
                {...register('designation')}
                defaultValue={data.visitor.designation || ''}
                className="input"
                placeholder="Your job title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">ID Type</label>
                <select {...register('idType')} className="select">
                  <option value="">Select ID Type</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVERS_LICENSE">Driver's License</option>
                  <option value="NATIONAL_ID">National ID</option>
                  <option value="EMPLOYEE_ID">Employee ID</option>
                </select>
              </div>
              <div>
                <label className="label">ID Number</label>
                <input
                  type="text"
                  {...register('idNumber')}
                  className="input"
                  placeholder="ID Number"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary w-full mt-6"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Complete Registration
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
