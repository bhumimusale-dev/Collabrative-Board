import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { CreditCard, ShieldCheck, Zap, Award, AlertCircle } from 'lucide-react';

interface BillingPortalProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onPlanChanged?: () => void;
}

interface BillingDetails {
  plan: string;
  status: string;
  trial_ends_at: string;
  current_period_end: string;
  current_boards: number;
  board_limit: number;
  current_members: number;
  member_limit: number;
  storage_limit: string;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  invoice_url: string;
  created_at: string;
}

export const BillingPortal: React.FC<BillingPortalProps> = ({ teamId, isOpen, onClose, onPlanChanged }) => {
  const [details, setDetails] = useState<BillingDetails | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const bDetails = await api.getBillingDetails(teamId);
      setDetails(bDetails);

      const invList = await api.getInvoices(teamId);
      setInvoices(invList);
    } catch (e: any) {
      setError(e.message || 'Failed to load billing details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBillingData();
    }
  }, [isOpen, teamId]);

  const handleSubscribe = async (plan: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.subscribeToPlan(teamId, plan);
      alert(`Successfully subscribed to the ${plan.toUpperCase()} plan!`);
      if (onPlanChanged) onPlanChanged();
      await fetchBillingData();
    } catch (e: any) {
      setError(e.message || 'Subscription upgrade failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8">
        <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8 text-slate-100 max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <span>Workspace Billing & Plans</span>
              </h2>
              <p className="text-xs text-slate-400">Manage limits, subscription plans, and invoices</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all text-sm"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-xs text-slate-500">Loading billing portal...</span>
            </div>
          ) : (
            details && (
              <div className="space-y-8">
                
                {/* Active Plan & Limits Usage Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Active Plan Card */}
                  <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-850 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Plan</span>
                      <span className="text-2xl font-black capitalize text-indigo-400 mt-1 block">
                        {details.plan}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Status: <span className="text-emerald-400 font-semibold">{details.status}</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-4 block">
                      Renews on: {new Date(details.current_period_end).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Boards Usage Card */}
                  <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-850 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Boards Created</span>
                      <span className="text-xs font-bold text-slate-200">
                        {details.current_boards} / {details.board_limit > 9000 ? '∞' : details.board_limit}
                      </span>
                    </div>
                    <div className="w-full bg-slate-850 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (details.current_boards / details.board_limit) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 block">Boards limit per active workspace</span>
                  </div>

                  {/* Collaborators Usage Card */}
                  <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-850 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Team Collaborators</span>
                      <span className="text-xs font-bold text-slate-200">
                        {details.current_members} / {details.member_limit > 9000 ? '∞' : details.member_limit}
                      </span>
                    </div>
                    <div className="w-full bg-slate-850 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-purple-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (details.current_members / details.member_limit) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 block">Workspace storage limit: {details.storage_limit}</span>
                  </div>

                </div>

                {/* Plan Options Selector Grid */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Subscription Plans</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    
                    {/* Free Card */}
                    <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
                      details.plan === 'free' ? 'border-slate-700 bg-slate-950/20' : 'border-slate-850 bg-slate-950/10'
                    }`}>
                      <div>
                        <span className="text-xs font-bold text-slate-400">Free</span>
                        <div className="text-xl font-bold text-white mt-1">$0 <span className="text-xs text-slate-500">/mo</span></div>
                        <ul className="text-[10px] text-slate-400 mt-4 space-y-2">
                          <li>• Max 3 Boards</li>
                          <li>• Max 3 Members</li>
                          <li>• 50 MB Storage Limit</li>
                        </ul>
                      </div>
                      <button
                        onClick={() => handleSubscribe('free')}
                        disabled={details.plan === 'free' || submitting}
                        className="w-full mt-6 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-indigo-600/10 disabled:text-indigo-400 text-white font-semibold rounded-xl text-xs transition-all"
                      >
                        {details.plan === 'free' ? 'Active Plan' : 'Downgrade'}
                      </button>
                    </div>

                    {/* Pro Card */}
                    <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
                      details.plan === 'pro' ? 'border-indigo-500/40 bg-indigo-950/10' : 'border-slate-850 bg-slate-950/10'
                    }`}>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-indigo-400">Pro</span>
                          <Zap className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <div className="text-xl font-bold text-white mt-1">$15 <span className="text-xs text-slate-500">/mo</span></div>
                        <ul className="text-[10px] text-slate-400 mt-4 space-y-2">
                          <li>• Max 20 Boards</li>
                          <li>• Max 10 Members</li>
                          <li>• 1 GB Storage Limit</li>
                        </ul>
                      </div>
                      <button
                        onClick={() => handleSubscribe('pro')}
                        disabled={details.plan === 'pro' || submitting}
                        className="w-full mt-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/10 disabled:text-indigo-400 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10"
                      >
                        {details.plan === 'pro' ? 'Active Plan' : 'Choose Pro'}
                      </button>
                    </div>

                    {/* Business Card */}
                    <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
                      details.plan === 'business' ? 'border-purple-500/40 bg-purple-950/10' : 'border-slate-850 bg-slate-950/10'
                    }`}>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-purple-400">Business</span>
                          <Award className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div className="text-xl font-bold text-white mt-1">$49 <span className="text-xs text-slate-500">/mo</span></div>
                        <ul className="text-[10px] text-slate-400 mt-4 space-y-2">
                          <li>• Max 500 Boards</li>
                          <li>• Max 50 Members</li>
                          <li>• 10 GB Storage Limit</li>
                        </ul>
                      </div>
                      <button
                        onClick={() => handleSubscribe('business')}
                        disabled={details.plan === 'business' || submitting}
                        className="w-full mt-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/10 disabled:text-purple-400 text-white font-semibold rounded-xl text-xs transition-all"
                      >
                        {details.plan === 'business' ? 'Active Plan' : 'Choose Business'}
                      </button>
                    </div>

                    {/* Enterprise Card */}
                    <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
                      details.plan === 'enterprise' ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-850 bg-slate-950/10'
                    }`}>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-400">Enterprise</span>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div className="text-xl font-bold text-white mt-1">$299 <span className="text-xs text-slate-500">/mo</span></div>
                        <ul className="text-[10px] text-slate-400 mt-4 space-y-2">
                          <li>• Unlimited Boards</li>
                          <li>• Unlimited Members</li>
                          <li>• Unlimited Storage</li>
                        </ul>
                      </div>
                      <button
                        onClick={() => handleSubscribe('enterprise')}
                        disabled={details.plan === 'enterprise' || submitting}
                        className="w-full mt-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/10 disabled:text-emerald-400 text-white font-semibold rounded-xl text-xs transition-all"
                      >
                        {details.plan === 'enterprise' ? 'Active Plan' : 'Choose Enterprise'}
                      </button>
                    </div>

                  </div>
                </div>

                {/* Invoices History List */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment History & Invoices</h3>
                  {invoices.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No payment history found for this workspace.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                            <th className="py-2.5">Invoice ID</th>
                            <th className="py-2.5">Date</th>
                            <th className="py-2.5">Amount</th>
                            <th className="py-2.5">Status</th>
                            <th className="py-2.5 text-right font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr key={inv.id} className="border-b border-slate-850/60">
                              <td className="py-3 font-mono text-[10px]">{inv.id}</td>
                              <td className="py-3">{new Date(inv.created_at).toLocaleDateString()}</td>
                              <td className="py-3">${(inv.amount / 100).toFixed(2)}</td>
                              <td className="py-3">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold uppercase">
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <a 
                                  href={inv.invoice_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-indigo-400 hover:text-indigo-300 font-bold"
                                >
                                  View Invoice
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
export default BillingPortal;
