import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/authStore';
import { Eye, EyeOff, UserPlus, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['HOST_EMPLOYEE', 'PROCESS_ADMIN', 'SECURITY_GUARD', 'SECURITY_MANAGER']),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  employeeId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const roleOptions = [
  { value: 'HOST_EMPLOYEE', label: 'Host Employee' },
  { value: 'PROCESS_ADMIN', label: 'Process Admin' },
  { value: 'SECURITY_GUARD', label: 'Security Guard' },
  { value: 'SECURITY_MANAGER', label: 'Security Manager' },
];

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signup, isLoading } = useAuthStore();
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'HOST_EMPLOYEE',
    },
  });

  const onSubmit = async (data) => {
    const { confirmPassword, ...signupData } = data;
    const result = await signup(signupData);
    
    if (result.success) {
      setSuccess(true);
    } else {
      toast.error(result.error);
    }
  };

  if (success) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-success-600 dark:text-success-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display mb-3">
          Registration Submitted
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Your account is pending approval. You'll receive an email once an administrator has reviewed your request.
        </p>
        <Link to="/login" className="btn-primary inline-flex">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
          Create an account
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Register to access the visitor management system
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Name Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="label">First Name</label>
            <input
              id="firstName"
              type="text"
              {...register('firstName')}
              className={errors.firstName ? 'input-error' : 'input'}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-danger-600">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="label">Last Name</label>
            <input
              id="lastName"
              type="text"
              {...register('lastName')}
              className={errors.lastName ? 'input-error' : 'input'}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-danger-600">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Email */}
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
            <p className="mt-1 text-xs text-danger-600">{errors.email.message}</p>
          )}
        </div>

        {/* Role */}
        <div>
          <label htmlFor="role" className="label">Role</label>
          <select
            id="role"
            {...register('role')}
            className={errors.role ? 'select input-error' : 'select'}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.role && (
            <p className="mt-1 text-xs text-danger-600">{errors.role.message}</p>
          )}
        </div>

        {/* Department & Employee ID */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="department" className="label">Department</label>
            <input
              id="department"
              type="text"
              {...register('department')}
              className="input"
              placeholder="Engineering"
            />
          </div>
          <div>
            <label htmlFor="employeeId" className="label">Employee ID</label>
            <input
              id="employeeId"
              type="text"
              {...register('employeeId')}
              className="input"
              placeholder="EMP001"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="label">Password</label>
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
            <p className="mt-1 text-xs text-danger-600">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
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
            <p className="mt-1 text-xs text-danger-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              Create Account
            </>
          )}
        </button>
      </form>

      {/* Login Link */}
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-primary-600 hover:text-primary-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
