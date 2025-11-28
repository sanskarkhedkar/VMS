import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatDate, downloadFile } from '../../lib/utils';
import { FileBarChart, Download, Filter, Calendar, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

export default function Reports() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ['report-summary', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await api.get(`/reports/summary?${params}`);
      return response.data.data;
    },
  });

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/reports/visitors/export/csv?${params}`, {
        responseType: 'blob',
      });
      
      downloadFile(response.data, `visitor-report-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`);
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/reports/visitors/export/pdf?${params}`, {
        responseType: 'blob',
      });
      
      downloadFile(response.data, `visitor-report-${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <FileBarChart className="w-7 h-7 text-primary-500" />
            Reports
          </h1>
          <p className="page-subtitle">Visitor analytics and exports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="btn-secondary"
          >
            {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="btn-primary"
          >
            {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            PDF
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="label">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex-1">
            <label className="label">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="btn-ghost"
          >
            Clear
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6">
              <div className="skeleton h-48 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-sm text-slate-500">Total Visits</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{report?.totalVisits || 0}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-slate-500">Walk-Ins</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{report?.walkInCount || 0}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-slate-500">Avg Duration</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{report?.averageDurationMinutes || 0} min</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-slate-500">Completion Rate</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {report?.totalVisits ? Math.round((report?.statusBreakdown?.find(s => s.status === 'CHECKED_OUT')?.count || 0) / report.totalVisits * 100) : 0}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Visit Status Distribution
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report?.statusBreakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="status" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Purpose Distribution */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Visit Purposes
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report?.purposeBreakdown?.map((p, i) => ({
                        name: p.purpose,
                        value: p.count,
                      })) || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {report?.purposeBreakdown?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {report?.purposeBreakdown?.map((item, index) => (
                  <div key={item.purpose} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-400">{item.purpose}</span>
                    <span className="font-medium text-slate-900 dark:text-white">({item.count})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Hosts */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Top Hosts
              </h2>
              <div className="space-y-3">
                {report?.topHosts?.map((host, index) => (
                  <div key={host.id || index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="text-slate-900 dark:text-white">
                        {host.firstName} {host.lastName}
                      </span>
                    </div>
                    <span className="font-medium text-primary-600">{host.visitCount} visits</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Visitors */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Frequent Visitors
              </h2>
              <div className="space-y-3">
                {report?.topVisitors?.map((visitor, index) => (
                  <div key={visitor.id || index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <span className="text-slate-900 dark:text-white block">
                          {visitor.firstName} {visitor.lastName}
                        </span>
                        <span className="text-xs text-slate-500">{visitor.company || 'No company'}</span>
                      </div>
                    </div>
                    <span className="font-medium text-primary-600">{visitor.visitCount} visits</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
