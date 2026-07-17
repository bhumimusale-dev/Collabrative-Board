import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError(null);
    try {
      // Create random client fingerprint for device sessions
      const reqPayload = {
        email: data.email,
        password: data.password,
        device_id: 'device_' + Math.random().toString(36).substr(2, 9),
        device_name: navigator.userAgent.substring(0, 30),
      };

      await login(reqPayload);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 flex items-center justify-center font-sans px-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-purple-600 flex items-center justify-center shadow-lg shadow-teal-500/10 mb-4">
            <span className="text-xl font-bold text-white">CX</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Sign in to CollabBoard X</h2>
          <p className="text-sm text-slate-400 mt-1">Access your boards and workspaces</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-600 text-red-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-teal-400 hover:text-teal-300 font-semibold">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-sm"
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-teal-400 hover:text-teal-300 font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
