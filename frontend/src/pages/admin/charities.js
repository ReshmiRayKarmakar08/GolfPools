import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { charitiesAPI } from '../../utils/api';
import { IconHeart, IconStar } from '../../components/icons/Icons';

export default function AdminCharitiesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // null | 'new' | charity object
  const { register, handleSubmit, reset, setValue } = useForm();

  const { data: charities } = useQuery('adminCharities', () => charitiesAPI.getAll(), {
    select: (r) => r.data.charities,
  });

  const createMutation = useMutation(charitiesAPI.create, {
    onSuccess: () => { qc.invalidateQueries('adminCharities'); toast.success('Charity created'); setEditing(null); reset(); },
    onError: (e) => toast.error(e.response?.data?.error || 'Create failed'),
  });

  const updateMutation = useMutation(({ id, data }) => charitiesAPI.update(id, data), {
    onSuccess: () => { qc.invalidateQueries('adminCharities'); toast.success('Charity updated'); setEditing(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Update failed'),
  });

  const deleteMutation = useMutation(charitiesAPI.delete, {
    onSuccess: () => { qc.invalidateQueries('adminCharities'); toast.success('Charity deactivated'); },
    onError: () => toast.error('Failed to deactivate'),
  });

  const openEdit = (charity) => {
    setEditing(charity);
    if (charity !== 'new') {
      Object.entries(charity).forEach(([k, v]) => setValue(k, v));
    } else {
      reset();
    }
  };

  const onSubmit = (data) => {
    if (editing === 'new') createMutation.mutate(data);
    else updateMutation.mutate({ id: editing.id, data });
  };

  const CATEGORIES = ['Children', 'Education', 'Elderly Care', 'Environment', 'Food & Nutrition', 'Mental Health', 'Healthcare', 'Other'];

  return (
    <DashboardLayout title="Charities Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl">Charities</h2>
            <p className="text-dark-400 text-sm">{charities?.length || 0} active charities</p>
          </div>
          <button onClick={() => openEdit('new')} className="btn-primary px-5 py-2.5">
            + Add Charity
          </button>
        </div>

        {/* Edit / Create form */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-card p-6 border border-brand-500/20">
                <h3 className="text-white font-semibold mb-5">
                  {editing === 'new' ? 'Add New Charity' : `Edit: ${editing.name}`}
                </h3>
                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Name *</label>
                    <input {...register('name', { required: true })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Category</label>
                    <select {...register('category')} className="input-field">
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-dark-300 mb-2">Short Description</label>
                    <input {...register('short_description')} className="input-field" placeholder="One-line tagline" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-dark-300 mb-2">Full Description</label>
                    <textarea {...register('description')} className="input-field resize-none" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Contact Email</label>
                    <input {...register('contact_email')} type="email" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Website</label>
                    <input {...register('website_url')} type="url" className="input-field" placeholder="https://" />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Logo URL</label>
                    <input {...register('logo_url')} type="url" className="input-field" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Registration No.</label>
                    <input {...register('registration_number')} className="input-field" />
                  </div>
                  {editing !== 'new' && (
                    <>
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-dark-300">Featured</label>
                        <input {...register('is_featured')} type="checkbox" className="w-4 h-4 accent-brand-500" />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-dark-300">Active</label>
                        <input {...register('is_active')} type="checkbox" className="w-4 h-4 accent-brand-500" />
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2 flex gap-3 mt-2">
                    <button type="button" onClick={() => setEditing(null)} className="btn-secondary flex-1 py-3">Cancel</button>
                    <button type="submit" disabled={createMutation.isLoading || updateMutation.isLoading} className="btn-primary flex-1 py-3">
                      {createMutation.isLoading || updateMutation.isLoading ? 'Saving…' : editing === 'new' ? 'Create Charity' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Charities grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {charities?.map((c) => (
            <motion.div key={c.id} className="glass-card-hover p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center"><IconHeart className="text-green-400" size={20} /></div>
                  <div>
                    <div className="text-white font-semibold text-sm">{c.name}</div>
                    <div className="text-dark-500 text-xs">{c.category}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {c.is_featured && <span className="badge-warning flex items-center gap-1"><IconStar className="text-yellow-400" size={12} /> Featured</span>}
                  <span className={c.is_active ? 'badge-success' : 'badge-error'}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <p className="text-dark-400 text-xs mb-3 leading-relaxed line-clamp-2">{c.short_description}</p>
              <div className="flex items-center justify-between text-xs mb-4">
                <span className="text-dark-600">Raised: <span className="text-brand-400 font-mono">₹{(c.total_raised || 0).toLocaleString('en-IN')}</span></span>
                <span className="text-dark-600">{c.supporter_count || 0} supporters</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="btn-secondary flex-1 py-1.5 text-xs">Edit</button>
                <button
                  onClick={() => { if (confirm(`Deactivate ${c.name}?`)) deleteMutation.mutate(c.id); }}
                  className="btn-danger flex-1 py-1.5 text-xs"
                >
                  Deactivate
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
