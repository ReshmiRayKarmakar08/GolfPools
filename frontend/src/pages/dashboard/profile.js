import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { usersAPI, winnersAPI } from '../../utils/api';
import useAuthStore from '../../context/authStore';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();
  const [filesByWinner, setFilesByWinner] = useState({});
  const [dragOverId, setDragOverId] = useState(null);

  const { register, handleSubmit, reset } = useForm();
  const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd, formState: { errors: pwdErrors } } = useForm();

  useEffect(() => {
    if (user) {
      reset({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || '',
        golf_club: user.golf_club || '',
        handicap: user.handicap || '',
      });
    }
  }, [user, reset]);

  const profileMutation = useMutation(usersAPI.updateProfile, {
    onSuccess: (r) => {
      updateUser(r.data.user);
      toast.success('Profile updated!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  const passwordMutation = useMutation(usersAPI.changePassword, {
    onSuccess: () => {
      toast.success('Password changed successfully!');
      resetPwd();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to change password'),
  });

  const { data: pendingKycProofs, isLoading: kycLoading } = useQuery(
    'pendingKycProofs',
    winnersAPI.getMy,
    {
      select: (r) =>
        (r.data.winnings || []).filter(
          (w) => w.payment_status === 'pending' && !w.proof_url
        ),
      retry: false,
    }
  );

  const uploadKycMutation = useMutation(
    ({ id, file }) => {
      const fd = new FormData();
      fd.append('proof', file);
      return winnersAPI.uploadProof(id, fd);
    },
    {
      onSuccess: () => {
        qc.invalidateQueries('pendingKycProofs');
        qc.invalidateQueries('myWinnings');
        toast.success('Proof uploaded successfully');
      },
      onError: (err) => {
        toast.error(err.response?.data?.error || 'Failed to upload proof');
      },
    }
  );

  const setWinnerFile = (winnerId, file) => {
    if (!file) return;
    setFilesByWinner((prev) => ({ ...prev, [winnerId]: file }));
  };

  return (
    <DashboardLayout title="Profile">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Avatar */}
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-dark-950 font-bold text-2xl">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div>
            <div className="text-white font-bold text-lg">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-dark-400 text-sm">{user?.email}</div>
            <div className="text-brand-400 text-xs mt-1 capitalize">{user?.role}</div>
          </div>
        </div>

        {/* Profile form */}
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-5">Personal Details</h3>
          <form onSubmit={handleSubmit((d) => profileMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-dark-300 mb-2">First Name</label>
                <input {...register('first_name')} className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">Last Name</label>
                <input {...register('last_name')} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2">Phone</label>
              <input {...register('phone')} type="tel" className="input-field" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2">Golf Club</label>
              <input {...register('golf_club')} className="input-field" placeholder="Your golf club" />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2">Handicap</label>
              <input {...register('handicap')} type="number" step="0.1" min="0" max="54" className="input-field" placeholder="e.g. 18.4" />
            </div>
            <button
              type="submit"
              disabled={profileMutation.isLoading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {profileMutation.isLoading ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-5">Change Password</h3>
          <form
            onSubmit={handlePwd((d) => passwordMutation.mutate(d))}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm text-dark-300 mb-2">Current Password</label>
              <input
                {...regPwd('current_password', { required: 'Required' })}
                type="password"
                className="input-field"
              />
              {pwdErrors.current_password && (
                <p className="text-red-400 text-xs mt-1">{pwdErrors.current_password.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2">New Password</label>
              <input
                {...regPwd('new_password', {
                  required: 'Required',
                  minLength: { value: 8, message: 'Min 8 characters' },
                })}
                type="password"
                className="input-field"
                placeholder="Min 8 characters"
              />
              {pwdErrors.new_password && (
                <p className="text-red-400 text-xs mt-1">{pwdErrors.new_password.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={passwordMutation.isLoading}
              className="btn-secondary w-full py-3 disabled:opacity-50"
            >
              {passwordMutation.isLoading ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>

        <div className="glass-card p-6">
          <div className="mb-4">
            <h3 className="text-white font-semibold">Winner KYC Upload Proof</h3>
            <p className="text-dark-400 text-sm mt-1">
              Upload identity or payout proof for pending winnings using the secure drag-and-drop zone.
            </p>
          </div>

          {kycLoading ? (
            <div className="shimmer h-24 rounded-xl" />
          ) : pendingKycProofs?.length > 0 ? (
            <div className="space-y-4">
              {pendingKycProofs.map((win) => {
                const selectedFile = filesByWinner[win.id];
                const isDragging = dragOverId === win.id;
                return (
                  <motion.div
                    key={win.id}
                    className="rounded-xl p-4"
                    style={{
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white text-sm font-medium">{win.prize_category}</p>
                        <p className="text-dark-500 text-xs">
                          Amount: ₹{(win.prize_amount || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <span className="badge-warning">KYC Pending</span>
                    </div>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(win.id);
                      }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverId(null);
                        const file = e.dataTransfer.files?.[0];
                        setWinnerFile(win.id, file);
                      }}
                      className="relative rounded-xl p-4 transition-all"
                      style={{
                        border: isDragging
                          ? '1px solid rgba(0,198,255,0.5)'
                          : '1px dashed rgba(255,255,255,0.22)',
                        background: isDragging ? 'rgba(0,198,255,0.08)' : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setWinnerFile(win.id, e.target.files?.[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <p className="text-sm text-dark-300">
                        Drag and drop proof here, or click to browse
                      </p>
                      <p className="text-xs text-dark-500 mt-1">
                        Accepted: images or PDF
                      </p>
                      {selectedFile && (
                        <p className="text-xs text-brand-300 mt-2">Selected: {selectedFile.name}</p>
                      )}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={!selectedFile || uploadKycMutation.isLoading}
                        onClick={() =>
                          uploadKycMutation.mutate({ id: win.id, file: selectedFile })
                        }
                        className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
                      >
                        {uploadKycMutation.isLoading ? 'Uploading...' : 'Upload Proof'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl p-4 text-sm text-dark-400" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              No pending winner proofs right now.
            </div>
          )}
          <p className="text-[11px] text-dark-500 mt-4">
            Data handled in accordance with the Digital Personal Data Protection Act, 2023.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
