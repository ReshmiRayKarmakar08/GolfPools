import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { usersAPI } from '../../utils/api';
import useAuthStore from '../../context/authStore';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();

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

  return (
    <DashboardLayout title="Profile">
      <div className="max-w-lg mx-auto space-y-6">
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
      </div>
    </DashboardLayout>
  );
}
