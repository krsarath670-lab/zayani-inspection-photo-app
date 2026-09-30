import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, UserCheck, AlertCircle, Building2, HardHat, CheckCircle2 } from 'lucide-react';

export default function LoginModal() {
  const { login } = useAuth();
  const [email, setEmail] = useState('sarath@zayani.com');
  const [password, setPassword] = useState('sarath123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const setTestAccount = (testEmail, testPass) => {
    setEmail(testEmail);
    setPassword(testPass);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden my-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white text-center relative">
          <div className="w-16 h-16 bg-blue-600/30 border border-blue-400/40 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md shadow-inner">
            <Building2 className="w-9 h-9 text-blue-400" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">ZAYANI</h2>
          <p className="text-blue-300 font-medium text-xs tracking-wider uppercase mt-0.5">Maintenance Reporting System</p>
          <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-200 text-xs px-2.5 py-1 rounded-full mt-3 border border-blue-400/30">
            <Shield className="w-3.5 h-3.5" /> 207 Housing Buildings Project
          </div>
        </div>

        {/* Form Container */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@zayani.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  <span>Log In to ZAYANI Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Test Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center mb-3">Quick 1-Click Logins</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTestAccount('sarath@zayani.com', 'sarath123')}
                className={`p-2 rounded-xl border text-left text-xs transition cursor-pointer ${email === 'sarath@zayani.com' ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="flex items-center gap-1 font-semibold text-[11px] truncate">
                  <HardHat className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Site Eng.</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">Sarath KR</div>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount('technician@zayani.com', 'tech123')}
                className={`p-2 rounded-xl border text-left text-xs transition cursor-pointer ${email === 'technician@zayani.com' ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="flex items-center gap-1 font-semibold text-[11px] truncate">
                  <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Technician</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">Mohammed J.</div>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount('inspector@zayani.com', 'insp123')}
                className={`p-2 rounded-xl border text-left text-xs transition cursor-pointer ${email === 'inspector@zayani.com' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="flex items-center gap-1 font-semibold text-[11px] truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Inspector</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">Ali Hassan</div>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount('admin@zayani.com', 'admin123')}
                className={`p-2 rounded-xl border text-left text-xs transition cursor-pointer ${email === 'admin@zayani.com' ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="flex items-center gap-1 font-semibold text-[11px] truncate">
                  <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Admin</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">Project Lead</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
