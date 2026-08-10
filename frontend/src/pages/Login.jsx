import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/shared/GlassCard';
import { FormInput } from '../components/shared/FormInput';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@eduflow.test');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <GlassCard className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="People's Education Society emblem" className="w-32 h-32 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-slate-900">People's Education Society</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
          <div className="flex flex-col items-center mt-6 pt-6 border-t border-slate-100">
            <img
              src="/founder.png"
              alt="Founder"
              className="w-32 h-32 rounded-full object-cover object-top border-2 border-slate-200 shadow-sm mx-auto"
            />
            <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase mt-2">Founder</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.edu"
            required
          />
          <FormInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <PrimaryButton type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </PrimaryButton>
        </form>
      </GlassCard>
    </div>
  );
}
