import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatDate, formatRole, formatStatus, getStatusColor } from '../../lib/utils';
import { Users, Search, Filter, CheckCircle, XCircle, Ban, Loader2, Trash2, Edit3, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    department: '',
    designation: '',
    employeeId: '',
    role: '',
    status: '',
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);
      if (role) params.append('role', role);
      if (status) params.append('status', status);
      const response = await api.get(`/users?${params}`);
      return response.data;
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/suspend`),
    onSuccess: () => {
      toast.success('User suspended');
      queryClient.invalidateQueries(['admin-users']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to suspend'),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/unsuspend`),
    onSuccess: () => {
      toast.success('User unsuspended');
      queryClient.invalidateQueries(['admin-users']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to unsuspend'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries(['admin-users']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to delete user'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/users/${editUser.id}`, payload),
    onSuccess: () => {
      toast.success('User updated');
      setEditUser(null);
      queryClient.invalidateQueries(['admin-users']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update user'),
  });

  const startEdit = (user) => {
    setEditUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      department: user.department || '',
      designation: user.designation || '',
      employeeId: user.employeeId || '',
      role: user.role || '',
      status: user.status || '',
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editUser) return;
    updateMutation.mutate(editForm);
  };

  const handleDelete = (user) => {
    if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const roles = [
    { value: '', label: 'All Roles' },
    { value: 'HOST_EMPLOYEE', label: 'Host Employee' },
    { value: 'PROCESS_ADMIN', label: 'Process Admin' },
    { value: 'SECURITY_GUARD', label: 'Security Guard' },
    { value: 'SECURITY_MANAGER', label: 'Security Manager' },
  ];

  const statuses = [
    { value: '', label: 'All Status' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'PENDING_APPROVAL', label: 'Pending' },
    { value: 'SUSPENDED', label: 'Suspended' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Users className="w-7 h-7 text-primary-500" />
          User Management
        </h1>
        <p className="page-subtitle">Manage system users and their roles</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="input pl-10"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="select w-auto"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="select w-auto"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Employee ID</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}><div className="skeleton h-12 w-full" /></td>
                  </tr>
                ))
              ) : data?.data?.length > 0 ? (
                data.data.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge-primary">{formatRole(user.role)}</span>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{user.department || '-'}</td>
                    <td className="text-slate-600 dark:text-slate-300 font-mono text-sm">{user.employeeId || '-'}</td>
                    <td>
                      <span className={getStatusColor(user.status)}>{formatStatus(user.status)}</span>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {user.status === 'ACTIVE' && (
                          <button
                            onClick={() => suspendMutation.mutate(user.id)}
                            disabled={suspendMutation.isPending}
                            className="btn-ghost btn-sm text-danger-600"
                            title="Suspend user"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {user.status === 'SUSPENDED' && (
                          <button
                            onClick={() => unsuspendMutation.mutate(user.id)}
                            disabled={unsuspendMutation.isPending}
                            className="btn-ghost btn-sm text-success-600"
                            title="Unsuspend user"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(user)}
                          className="btn-ghost btn-sm"
                          title="Edit user"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={deleteMutation.isPending}
                          className="btn-ghost btn-sm text-danger-600 hover:text-danger-700"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data?.pagination && data.pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.pagination.total)} of {data.pagination.total}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Previous</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= data.pagination.pages} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="modal-overlay flex items-center justify-center">
          <div className="modal-content p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Edit User</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{editUser.email}</p>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleEditSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => handleEditChange('firstName', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => handleEditChange('lastName', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => handleEditChange('phone', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => handleEditChange('department', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Designation</label>
                  <input
                    type="text"
                    value={editForm.designation}
                    onChange={(e) => handleEditChange('designation', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Employee ID</label>
                  <input
                    type="text"
                    value={editForm.employeeId}
                    onChange={(e) => handleEditChange('employeeId', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => handleEditChange('role', e.target.value)}
                    className="select"
                  >
                    {roles.filter(r => r.value !== '').map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => handleEditChange('status', e.target.value)}
                    className="select"
                  >
                    {statuses.filter(s => s.value !== '').map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn-primary"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
