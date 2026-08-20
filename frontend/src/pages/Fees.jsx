import { useEffect, useState } from 'react';
import { Plus, DollarSign, TrendingUp, AlertCircle, Pencil, Trash2, CreditCard, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { FormInput } from '../components/shared/FormInput';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { IconButton } from '../components/shared/IconButton';
import { Modal } from '../components/shared/Modal';
import { StatCard } from '../components/shared/StatCard';
import { RevenueChart } from '../components/shared/RevenueChart';
import { useAuth } from '../context/AuthContext';
import { ADMIN_TRIO } from '../constants/roles';

const STATUS_COLORS = {
  unpaid: 'bg-danger/20 text-danger border-danger/40',
  partial: 'bg-warning/20 text-warning border-warning/40',
  paid: 'bg-success/20 text-success border-success/40',
};

const emptyAssignForm = { studentIds: '', feeCategoryId: '', amount: '', dueDate: '' };
const emptyCategoryForm = { name: '', description: '' };
const paymentForm0 = { amount: '', method: 'cash' };

export function Fees() {
  const { user } = useAuth();
  const canManageFees = ADMIN_TRIO.includes(user?.role);
  const isStudent = user?.role === 'student';

  const [fees, setFees] = useState([]);
  const [myFees, setMyFees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [assignError, setAssignError] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  const [showCategory, setShowCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);

  const [feeDetail, setFeeDetail] = useState(null);
  const [paymentForm, setPaymentForm] = useState(paymentForm0);
  const [savingPayment, setSavingPayment] = useState(false);
  const [editingFee, setEditingFee] = useState(false);
  const [editForm, setEditForm] = useState({ amount: '', dueDate: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const [studentFilter, setStudentFilter] = useState(null);

  const [payTarget, setPayTarget] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payResult, setPayResult] = useState(null);
  const [payError, setPayError] = useState('');

  function load() {
    if (!canManageFees && !isStudent) return;
    setLoading(true);
    const requests = canManageFees
      ? [api.get('/fees', { params: studentFilter ? { studentId: studentFilter.id } : {} }), api.get('/fee-categories'), api.get('/fees/summary')]
      : [api.get('/fees/my')];

    Promise.all(requests)
      .then((results) => {
        if (canManageFees) {
          setFees(results[0].data);
          setCategories(results[1].data);
          setSummary(results[2].data);
        } else {
          setMyFees(results[0].data);
        }
        setError('');
      })
      .catch(() => setError('Could not load fee data'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [studentFilter]);

  async function handleAssign(e) {
    e.preventDefault();
    setSavingAssign(true);
    setAssignError('');
    try {
      const studentIds = assignForm.studentIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (studentIds.length === 0) throw new Error('Enter at least one student ID');
      await api.post('/fees', {
        studentIds,
        feeCategoryId: assignForm.feeCategoryId,
        amount: Number(assignForm.amount),
        dueDate: assignForm.dueDate || null,
      });
      setShowAssign(false);
      setAssignForm(emptyAssignForm);
      load();
    } catch (err) {
      setAssignError(err.response?.data?.error || err.message || 'Could not assign fee');
    } finally {
      setSavingAssign(false);
    }
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    await api.post('/fee-categories', categoryForm);
    setShowCategory(false);
    setCategoryForm(emptyCategoryForm);
    load();
  }

  async function openFeeDetail(fee) {
    const { data } = await api.get(`/fees/${fee.id}`);
    setFeeDetail(data);
    setPaymentForm(paymentForm0);
    setEditingFee(false);
    setEditForm({ amount: data.amount, dueDate: data.due_date ? data.due_date.slice(0, 10) : '' });
  }

  async function saveFeeEdit(e) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const { data } = await api.put(`/fees/${feeDetail.id}`, {
        amount: Number(editForm.amount),
        dueDate: editForm.dueDate || null,
      });
      setFeeDetail((prev) => ({ ...prev, ...data }));
      setEditingFee(false);
      load();
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteFee() {
    if (!window.confirm('Delete this fee record? This cannot be undone.')) return;
    await api.delete(`/fees/${feeDetail.id}`);
    setFeeDetail(null);
    load();
  }

  async function recordPayment(e) {
    e.preventDefault();
    setSavingPayment(true);
    try {
      await api.post(`/fees/${feeDetail.id}/payments`, {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
      });
      const { data } = await api.get(`/fees/${feeDetail.id}`);
      setFeeDetail(data);
      setPaymentForm(paymentForm0);
      load();
    } finally {
      setSavingPayment(false);
    }
  }

  function openPay(fee) {
    setPayTarget(fee);
    setPayResult(null);
    setPayError('');
  }

  async function confirmPay() {
    setPaying(true);
    setPayError('');
    try {
      // Simulated gateway delay for the demo — no real payment provider is wired up yet.
      await new Promise((resolve) => setTimeout(resolve, 900));
      const { data } = await api.post(`/fees/${payTarget.id}/pay`);
      setPayResult(data);
      load();
    } catch (err) {
      setPayError(err.response?.data?.error || 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  if (!canManageFees && !isStudent) {
    return (
      <GlassCard>
        <p className="text-slate-600">Fee records aren't part of your role's access.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Fees</h1>
          <p className="text-blue-100 mt-1">{canManageFees ? 'Financial management' : 'Your fee balances'}</p>
        </div>
        {canManageFees && (
          <div className="flex gap-3">
            <PrimaryButton variant="secondary" onClick={() => setShowCategory(true)}>
              + Fee Category
            </PrimaryButton>
            <PrimaryButton className="flex items-center gap-2" onClick={() => setShowAssign(true)}>
              <Plus size={18} /> Assign Fee
            </PrimaryButton>
          </div>
        )}
      </div>

      {error && <p className="text-danger">{error}</p>}

      {canManageFees && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard title="Total Billed" value={`₹${summary.totalBilled.toLocaleString('en-IN')}`} icon={DollarSign} color="blue" />
          <StatCard title="Total Collected" value={`₹${summary.totalCollected.toLocaleString('en-IN')}`} icon={TrendingUp} color="green" />
          <StatCard title="Outstanding" value={`₹${summary.outstanding.toLocaleString('en-IN')}`} icon={AlertCircle} changeType="negative" color="red" />
        </div>
      )}

      {canManageFees && summary && (
        <GlassCard>
          <h3 className="text-xl font-semibold text-slate-800 mb-4">Revenue (last 12 months)</h3>
          <RevenueChart data={summary.revenueByMonth} />
        </GlassCard>
      )}

      <GlassCard>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xl font-semibold text-slate-800">
            {canManageFees ? (studentFilter ? `Fees for ${studentFilter.name}` : 'All Fees') : 'My Fees'}
          </h3>
          {canManageFees && studentFilter && (
            <button onClick={() => setStudentFilter(null)} className="text-xs font-semibold text-blue-600 hover:underline">
              Clear filter
            </button>
          )}
        </div>
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : (canManageFees ? fees : myFees).length === 0 ? (
          <p className="text-slate-500">No fee records found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200">
                {canManageFees && <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Student</th>}
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Category</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Amount</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Paid</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Status</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Due Date</th>
                {(canManageFees || isStudent) && <th className="py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {(canManageFees ? fees : myFees).map((f) => (
                <tr key={f.id} className="border-b border-slate-100 hover:bg-blue-50 transition-colors duration-300">
                  {canManageFees && (
                  <td className="py-3">
                    <button
                      onClick={() => setStudentFilter({ id: f.student_id, name: f.student_name })}
                      className="text-slate-900 font-medium hover:text-blue-600 hover:underline transition-colors duration-300"
                    >
                      {f.student_name}
                    </button>
                  </td>
                )}
                  <td className="py-3 text-slate-600">{f.category_name}</td>
                  <td className="py-3 text-slate-600">₹{Number(f.amount).toLocaleString('en-IN')}</td>
                  <td className="py-3 text-slate-600">₹{Number(f.amount_paid).toLocaleString('en-IN')}</td>
                  <td className="py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[f.status]}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600">{f.due_date ? new Date(f.due_date).toLocaleDateString() : '—'}</td>
                  {canManageFees && (
                    <td className="py-3 text-right">
                      <button onClick={() => openFeeDetail(f)} className="text-blue-600 hover:underline text-xs font-semibold">
                        Manage
                      </button>
                    </td>
                  )}
                  {isStudent && (
                    <td className="py-3 text-right">
                      {f.status !== 'paid' && (
                        <button
                          onClick={() => openPay(f)}
                          className="flex items-center gap-1 text-blue-700 hover:underline text-xs font-semibold ml-auto"
                        >
                          <CreditCard size={13} /> Pay Now
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>

      {showCategory && (
        <Modal title="New Fee Category" onClose={() => setShowCategory(false)}>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <FormInput label="Name" required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
            <FormInput label="Description" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
            <PrimaryButton type="submit" className="w-full">Create Category</PrimaryButton>
          </form>
          {categories.length > 0 && (
            <div className="mt-6">
              <p className="label-caps mb-2">Existing Categories</p>
              <ul className="space-y-1 text-sm text-slate-600">
                {categories.map((c) => <li key={c.id}>{c.name}</li>)}
              </ul>
            </div>
          )}
        </Modal>
      )}

      {showAssign && (
        <Modal title="Assign Fee" onClose={() => { setShowAssign(false); setAssignForm(emptyAssignForm); setAssignError(''); }}>
          <form onSubmit={handleAssign} className="space-y-4">
            <FormInput
              label="Student ID(s) — comma separated"
              placeholder="1, 2, 3"
              required
              value={assignForm.studentIds}
              onChange={(e) => setAssignForm({ ...assignForm, studentIds: e.target.value })}
            />
            <label className="block">
              <span className="label-caps mb-2 block">Fee Category</span>
              <select
                className="input-field"
                required
                value={assignForm.feeCategoryId}
                onChange={(e) => setAssignForm({ ...assignForm, feeCategoryId: e.target.value })}
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <FormInput
              label="Amount"
              type="number"
              min={0}
              step="0.01"
              required
              value={assignForm.amount}
              onChange={(e) => setAssignForm({ ...assignForm, amount: e.target.value })}
            />
            <FormInput
              label="Due Date"
              type="date"
              value={assignForm.dueDate}
              onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
            />
            {assignError && <p className="text-sm text-danger">{assignError}</p>}
            <PrimaryButton type="submit" className="w-full" disabled={savingAssign}>
              {savingAssign ? 'Assigning…' : 'Assign Fee'}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {feeDetail && (
        <Modal title={`${feeDetail.student_name} — ${feeDetail.category_name}`} onClose={() => setFeeDetail(null)}>
          <div className="space-y-6">
            {editingFee ? (
              <form onSubmit={saveFeeEdit} className="space-y-3">
                <div className="flex gap-3">
                  <FormInput
                    label="Amount"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  />
                  <FormInput
                    label="Due Date"
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  />
                </div>
                <div className="flex gap-3">
                  <PrimaryButton type="submit" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save'}</PrimaryButton>
                  <PrimaryButton type="button" variant="secondary" onClick={() => setEditingFee(false)}>Cancel</PrimaryButton>
                </div>
              </form>
            ) : (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <p><span className="text-slate-500">Amount:</span> ₹{Number(feeDetail.amount).toLocaleString('en-IN')}</p>
                  <div className="flex gap-2">
                    <IconButton icon={Pencil} variant="primary" title="Edit" onClick={() => setEditingFee(true)} />
                    <IconButton icon={Trash2} variant="danger" title="Delete" onClick={deleteFee} />
                  </div>
                </div>
                <p><span className="text-slate-500">Paid:</span> ₹{Number(feeDetail.amount_paid).toLocaleString('en-IN')}</p>
                <p><span className="text-slate-500">Balance:</span> ₹{(Number(feeDetail.amount) - Number(feeDetail.amount_paid)).toLocaleString('en-IN')}</p>
                <p><span className="text-slate-500">Due:</span> {feeDetail.due_date ? new Date(feeDetail.due_date).toLocaleDateString() : '—'}</p>
              </div>
            )}

            {feeDetail.status !== 'paid' && (
              <form onSubmit={recordPayment} className="space-y-3">
                <p className="label-caps">Record Payment</p>
                <div className="flex gap-3">
                  <FormInput
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Amount"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  />
                  <select
                    className="input-field"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="online">Online</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <PrimaryButton type="submit" className="w-full" disabled={savingPayment}>
                  {savingPayment ? 'Recording…' : 'Record Payment'}
                </PrimaryButton>
              </form>
            )}

            <div>
              <p className="label-caps mb-2">Payment History</p>
              {feeDetail.payments.length === 0 ? (
                <p className="text-slate-500 text-sm">No payments recorded yet.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {feeDetail.payments.map((p) => (
                    <li key={p.id} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm flex justify-between">
                      <span className="text-slate-900">₹{Number(p.amount).toLocaleString('en-IN')} · <span className="capitalize text-slate-500">{p.method.replace('_', ' ')}</span></span>
                      <span className="text-slate-500 text-xs">{p.receipt_no}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Modal>
      )}

      {payTarget && (
        <Modal title="Pay Fee" onClose={() => setPayTarget(null)}>
          {payResult ? (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="text-success" size={30} />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">Payment Successful</p>
                <p className="text-sm text-slate-500 mt-1">
                  ₹{Number(payResult.payment.amount).toLocaleString('en-IN')} paid for {payTarget.category_name}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-left space-y-1">
                <p><span className="text-slate-500">Receipt No:</span> {payResult.payment.receipt_no}</p>
                <p><span className="text-slate-500">Method:</span> Online</p>
                <p><span className="text-slate-500">Paid On:</span> {new Date(payResult.payment.paid_at).toLocaleString()}</p>
              </div>
              <PrimaryButton className="w-full" onClick={() => setPayTarget(null)}>Done</PrimaryButton>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
                <p><span className="text-slate-500">Category:</span> {payTarget.category_name}</p>
                <p><span className="text-slate-500">Total Amount:</span> ₹{Number(payTarget.amount).toLocaleString('en-IN')}</p>
                <p><span className="text-slate-500">Already Paid:</span> ₹{Number(payTarget.amount_paid).toLocaleString('en-IN')}</p>
                <p className="text-slate-900 font-semibold pt-1 border-t border-slate-200 mt-1">
                  Amount Due: ₹{(Number(payTarget.amount) - Number(payTarget.amount_paid)).toLocaleString('en-IN')}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Demo mode — this simulates a successful online payment. No real transaction is processed.
              </p>
              {payError && <p className="text-sm text-danger">{payError}</p>}
              <PrimaryButton className="w-full flex items-center justify-center gap-2" onClick={confirmPay} disabled={paying}>
                <CreditCard size={16} />
                {paying ? 'Processing Payment…' : `Pay ₹${(Number(payTarget.amount) - Number(payTarget.amount_paid)).toLocaleString('en-IN')}`}
              </PrimaryButton>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
