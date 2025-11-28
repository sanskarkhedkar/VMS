import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { formatRole, getInitials } from '../../lib/utils';
import { User, Mail, Phone, Building2, Lock, Save, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPassword, formState: { errors: passwordErrors } } = useForm();

  const passwordMutation = useMutation({
    mutationFn: (data) => api.put('/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      resetPassword();
      setChangingPassword(false);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to change password'),
  });

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">View and manage your account settings</p>
      </div>

      {/* Profile Card */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-3xl">
            {getInitials(user?.firstName, user?.lastName)}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </h2>
            <span className="badge-primary mt-2">{formatRole(user?.role)}</span>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Email</p>
            <p className="font-medium text-slate-900 dark:text-white">{user?.email}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
            <Phone className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Phone</p>
            <p className="font-medium text-slate-900 dark:text-white">{user?.phone || 'Not set'}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Department</p>
            <p className="font-medium text-slate-900 dark:text-white">{user?.department || 'Not set'}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Employee ID</p>
            <p className="font-medium text-slate-900 dark:text-white font-mono">{user?.employeeId || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary-500" />
            Change Password
          </h3>
          {!changingPassword && (
            <button onClick={() => setChangingPassword(true)} className="btn-secondary btn-sm">
              Change
            </button>
          )}
        </div>

        {changingPassword && (
          <form onSubmit={handlePasswordSubmit((data) => passwordMutation.mutate(data))} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  {...registerPassword('currentPassword', { required: 'Current password required' })}
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-xs text-danger-600">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="label">New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                {...registerPassword('newPassword', {
                  required: 'New password required',
                  minLength: { value: 8, message: 'Minimum 8 characters' },
                })}
                className="input"
              />
              {passwordErrors.newPassword && (
                <p className="mt-1 text-xs text-danger-600">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={passwordMutation.isPending} className="btn-primary">
                {passwordMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Password
              </button>
              <button type="button" onClick={() => { setChangingPassword(false); resetPassword(); }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        )}

        {!changingPassword && (
          <p className="text-sm text-slate-500">
            Your password was last changed on your account creation. It's recommended to change your password periodically.
          </p>
        )}
      </div>
    </div>
  );
}
