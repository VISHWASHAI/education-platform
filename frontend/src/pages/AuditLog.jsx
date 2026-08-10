import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { FormInput } from '../components/shared/FormInput';
import { useAuth } from '../context/AuthContext';

const emptyFilters = { entity: '', action: '', dateFrom: '', dateTo: '' };
const ALLOWED_ROLES = ['super_admin', 'head_master'];

export function AuditLog() {
  const { user } = useAuth();
  const allowed = ALLOWED_ROLES.includes(user?.role);

  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!allowed) return;
    const timeout = setTimeout(() => {
      setLoading(true);
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      api
        .get('/audit-log', { params })
        .then(({ data }) => {
          setEntries(data.data);
          setTotal(data.total);
          setError('');
        })
        .catch(() => setError('Could not load audit log (admin access required)'))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [filters, allowed]);

  if (!allowed) {
    return (
      <GlassCard>
        <p className="text-slate-600">The audit log is restricted to administrators.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Audit Log</h1>
        <p className="text-blue-100 mt-1">{total} recorded actions</p>
      </div>

      <GlassCard>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <FormInput
            label="Entity"
            placeholder="students, exams, fees…"
            value={filters.entity}
            onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
          />
          <FormInput
            label="Action Contains"
            placeholder="POST, DELETE…"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          />
          <FormInput
            label="From"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
          <FormInput
            label="To"
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
        </div>

        {error && <p className="text-danger mb-4">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Time</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">User</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Action</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Entity</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-6 text-center text-slate-500">Loading…</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-slate-500">No matching entries</td></tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-blue-50 transition-colors duration-300">
                    <td className="py-3 text-slate-600 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="py-3 text-slate-900 font-medium">{e.user_name ?? 'Unknown'}</td>
                    <td className="py-3 text-slate-600 font-mono text-xs">{e.action}</td>
                    <td className="py-3 text-slate-600 capitalize">{e.entity}{e.entity_id ? ` #${e.entity_id}` : ''}</td>
                    <td className="py-3 text-slate-500 text-xs">{e.ip_address}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
