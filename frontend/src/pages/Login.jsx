import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Zap, LayoutGrid, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: ShieldCheck, title: 'Secure Access', desc: 'Your data is protected with role-based access control.' },
  { icon: Zap, title: 'Smart & Efficient', desc: 'Powerful tools to simplify your daily operations.' },
  { icon: LayoutGrid, title: 'All in One Platform', desc: 'Students, teachers, attendance, exams and more — in one place.' },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@eduflow.test');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showResetNote, setShowResetNote] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8" style={{ background: 'linear-gradient(160deg, #1a1f6e 0%, #12154d 100%)' }}>
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl">
        {/* Left panel */}
        <div className="hidden lg:flex relative flex-col justify-center px-10 py-12 text-white overflow-hidden" style={{ background: 'linear-gradient(160deg, #1a1f6e 0%, #0d1040 100%)' }}>
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} aria-hidden="true" />

          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-8">
              <GraduationCap size={26} />
            </div>
            <h2 className="text-3xl font-bold text-wrap-balance">Welcome Back!</h2>
            <p className="text-white/70 mt-3 text-sm leading-relaxed max-w-sm">
              Sign in to access your institution dashboard and manage everything seamlessly.
            </p>

            <div className="mt-10 space-y-6">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-white/60 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <svg className="absolute bottom-0 left-0 right-0 opacity-25" viewBox="0 0 400 90" fill="none" aria-hidden="true">
            <rect x="10" y="30" width="40" height="60" fill="white" />
            <rect x="55" y="10" width="34" height="80" fill="white" />
            <circle cx="72" cy="26" r="8" fill="none" stroke="white" strokeWidth="2" />
            <rect x="95" y="45" width="28" height="45" fill="white" />
            <rect x="150" y="20" width="46" height="70" fill="white" />
            <rect x="205" y="38" width="30" height="52" fill="white" />
            <rect x="245" y="15" width="38" height="75" fill="white" />
            <rect x="290" y="42" width="26" height="48" fill="white" />
            <rect x="325" y="24" width="40" height="66" fill="white" />
          </svg>
        </div>

        {/* Right panel */}
        <div className="bg-white px-6 py-10 sm:px-10 sm:py-12 flex flex-col justify-center">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="People's Education Society emblem" className="w-20 h-20 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-bold text-slate-900">People's Education Society</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="label-caps mb-2 block">Email</span>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="input-field pl-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="label-caps mb-2 block">Password</span>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pl-11 pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={() => setShowResetNote((v) => !v)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Forgot Password?
              </button>
            </div>
            {showResetNote && (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 -mt-3">
                Please contact your school administrator to reset your password.
              </p>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}
            <PrimaryButton type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign In'}
            </PrimaryButton>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">© 2026 People's Education Society. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
