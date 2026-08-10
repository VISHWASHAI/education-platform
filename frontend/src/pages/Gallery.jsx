import { useEffect, useState } from 'react';
import { Plus, Trash2, ImageOff, X } from 'lucide-react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { Modal } from '../components/shared/Modal';
import { useAuth } from '../context/AuthContext';
import { ALL_STAFF } from '../constants/roles';

const MAX_BYTES = 5 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Gallery() {
  const { user } = useAuth();
  const canManage = ALL_STAFF.includes(user?.role);

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [viewing, setViewing] = useState(null);

  function load() {
    setLoading(true);
    api
      .get('/gallery')
      .then(({ data }) => setPhotos(data))
      .catch(() => setError('Could not load gallery'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    if (file.size > MAX_BYTES) {
      setUploadError('Image must be under 5MB');
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setPreview(dataUrl);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!preview) return;
    setUploading(true);
    setUploadError('');
    try {
      await api.post('/gallery', { caption, imageData: preview });
      setShowModal(false);
      setCaption('');
      setPreview('');
      load();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function remove(id) {
    await api.delete(`/gallery/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Gallery</h1>
          <p className="text-blue-100 mt-1">{photos.length} photos</p>
        </div>
        {canManage && (
          <PrimaryButton className="flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Upload Photo
          </PrimaryButton>
        )}
      </div>

      {error && <p className="text-danger">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : photos.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
            <ImageOff size={32} />
            <p>No photos yet.</p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((p) => (
            <div key={p.id} className="glass-card overflow-hidden group relative">
              <button onClick={() => setViewing(p)} className="block w-full">
                <img src={p.image_data} alt={p.caption || 'School photo'} className="w-full aspect-square object-cover cursor-zoom-in" />
              </button>
              {(p.caption || p.uploaded_by_name) && (
                <div className="p-3">
                  {p.caption && <p className="text-sm font-medium text-slate-900 truncate">{p.caption}</p>}
                  <p className="text-xs text-slate-500 mt-0.5">{new Date(p.created_at).toLocaleDateString()}</p>
                </div>
              )}
              {canManage && (
                <button
                  onClick={() => remove(p.id)}
                  title="Delete"
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-slate-500 hover:text-danger rounded-full p-1.5 shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Upload Photo" onClose={() => { setShowModal(false); setPreview(''); setCaption(''); setUploadError(''); }}>
          <form onSubmit={handleUpload} className="space-y-4">
            <label className="block">
              <span className="label-caps mb-2 block">Photo</span>
              <input type="file" accept="image/*" required onChange={handleFileChange} className="input-field" />
            </label>
            {preview && <img src={preview} alt="Preview" className="w-full rounded-lg border border-slate-200 object-cover max-h-64" />}
            <label className="block">
              <span className="label-caps mb-2 block">Caption (optional)</span>
              <input
                type="text"
                className="input-field"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Annual Day 2026…"
              />
            </label>
            {uploadError && <p className="text-sm text-danger">{uploadError}</p>}
            <PrimaryButton type="submit" className="w-full" disabled={uploading || !preview}>
              {uploading ? 'Uploading…' : 'Upload'}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 py-8"
          onClick={() => setViewing(null)}
        >
          <button
            onClick={() => setViewing(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors duration-200"
            aria-label="Close"
          >
            <X size={28} />
          </button>
          <div className="max-w-4xl max-h-full flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <img src={viewing.image_data} alt={viewing.caption || 'School photo'} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            {(viewing.caption || viewing.uploaded_by_name) && (
              <div className="text-center">
                {viewing.caption && <p className="text-white font-medium">{viewing.caption}</p>}
                <p className="text-white/60 text-sm mt-0.5">
                  {viewing.uploaded_by_name ? `Uploaded by ${viewing.uploaded_by_name} · ` : ''}
                  {new Date(viewing.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
