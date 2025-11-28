import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatDate, formatTime, formatStatus, getStatusColor, getFullName } from '../../lib/utils';
import { ArrowLeft, Mail, Phone, Building2, Calendar, User } from 'lucide-react';

export default function VisitorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: visitor, isLoading } = useQuery({
    queryKey: ['visitor', id],
    queryFn: async () => {
      const response = await api.get(`/visitors/${id}`);
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="card p-6">
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Visitor not found</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Visitor Profile Card */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-2xl">
            {visitor.firstName?.[0]}{visitor.lastName?.[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {visitor.firstName} {visitor.lastName}
                </h1>
                {visitor.designation && (
                  <p className="text-slate-500 dark:text-slate-400">{visitor.designation}</p>
                )}
              </div>
              {visitor.isBlacklisted && (
                <span className="badge-danger">Blacklisted</span>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{visitor.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{visitor.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Company</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{visitor.company || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visit History */}
      <div className="card">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-500" />
            Visit History
          </h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {visitor.visits?.length > 0 ? (
            visitor.visits.map((visit) => (
              <div key={visit.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {formatDate(visit.scheduledDate)}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatTime(visit.scheduledTimeIn)} - {formatTime(visit.scheduledTimeOut)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        Host: {getFullName(visit.hostEmployee)}
                      </span>
                    </div>
                  </div>
                  <span className={getStatusColor(visit.status)}>
                    {formatStatus(visit.status)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500">
              No visit history
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
