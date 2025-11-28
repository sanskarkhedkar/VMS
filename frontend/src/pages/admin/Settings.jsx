import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Settings as SettingsIcon, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/admin/settings');
      return response.data.data;
    },
    onSuccess: (data) => setFormData(data || {}),
  });

  const mutation = useMutation({
    mutationFn: (data) => api.put('/admin/settings', data),
    onSuccess: () => {
      toast.success('Settings saved');
      queryClient.invalidateQueries(['settings']);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to save'),
  });

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="card p-6"><div className="skeleton h-64 w-full" /></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-primary-500" />
          System Settings
        </h1>
        <p className="page-subtitle">Configure system-wide preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">General</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                value={formData.company_name || ''}
                onChange={(e) => handleChange('company_name', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Visit Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Visit Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Default Visit Duration (minutes)</label>
              <input
                type="number"
                value={formData.default_visit_duration || 60}
                onChange={(e) => handleChange('default_visit_duration', e.target.value)}
                className="input"
                min="15"
                max="480"
              />
            </div>
            <div>
              <label className="label">Extension Duration (minutes)</label>
              <input
                type="number"
                value={formData.extension_duration || 15}
                onChange={(e) => handleChange('extension_duration', e.target.value)}
                className="input"
                min="5"
                max="60"
              />
            </div>
            <div>
              <label className="label">Max Extensions Allowed</label>
              <input
                type="number"
                value={formData.max_extension_count || 3}
                onChange={(e) => handleChange('max_extension_count', e.target.value)}
                className="input"
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="label">Auto Checkout Time</label>
              <input
                type="time"
                value={formData.auto_checkout_time || '18:00'}
                onChange={(e) => handleChange('auto_checkout_time', e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.require_id_proof === 'true'}
                onChange={(e) => handleChange('require_id_proof', e.target.checked ? 'true' : 'false')}
                className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-slate-700 dark:text-slate-300">Require ID proof for visitors</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_checkout_enabled === 'true'}
                onChange={(e) => handleChange('auto_checkout_enabled', e.target.checked ? 'true' : 'false')}
                className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-slate-700 dark:text-slate-300">Enable auto checkout at end of day</span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
