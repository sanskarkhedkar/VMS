import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../lib/api';
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    if (!token || !email) {
      toast.error('Invalid reset link');
      return;
    }
    
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password: data.password,
      });
      setSuccess(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="animate-fade-in text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display mb-3">
          Invalid Reset Link
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          This password reset link is invalid or has expired.
        </p>
        <Link to="/forgot-password" className="btn-primary inline-flex">
          Request New Link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-success-600 dark:text-success-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display mb-3">
          Password Reset Complete
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Your password has been successfully reset. You can now log in with your new password.
        </p>
        <Link to="/login" className="btn-primary inline-flex">
          Continue to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
          Set new password
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="password" className="label">New Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className={errors.password ? 'input-error pr-10' : 'input pr-10'}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-danger-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            className={errors.confirmPassword ? 'input-error' : 'input'}
            placeholder="••••••••"
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-danger-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <KeyRound className="w-5 h-5" />
              Reset Password
            </>
          )}
        </button>
      </form>
    </div>
  );
}
