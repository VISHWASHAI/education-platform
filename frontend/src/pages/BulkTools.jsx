import { useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { api, downloadCsv, readFileAsText } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { FormInput } from '../components/shared/FormInput';
import { useAuth } from '../context/AuthContext';
import { ADMIN_TRIO } from '../constants/roles';

function ImportCard({ title, description, templateUrl, templateFilename, importUrl, onDone }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const csvText = await readFileAsText(file);
      const { data } = await api.post(importUrl, { csvText });
      setResult(data);
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <GlassCard>
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{description}</p>

      <button
        onClick={() => downloadCsv(templateUrl, {}, templateFilename)}
        className="text-xs font-semibold text-blue-600 hover:underline mt-3 inline-block"
      >
        Download CSV template
      </button>

      <div className="flex items-center gap-3 mt-4">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-900 file:text-xs"
        />
        <PrimaryButton className="flex items-center gap-2 !py-2 !px-4 text-sm" onClick={handleImport} disabled={!file || importing}>
          <Upload size={14} /> {importing ? 'Importing…' : 'Import'}
        </PrimaryButton>
      </div>

      {error && <p className="text-sm text-danger mt-3">{error}</p>}

      {result && (
        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm space-y-2">
          <p className="text-slate-900">
            Imported <span className="text-success font-semibold">{result.imported}</span>, skipped{' '}
            <span className="text-warning font-semibold">{result.skipped}</span>
          </p>
          {result.credentials?.length > 0 && (
            <div>
              <p className="label-caps mb-1">Temporary Credentials</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto text-xs text-slate-600">
                {result.credentials.map((c) => (
                  <li key={c.email}>{c.email}: {c.temporaryPassword}</li>
                ))}
              </ul>
            </div>
          )}
          {result.errors?.length > 0 && (
            <div>
              <p className="label-caps mb-1 text-danger">Errors</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto text-xs text-danger">
                {result.errors.map((e, i) => (
                  <li key={i}>Row {e.row}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function ExportRow({ label, onExport }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
      <span className="text-sm text-slate-700">{label}</span>
      <button onClick={onExport} className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
        <Download size={14} /> Export CSV
      </button>
    </div>
  );
}

export function BulkTools() {
  const { user } = useAuth();
  const [attendanceRange, setAttendanceRange] = useState({ dateFrom: '', dateTo: '' });

  if (!ADMIN_TRIO.includes(user?.role)) {
    return (
      <GlassCard>
        <p className="text-slate-600">Bulk import/export is restricted to administrators.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Bulk Import / Export</h1>
        <p className="text-slate-500 mt-1">Move data in and out of the portal via CSV</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImportCard
          title="Import Students"
          description="Bulk-add students. Duplicate admission numbers are skipped."
          templateUrl="/students/import-template"
          templateFilename="student_import_template.csv"
          importUrl="/students/bulk-import"
        />
        <ImportCard
          title="Import Teachers"
          description="Bulk-create teacher accounts. Temporary passwords are generated per row."
          templateUrl="/teachers/import-template"
          templateFilename="teacher_import_template.csv"
          importUrl="/teachers/bulk-import"
        />
      </div>

      <GlassCard>
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Exports</h3>
        <div className="space-y-3">
          <ExportRow label="All Students" onExport={() => downloadCsv('/students/export', {}, 'students_export.csv')} />
          <ExportRow label="All Teachers" onExport={() => downloadCsv('/teachers/export', {}, 'teachers_export.csv')} />
          <ExportRow label="All Fees" onExport={() => downloadCsv('/fees/export', {}, 'fees_export.csv')} />

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm text-slate-700">Attendance</span>
              <button
                onClick={() => downloadCsv('/attendance/export', attendanceRange, 'attendance_export.csv')}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="flex gap-3 mt-3">
              <FormInput
                type="date"
                placeholder="From"
                value={attendanceRange.dateFrom}
                onChange={(e) => setAttendanceRange({ ...attendanceRange, dateFrom: e.target.value })}
              />
              <FormInput
                type="date"
                placeholder="To"
                value={attendanceRange.dateTo}
                onChange={(e) => setAttendanceRange({ ...attendanceRange, dateTo: e.target.value })}
              />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
