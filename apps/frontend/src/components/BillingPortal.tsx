import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  Award, 
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle,
  Download
} from 'lucide-react';

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

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export const BillingPortal: React.FC<BillingPortalProps> = ({ teamId, isOpen, onClose, onPlanChanged }) => {
  const [details, setDetails] = useState<BillingDetails | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Billing Cycle Toggle (monthly / yearly)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Checkout flow state
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'none' | 'method' | 'processing' | 'success'>('none');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'paypal' | 'gplay' | 'razorpay'>('razorpay');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto renewal state
  const [autoRenew, setAutoRenew] = useState(true);

  // Seat management state
  const [seatsCount, setSeatsCount] = useState(3);

  // Payment details forms
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCVC, setNewCardCVC] = useState('');
  const [newCardName, setNewCardName] = useState('');

  const [savedCards, setSavedCards] = useState<SavedCard[]>([
    { id: 'card_1', brand: 'Visa', last4: '4242', expMonth: 12, expYear: 2028, isDefault: true },
    { id: 'card_2', brand: 'Mastercard', last4: '5555', expMonth: 8, expYear: 2029, isDefault: false },
  ]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBillingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const bDetails = await api.getBillingDetails(teamId);
      setDetails(bDetails);
      if (bDetails) {
        setSeatsCount(bDetails.current_members || 3);
      }

      const invList = await api.getInvoices(teamId);
      setInvoices(invList || []);
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

  const handleOpenCheckout = (plan: string) => {
    if (plan === details?.plan) return;
    setSelectedPlan(plan);
    setCheckoutStep('method');
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCompletePayment = async () => {
    if (!selectedPlan) return;
    setCheckoutStep('processing');
    setError(null);
    try {
      if (paymentMethod === 'razorpay') {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Failed to load Razorpay SDK. Check your internet connection.');
        }

        // 1. Create order on backend
        const orderData = await api.createRazorpayOrder(teamId, selectedPlan, billingCycle);

        // 2. Open Razorpay checkout modal
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "CollabBoard",
          description: `Subscription Upgrade to ${selectedPlan.toUpperCase()}`,
          order_id: orderData.order_id,
          handler: async function (response: any) {
            setCheckoutStep('processing');
            try {
              // 3. Verify payment signature on backend
              await api.verifyRazorpayPayment({
                team_id: teamId,
                plan: selectedPlan,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature || 'mock_sig_ok',
              });

              setCheckoutStep('success');
              showToast(`Successfully subscribed to ${selectedPlan.toUpperCase()}!`);
              if (onPlanChanged) onPlanChanged();
              await fetchBillingData();
            } catch (e: any) {
              setError(e.message || 'Razorpay payment verification failed.');
              setCheckoutStep('method');
            }
          },
          prefill: {
            name: "Jane Doe",
            email: "johndoe@example.com",
            contact: "9999999999"
          },
          theme: {
            color: "#6366f1",
          },
          modal: {
            ondismiss: function () {
              setCheckoutStep('method');
              showToast("Payment cancelled by user.", "error");
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Fallback standard subscription direct flow
        await api.subscribeToPlan(teamId, selectedPlan);
        setCheckoutStep('success');
        showToast(`Successfully subscribed to ${selectedPlan.toUpperCase()} plan!`);
        if (onPlanChanged) onPlanChanged();
        await fetchBillingData();
      }
    } catch (e: any) {
      setError(e.message || 'Subscription upgrade failed.');
      setCheckoutStep('method');
    }
  };

  const handleCancelSubscription = async () => {
    const confirm = window.confirm("Are you sure you want to cancel your subscription auto-renewal?");
    if (!confirm) return;
    setSubmitting(true);
    try {
      setAutoRenew(false);
      showToast("Auto-renewal cancelled successfully.", "success");
    } catch (e) {
      showToast("Cancellation failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardNumber || !newCardExpiry || !newCardCVC) {
      showToast("Please fill all card fields.", "error");
      return;
    }
    const last4 = newCardNumber.slice(-4) || '1111';
    const brand = newCardNumber.startsWith('5') ? 'Mastercard' : 'Visa';
    const newCard: SavedCard = {
      id: `card_${Date.now()}`,
      brand,
      last4,
      expMonth: parseInt(newCardExpiry.split('/')[0]) || 12,
      expYear: parseInt(newCardExpiry.split('/')[1]) || 2028,
      isDefault: savedCards.length === 0,
    };
    setSavedCards([...savedCards, newCard]);
    setNewCardNumber('');
    setNewCardExpiry('');
    setNewCardCVC('');
    setNewCardName('');
    showToast("Card added successfully!");
  };

  const handleRemoveCard = (cardId: string) => {
    setSavedCards(savedCards.filter(c => c.id !== cardId));
    showToast("Card removed successfully.");
  };

  const handleSetDefaultCard = (cardId: string) => {
    setSavedCards(savedCards.map(c => ({
      ...c,
      isDefault: c.id === cardId
    })));
    showToast("Default payment card updated.");
  };

  const getPlanPrice = (plan: string) => {
    const prices: Record<string, { monthly: number; yearly: number }> = {
      free: { monthly: 0, yearly: 0 },
      pro: { monthly: 15, yearly: 12 },
      business: { monthly: 49, yearly: 39 },
      enterprise: { monthly: 299, yearly: 239 },
    };
    const rate = prices[plan] || { monthly: 0, yearly: 0 };
    return billingCycle === 'monthly' ? rate.monthly : rate.yearly;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <CheckCircle className={`w-4 h-4 ${toast.type === 'success' ? 'text-emerald-400' : 'text-rose-500'}`} />
          <span className="text-xs font-semibold text-slate-200">{toast.message}</span>
        </div>
      )}

      <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8">
        <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8 text-slate-100 max-h-[92vh] overflow-y-auto">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <span>Workspace Plan & Billing</span>
              </h2>
              <p className="text-xs text-slate-400">Upgrade features, manage credit cards, seats and invoices</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all text-sm font-semibold"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-300">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="text-center py-24">
              <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"></div>
              <span className="text-xs text-slate-500 font-medium">Loading billing data...</span>
            </div>
          ) : (
            details && (
              <div className="space-y-8 animate-in fade-in duration-300">
                
                {/* Upper Usage Analytics Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Subscription summary */}
                  <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-850/60 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Subscription Status</span>
                      <span className="text-2xl font-black capitalize text-indigo-400 mt-1 block">
                        {details.plan} Plan
                      </span>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] text-emerald-400 font-bold uppercase">{details.status}</span>
                        </div>
                        {details.plan !== 'free' && (
                          <button 
                            onClick={handleCancelSubscription}
                            className="text-[9px] text-rose-400 hover:text-rose-300 font-bold underline"
                          >
                            Cancel Plan
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Auto-renew:</span>
                        <button 
                          onClick={() => setAutoRenew(!autoRenew)}
                          className={`px-2 py-0.5 rounded font-bold uppercase ${autoRenew ? 'bg-indigo-600/10 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}
                        >
                          {autoRenew ? 'On' : 'Off'}
                        </button>
                      </div>
                      <span className="text-[9px] text-slate-500 block mt-2">
                        Next charge on: {new Date(details.current_period_end).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Storage usage details */}
                  <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-850/60 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Storage Occupied</span>
                      <span className="text-xs font-bold text-slate-200">12.5 MB / {details.plan === 'free' ? '50 MB' : details.plan === 'pro' ? '50 GB' : 'Unlimited'}</span>
                    </div>
                    <div className="w-full bg-slate-850 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${details.plan === 'free' ? 25 : 5}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[9px] text-slate-500">Workspace documents & uploads</span>
                      {details.plan === 'free' && (
                        <span className="text-[9px] text-indigo-400 font-extrabold uppercase animate-pulse">Upgrade advised</span>
                      )}
                    </div>
                  </div>

                  {/* Team seat counters */}
                  <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-850/60 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Team Seats</span>
                      <span className="text-xs font-bold text-slate-200">{seatsCount} Seats Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSeatsCount(Math.max(1, seatsCount - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-850 hover:bg-slate-800 flex items-center justify-center text-xs font-bold transition-all"
                      >
                        -
                      </button>
                      <button 
                        onClick={() => setSeatsCount(seatsCount + 1)}
                        className="w-8 h-8 rounded-lg bg-slate-850 hover:bg-slate-800 flex items-center justify-center text-xs font-bold transition-all"
                      >
                        +
                      </button>
                      <div className="ml-auto text-right">
                        <span className="text-[10px] text-slate-500 block">Total cost / mo</span>
                        <span className="text-sm font-bold text-white">${seatsCount * getPlanPrice(details.plan)} USD</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-500 block">Seats correspond to active member roles</span>
                  </div>

                </div>

                {/* Subscriptions Plans Selector */}
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Subscription Plans</h3>
                    <div className="flex items-center gap-2 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800">
                      <button 
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Monthly
                      </button>
                      <button 
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${billingCycle === 'yearly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Yearly (-20%)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    
                    {/* Free Plan */}
                    <div className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 transition-all duration-300 hover:scale-[1.01] ${
                      details.plan === 'free' ? 'border-slate-700 bg-slate-950/30' : 'border-slate-850 bg-slate-950/10'
                    }`}>
                      <div className="space-y-4">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Free</span>
                        <div className="text-2xl font-black text-white">$0 <span className="text-xs font-normal text-slate-500">/mo</span></div>
                        <ul className="text-xs text-slate-400 space-y-2 pt-2 text-left">
                          <li className="flex items-center gap-2">✓ 3 Board Limit</li>
                          <li className="flex items-center gap-2">✓ 3 Members</li>
                          <li className="flex items-center gap-2">✓ 50 MB Storage</li>
                        </ul>
                      </div>
                      <button 
                        disabled
                        className="w-full py-2.5 bg-slate-800 disabled:opacity-50 text-slate-400 font-bold rounded-xl text-xs"
                      >
                        {details.plan === 'free' ? 'Current Plan' : 'Free Tier'}
                      </button>
                    </div>

                    {/* Pro Plan */}
                    <div className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 transition-all duration-300 hover:scale-[1.01] ${
                      details.plan === 'pro' ? 'border-indigo-500 bg-indigo-950/20' : 'border-slate-850 bg-slate-950/10'
                    }`}>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Pro</span>
                          <Zap className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="text-2xl font-black text-white">
                          ${billingCycle === 'monthly' ? 15 : 12} 
                          <span className="text-xs font-normal text-slate-500">/mo</span>
                        </div>
                        <ul className="text-xs text-slate-400 space-y-2 pt-2 text-left">
                          <li className="flex items-center gap-2">✓ 20 Board Limit</li>
                          <li className="flex items-center gap-2">✓ 10 Members</li>
                          <li className="flex items-center gap-2">✓ 1 GB Storage</li>
                          <li className="flex items-center gap-2">✓ Version History</li>
                        </ul>
                      </div>
                      <button 
                        onClick={() => handleOpenCheckout('pro')}
                        disabled={details.plan === 'pro' || submitting}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/10 disabled:text-indigo-400 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/15"
                      >
                        {details.plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                      </button>
                    </div>

                    {/* Business Plan */}
                    <div className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 transition-all duration-300 hover:scale-[1.01] ${
                      details.plan === 'business' ? 'border-purple-500 bg-purple-950/20' : 'border-slate-850 bg-slate-950/10'
                    }`}>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400">Business</span>
                          <Award className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="text-2xl font-black text-white">
                          ${billingCycle === 'monthly' ? 49 : 39} 
                          <span className="text-xs font-normal text-slate-500">/mo</span>
                        </div>
                        <ul className="text-xs text-slate-400 space-y-2 pt-2 text-left">
                          <li className="flex items-center gap-2">✓ 500 Board Limit</li>
                          <li className="flex items-center gap-2">✓ 50 Members</li>
                          <li className="flex items-center gap-2">✓ 10 GB Storage</li>
                          <li className="flex items-center gap-2">✓ SSO Ready</li>
                        </ul>
                      </div>
                      <button 
                        onClick={() => handleOpenCheckout('business')}
                        disabled={details.plan === 'business' || submitting}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/10 disabled:text-purple-400 text-white font-bold rounded-xl text-xs transition-all"
                      >
                        {details.plan === 'business' ? 'Current Plan' : 'Upgrade Business'}
                      </button>
                    </div>

                    {/* Enterprise Plan */}
                    <div className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 transition-all duration-300 hover:scale-[1.01] ${
                      details.plan === 'enterprise' ? 'border-emerald-500 bg-emerald-950/20' : 'border-slate-850 bg-slate-950/10'
                    }`}>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Enterprise</span>
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-black text-white">
                          ${billingCycle === 'monthly' ? 299 : 239} 
                          <span className="text-xs font-normal text-slate-500">/mo</span>
                        </div>
                        <ul className="text-xs text-slate-400 space-y-2 pt-2 text-left">
                          <li className="flex items-center gap-2">✓ Unlimited Everything</li>
                          <li className="flex items-center gap-2">✓ Premium Support</li>
                          <li className="flex items-center gap-2">✓ Admin Dashboard</li>
                          <li className="flex items-center gap-2">✓ Audit Log Access</li>
                        </ul>
                      </div>
                      <button 
                        onClick={() => handleOpenCheckout('enterprise')}
                        disabled={details.plan === 'enterprise' || submitting}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/10 disabled:text-emerald-400 text-white font-bold rounded-xl text-xs transition-all"
                      >
                        {details.plan === 'enterprise' ? 'Current Plan' : 'Upgrade Enterprise'}
                      </button>
                    </div>

                  </div>
                </div>

                {/* Saved Payment Methods & Card Creator Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-800/80">
                  
                  {/* Saved Cards lists */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Saved Payment Methods</h3>
                    {savedCards.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4">No credit cards saved.</p>
                    ) : (
                      <div className="space-y-3">
                        {savedCards.map(c => (
                          <div key={c.id} className="p-4 rounded-2xl bg-slate-950/30 border border-slate-850 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-7 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-400 uppercase">
                                {c.brand}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-white block">•••• •••• •••• {c.last4}</span>
                                <span className="text-[10px] text-slate-500 block">Expires {c.expMonth}/{c.expYear}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {c.isDefault ? (
                                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-extrabold uppercase">Default</span>
                              ) : (
                                <button 
                                  onClick={() => handleSetDefaultCard(c.id)}
                                  className="text-[9px] text-slate-500 hover:text-slate-300 font-semibold"
                                >
                                  Make Default
                                </button>
                              )}
                              <button 
                                onClick={() => handleRemoveCard(c.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add card payment form */}
                  <form onSubmit={handleAddCard} className="p-5 rounded-2xl bg-slate-950/20 border border-slate-850/60 space-y-4 text-left">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Add New Card</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Cardholder Name</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Jane Doe"
                          value={newCardName}
                          onChange={(e) => setNewCardName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Card Number</label>
                        <input 
                          type="text" 
                          required
                          placeholder="4242 4242 4242 4242"
                          value={newCardNumber}
                          onChange={(e) => setNewCardNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Expiry (MM/YY)</label>
                          <input 
                            type="text" 
                            required
                            placeholder="12/28"
                            value={newCardExpiry}
                            onChange={(e) => setNewCardExpiry(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1">CVC / CVV</label>
                          <input 
                            type="password" 
                            required
                            maxLength={3}
                            placeholder="•••"
                            value={newCardCVC}
                            onChange={(e) => setNewCardCVC(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Card</span>
                    </button>
                  </form>

                </div>

                {/* Invoices History Table */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Billing History & Invoices</h3>
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
                                  className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center justify-end gap-1"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>PDF Invoice</span>
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

      {/* Checkout overlay modal */}
      {checkoutStep !== 'none' && selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setCheckoutStep('none')} />
          
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6 text-slate-100 text-left">
            
            {/* Header */}
            <div>
              <h3 className="text-base font-bold text-white">Upgrade Subscription</h3>
              <p className="text-xs text-slate-400 mt-1">Configure your upgrade details to subscribe to {selectedPlan.toUpperCase()}</p>
            </div>

            {checkoutStep === 'method' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Billing details review */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Plan selection:</span>
                    <span className="font-bold text-white capitalize">{selectedPlan}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Billing cycle:</span>
                    <span className="font-bold text-white capitalize">{billingCycle}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-slate-800 pt-2 mt-2 font-bold">
                    <span>Due today:</span>
                    <span className="text-indigo-400">${getPlanPrice(selectedPlan)} USD</span>
                  </div>
                </div>

                {/* Select payment method */}
                <div className="space-y-2.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Select Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'razorpay', name: 'Razorpay' },
                      { key: 'card', name: 'Saved Card' },
                      { key: 'upi', name: 'UPI / NetBanking' },
                      { key: 'paypal', name: 'PayPal' },
                      { key: 'gplay', name: 'Google / Apple Pay' },
                    ].map(pm => (
                      <button
                        key={pm.key}
                        type="button"
                        onClick={() => setPaymentMethod(pm.key as any)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                          paymentMethod === pm.key 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-transparent border-slate-800 hover:bg-slate-850'
                        }`}
                      >
                        {pm.name}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'card' && savedCards.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-bold text-slate-500 block">Select Saved Card</label>
                    <select className="w-full px-3 py-2 rounded-xl border border-slate-850 bg-slate-950 text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      {savedCards.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.brand} (•••• {c.last4})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setCheckoutStep('none')} 
                    className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCompletePayment}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/10"
                  >
                    Complete Payment
                  </button>
                </div>
                {paymentMethod === 'razorpay' && (
                  <div className="text-center pt-3 border-t border-slate-800/40">
                    <button
                      type="button"
                      onClick={async () => {
                        setCheckoutStep('processing');
                        try {
                          await api.verifyRazorpayPayment({
                            team_id: teamId,
                            plan: selectedPlan,
                            razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substr(2, 9),
                            razorpay_order_id: "order_mock_" + Math.random().toString(36).substr(2, 9),
                            razorpay_signature: "mock_sig_ok",
                          });
                          setCheckoutStep('success');
                          showToast(`Successfully subscribed to ${selectedPlan.toUpperCase()} (Simulated)!`);
                          if (onPlanChanged) onPlanChanged();
                          await fetchBillingData();
                        } catch (e: any) {
                          setError(e.message || 'Simulated verification failed.');
                          setCheckoutStep('method');
                        }
                      }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline"
                    >
                      Having trouble? Click here to simulate test payment success directly
                    </button>
                  </div>
                )}
              </div>
            )}

            {checkoutStep === 'processing' && (
              <div className="py-8 text-center space-y-3 animate-in fade-in duration-200">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                <h4 className="text-xs font-bold text-slate-300">Processing Subscription Upgrade...</h4>
                <p className="text-[10px] text-slate-500">Contacting billing gateway. Please do not close or reload.</p>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-300">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Upgrade Succeeded!</h4>
                  <p className="text-xs text-slate-400 mt-1">Thank you. Your workspace is now upgraded to {selectedPlan.toUpperCase()}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setCheckoutStep('none')}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
export default BillingPortal;
