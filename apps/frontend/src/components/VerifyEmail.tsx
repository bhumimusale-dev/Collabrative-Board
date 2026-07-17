import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const doVerify = async () => {
      if (!token) {
        setError('Verification token is missing in the URL.');
        setVerifying(false);
        return;
      }
      try {
        await api.verifyEmail(token);
        setSuccess(true);
      } catch (e: any) {
        setError(e.message || 'Verification failed. The token may be invalid or expired.');
      } finally {
        setVerifying(false);
      }
    };
    doVerify();
  }, [token]);

  return (
    <div className="w-full min-h-screen bg-white flex items-center justify-center font-sans px-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-[#F8FAFB] border border-[#E2E5E9] shadow-2xl text-center">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-purple-600 flex items-center justify-center shadow-lg shadow-teal-500/10 mb-4">
            <span className="text-xl font-bold text-[#1A1D21]">CX</span>
          </div>
          <h2 className="text-2xl font-bold text-[#1A1D21]">Email Verification</h2>
          <p className="text-sm text-[#5F6B7A] mt-1">CollabBoard X security check</p>
        </div>

        {verifying && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
            <p className="text-[#5F6B7A] text-sm font-medium">Verifying your email address...</p>
          </div>
        )}

        {!verifying && error && (
          <div className="space-y-6">
            <div className="p-4 bg-red-500/10 border border-red-600 text-red-400 text-sm rounded-2xl">
              {error}
            </div>
            <Link
              to="/login"
              className="block w-full py-3 px-4 rounded-xl bg-[#E2E5E9] hover:bg-slate-700 text-[#1A1D21] font-semibold text-sm transition-all"
            >
              Go to Login
            </Link>
          </div>
        )}

        {!verifying && success && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-2xl">
              Your email has been verified successfully! You can now use all features of CollabBoard X.
            </div>
            <Link
              to="/login"
              className="block w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-[#1A1D21] font-semibold text-sm shadow-md transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
