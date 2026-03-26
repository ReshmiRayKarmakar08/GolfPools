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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [kycFile, setKycFile] = useState(null);

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

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await usersAPI.updateAvatar(fd);
      updateUser({ ...user, avatar_url: data.avatar_url });
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleKycUpload = async (file) => {
    if (!file) return;
    try {
      setUploadingKyc(true);
      const fd = new FormData();
      fd.append('document', file);
      await usersAPI.updateKyc(fd);
      toast.success('Identity document uploaded successfully!');
      qc.invalidateQueries(['profile']);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploadingKyc(false);
    }
  };

  return (
    <DashboardLayout title="Profile">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Avatar & Basic Info */}
        <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white/10 group-hover:border-brand-500/50 transition-all duration-300">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-dark-950 font-bold text-3xl">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-brand-500 text-dark-950 flex items-center justify-center cursor-pointer hover:bg-brand-400 transition-colors shadow-lg">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e.target.files?.[0])} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-white font-bold text-2xl">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-dark-400">{user?.email}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
              <span className="badge-primary px-3 py-1 text-[10px] uppercase tracking-wider">{user?.role}</span>
              {user?.email_verified && <span className="badge-success px-3 py-1 text-[10px] uppercase tracking-wider">Verified</span>}
            </div>
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

        <div className="glass-card overflow-hidden">
          <div className="border-b border-white/5 p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3 className="text-white font-bold">Identity Verification (KYC)</h3>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <p className="text-dark-400 text-sm">
                  Upload a valid government-issued ID to verify your identity. This is required for withdrawing winnings.
                </p>
                {user?.kyc_status && (
                  <div className={`p-3 rounded-xl border ${
                    user.kyc_status === 'verified' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                    user.kyc_status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                    user.kyc_status === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    'bg-white/5 border-white/10 text-dark-400'
                  }`}>
                    <div className="flex items-center gap-2 font-bold uppercase text-[10px]">
                      Status: {user.kyc_status}
                    </div>
                  </div>
                )}
              </div>
              <div className="w-full md:w-64">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOverId('gen_kyc'); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverId(null);
                    handleKycUpload(e.dataTransfer.files?.[0]);
                  }}
                  className={`relative rounded-2xl border-2 border-dashed transition-all p-8 flex flex-col items-center justify-center text-center gap-2 ${
                    dragOverId === 'gen_kyc' ? 'border-brand-500 bg-brand-500/5' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-dark-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <p className="text-white text-xs font-bold">Upload ID Proof</p>
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleKycUpload(e.target.files?.[0])} />
                  {uploadingKyc && <div className="absolute inset-0 bg-dark-950/80 rounded-2xl flex items-center justify-center"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}
                </div>
              </div>
            </div>
          </div>
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
