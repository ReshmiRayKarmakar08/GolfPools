import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { adminAPI } from '../../utils/api';
import { format } from 'date-fns';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(['adminUsers', page, search], () =>
    adminAPI.getUsers({ page, limit: 20, search: search || undefined }), {
    select: r => r.data,
    keepPreviousData: true,
  });

  const updateMutation = useMutation(({ id, data }) => adminAPI.updateUser(id, data), {
    onSuccess: () => { qc.invalidateQueries('adminUsers'); toast.success('User updated'); },
    onError: () => toast.error('Failed to update user')
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl">Users</h2>
            <p className="text-dark-400 text-sm">{total} total users</p>
          </div>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-field w-64 pl-9"
              placeholder="Search by name or email..."
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase">User</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase">Subscription</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-dark-400 text-xs uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-dark-400 text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/3">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-6 py-4"><div className="h-5 shimmer rounded" /></td></tr>
                  ))
                ) : users.map((user) => {
                  const sub = user.subscriptions?.[0];
                  return (
                    <tr key={user.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-dark-950 font-bold text-xs">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium">{user.first_name} {user.last_name}</div>
                            <div className="text-dark-500 text-xs">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={user.role === 'admin' ? 'badge-warning' : 'badge-info'}>{user.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        {sub ? (
                          <div>
                            <span className={sub.status === 'active' ? 'badge-success' : 'badge-error'}>{sub.status}</span>
                            <div className="text-dark-600 text-xs mt-0.5 capitalize">{sub.plan_type}</div>
                          </div>
                        ) : (
                          <span className="text-dark-600 text-xs">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-dark-400 text-sm">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={user.is_active ? 'badge-success' : 'badge-error'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => updateMutation.mutate({ id: user.id, data: { is_active: !user.is_active } })}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${user.is_active
                              ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                              : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                            }`}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${user.first_name || 'this user'} permanently?`)) {
                                updateMutation.mutate({ id: user.id, data: { is_active: false } });
                              }
                            }}
                            className="text-xs border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                          >
                            Delete User
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-dark-500 text-sm">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-4 py-1.5 text-sm disabled:opacity-30">← Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary px-4 py-1.5 text-sm disabled:opacity-30">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
