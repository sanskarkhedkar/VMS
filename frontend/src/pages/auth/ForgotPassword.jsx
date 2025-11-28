import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../lib/api';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
});

export default function ForgotPassword() {
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setSuccess(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-success-600 dark:text-success-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display mb-3">
          Check your email
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          If your email exists in our system, you'll receive a password reset link shortly.
        </p>
        <Link to="/login" className="btn-primary inline-flex">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Link 
        to="/login"
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
          Forgot password?
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          No worries, we'll send you reset instructions.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">Email Address</label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className={errors.email ? 'input-error' : 'input'}
            placeholder="you@company.com"
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-danger-600">{errors.email.message}</p>
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
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-5 h-5" />
              Send Reset Link
            </>
          )}
        </button>
      </form>
    </div>
  );
}
