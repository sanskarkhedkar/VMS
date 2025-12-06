import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { 
  UserPlus, 
  Loader2, 
  Search, 
  Calendar,
  Clock,
  Building2,
  Mail,
  Phone,
  User,
  X,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const guestSchema = z.object({
  name: z.string().min(1, 'Guest name required'),
  contact: z.string().min(1, 'Guest contact required'),
});

const inviteSchema = z.object({
  visitorEmail: z.string().email('Valid email required'),
  visitorFirstName: z.string().min(1, 'First name required'),
  visitorLastName: z.string().min(1, 'Last name required'),
  visitorPhone: z.string().optional(),
  visitorCompany: z.string().optional(),
  purpose: z.enum(['MEETING', 'INTERVIEW', 'DELIVERY', 'MAINTENANCE', 'PERSONAL', 'OFFICIAL', 'OTHER']),
  purposeDetails: z.string().optional(),
  scheduledDate: z.string().min(1, 'Date required'),
  scheduledTimeIn: z.string().min(1, 'Start time required'),
  scheduledTimeOut: z.string().min(1, 'End time required'),
  vehicleNumber: z.string().optional(),
  numberOfGuests: z.preprocess(
    (val) => (val === '' || Number.isNaN(val) ? 0 : Number(val)),
    z.number().int().min(0).max(10).default(0)
  ),
  guests: z.array(guestSchema).default([]),
  specialInstructions: z.string().optional(),
}).refine((data) => {
  if ((data.numberOfGuests || 0) === 0) return true;
  return data.guests.length === data.numberOfGuests;
}, {
  message: 'Please provide details for each guest',
  path: ['guests'],
});

const purposes = [
  { value: 'MEETING', label: 'Meeting' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'OFFICIAL', label: 'Official' },
  { value: 'OTHER', label: 'Other' },
];

export default function InviteVisitor() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [success, setSuccess] = useState(false);
  const dateInputRef = useRef(null);
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      purpose: 'MEETING',
      numberOfGuests: 0,
      guests: [],
    },
  });

  const {
    fields: guestFields,
    append: appendGuest,
    remove: removeGuest,
  } = useFieldArray({
    control,
    name: 'guests',
  });

  const guestCountValue = watch('numberOfGuests');
  const guestCount = Number.isFinite(guestCountValue) ? guestCountValue : 0;

  useEffect(() => {
    if (guestCount > guestFields.length) {
      const guestsToAdd = guestCount - guestFields.length;
      for (let i = 0; i < guestsToAdd; i += 1) {
        appendGuest({ name: '', contact: '' });
      }
    } else if (guestCount < guestFields.length) {
      for (let i = guestFields.length - 1; i >= guestCount; i -= 1) {
        removeGuest(i);
      }
    }
  }, [guestCount, guestFields.length, appendGuest, removeGuest]);

  // Search existing visitors
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['visitor-search', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const response = await api.get(`/visitors/search?q=${searchQuery}`);
      return response.data.data;
    },
    enabled: searchQuery.length >= 2,
  });

  // Create invitation mutation
  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      // Combine date and time
      const scheduledDate = new Date(data.scheduledDate);
      const [inHours, inMinutes] = data.scheduledTimeIn.split(':');
      const [outHours, outMinutes] = data.scheduledTimeOut.split(':');
      
      const scheduledTimeIn = new Date(scheduledDate);
      scheduledTimeIn.setHours(parseInt(inHours), parseInt(inMinutes));
      
      const scheduledTimeOut = new Date(scheduledDate);
      scheduledTimeOut.setHours(parseInt(outHours), parseInt(outMinutes));

      return api.post('/visits/invite', {
        ...data,
        scheduledDate: scheduledDate.toISOString(),
        scheduledTimeIn: scheduledTimeIn.toISOString(),
        scheduledTimeOut: scheduledTimeOut.toISOString(),
      });
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    },
  });

  // Reinvite mutation
  const reinviteMutation = useMutation({
    mutationFn: async (data) => {
      const scheduledDate = new Date(data.scheduledDate);
      const [inHours, inMinutes] = data.scheduledTimeIn.split(':');
      const [outHours, outMinutes] = data.scheduledTimeOut.split(':');
      
      const scheduledTimeIn = new Date(scheduledDate);
      scheduledTimeIn.setHours(parseInt(inHours), parseInt(inMinutes));
      
      const scheduledTimeOut = new Date(scheduledDate);
      scheduledTimeOut.setHours(parseInt(outHours), parseInt(outMinutes));

      return api.post('/visits/reinvite', {
        visitorId: selectedVisitor.id,
        purpose: data.purpose,
        purposeDetails: data.purposeDetails,
        scheduledDate: scheduledDate.toISOString(),
        scheduledTimeIn: scheduledTimeIn.toISOString(),
        scheduledTimeOut: scheduledTimeOut.toISOString(),
        vehicleNumber: data.vehicleNumber,
        guests: data.guests,
        numberOfGuests: data.numberOfGuests,
        specialInstructions: data.specialInstructions,
      });
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reinvite');
    },
  });

  const selectVisitor = (visitor) => {
    setSelectedVisitor(visitor);
    setShowSearch(false);
    setValue('visitorEmail', visitor.email);
    setValue('visitorFirstName', visitor.firstName);
    setValue('visitorLastName', visitor.lastName);
    setValue('visitorPhone', visitor.phone || '');
    setValue('visitorCompany', visitor.company || '');
    setValue('numberOfGuests', 0);
    setValue('guests', []);
  };

  const focusPicker = (ref) => {
    if (!ref?.current) return;
    ref.current.focus();
    if (ref.current.showPicker) {
      ref.current.showPicker();
    }
  };

  const clearSelection = () => {
    setSelectedVisitor(null);
    setShowSearch(true);
    reset();
  };

  const onSubmit = (data) => {
    if (selectedVisitor) {
      reinviteMutation.mutate(data);
    } else {
      inviteMutation.mutate(data);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 animate-fade-in">
        <div className="w-20 h-20 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-success-600 dark:text-success-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Invitation Sent!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          {selectedVisitor 
            ? 'The visit has been submitted for approval.'
            : 'The visitor will receive an email with a link to complete their registration.'
          }
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              setSuccess(false);
              clearSelection();
            }}
            className="btn-primary"
          >
            <UserPlus className="w-5 h-5" />
            Invite Another
          </button>
          <button
            onClick={() => navigate('/visits')}
            className="btn-secondary"
          >
            View Visits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Invite Visitor</h1>
        <p className="page-subtitle">
          Send an invitation to a new or existing visitor
        </p>
      </div>

      {/* Search Existing Visitors */}
      {showSearch && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Search Existing Visitors
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or company..."
              className="input pl-10"
            />
          </div>
          
          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="mt-4">
              {isSearching ? (
                <div className="text-center py-4 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </div>
              ) : searchResults?.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((visitor) => (
                    <button
                      key={visitor.id}
                      onClick={() => selectVisitor(visitor)}
                      className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold text-sm">
                        {visitor.firstName?.[0]}{visitor.lastName?.[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {visitor.firstName} {visitor.lastName}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {visitor.email} • {visitor.company || 'No company'}
                        </p>
                      </div>
                      <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                        Select →
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-slate-500">
                  No visitors found. Fill in the form below to invite a new visitor.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected Visitor Banner */}
      {selectedVisitor && (
        <div className="card p-4 mb-6 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold">
                {selectedVisitor.firstName?.[0]}{selectedVisitor.lastName?.[0]}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {selectedVisitor.firstName} {selectedVisitor.lastName}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedVisitor.email}
                </p>
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
      )}

      {/* Invitation Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        {/* Visitor Details */}
        {!selectedVisitor && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              Visitor Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">First Name *</label>
                <input
                  type="text"
                  {...register('visitorFirstName')}
                  className={errors.visitorFirstName ? 'input-error' : 'input'}
                  placeholder="John"
                />
                {errors.visitorFirstName && (
                  <p className="mt-1 text-xs text-danger-600">{errors.visitorFirstName.message}</p>
                )}
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input
                  type="text"
                  {...register('visitorLastName')}
                  className={errors.visitorLastName ? 'input-error' : 'input'}
                  placeholder="Doe"
                />
                {errors.visitorLastName && (
                  <p className="mt-1 text-xs text-danger-600">{errors.visitorLastName.message}</p>
                )}
              </div>
              <div>
                <label className="label">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  {...register('visitorEmail')}
                  className={errors.visitorEmail ? 'input-error' : 'input'}
                  placeholder="john@example.com"
                />
                {errors.visitorEmail && (
                  <p className="mt-1 text-xs text-danger-600">{errors.visitorEmail.message}</p>
                )}
              </div>
              <div>
                <label className="label">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  {...register('visitorPhone')}
                  className="input"
                  placeholder="+1234567890"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Company
                </label>
                <input
                  type="text"
                  {...register('visitorCompany')}
                  className="input"
                  placeholder="Company Inc."
                />
              </div>
            </div>
          </div>
        )}

        {/* Visit Details */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-500" />
            Visit Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Purpose *</label>
              <select {...register('purpose')} className="select">
                {purposes.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Guests with Visitor</label>
              <input
                type="number"
                {...register('numberOfGuests', { valueAsNumber: true })}
                className="input"
                min="0"
                max="10"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Default is 0 when the visitor is arriving alone.
              </p>
            </div>
            {guestCount > 0 && (
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Guest Details</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Provide name and contact for each accompanying guest.
                  </p>
                </div>
                <div className="space-y-4">
                  {guestFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div>
                        <label className="label">Guest {index + 1} Name *</label>
                        <input
                          type="text"
                          {...register(`guests.${index}.name`)}
                          className={errors.guests?.[index]?.name ? 'input-error' : 'input'}
                          placeholder="Guest name"
                        />
                        {errors.guests?.[index]?.name && (
                          <p className="mt-1 text-xs text-danger-600">{errors.guests[index].name.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="label">Guest {index + 1} Contact *</label>
                        <input
                          type="text"
                          {...register(`guests.${index}.contact`)}
                          className={errors.guests?.[index]?.contact ? 'input-error' : 'input'}
                          placeholder="Phone or email"
                        />
                        {errors.guests?.[index]?.contact && (
                          <p className="mt-1 text-xs text-danger-600">{errors.guests[index].contact.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {errors.guests?.message && (
                  <p className="mt-2 text-sm text-danger-600">{errors.guests.message}</p>
                )}
              </div>
            )}
            <div>
              <label className="label">Date *</label>
              <div
                className="relative cursor-pointer"
                onClick={() => focusPicker(dateInputRef)}
              >
                <Calendar className="w-4 h-4 text-slate-900 dark:text-slate-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  {...register('scheduledDate', {
                    setValueAs: (v) => v,
                  })}
                  className={`${errors.scheduledDate ? 'input-error' : 'input'} pl-10`}
                  min={new Date().toISOString().split('T')[0]}
                  ref={(el) => {
                    register('scheduledDate').ref(el);
                    dateInputRef.current = el;
                  }}
                />
              </div>
              {errors.scheduledDate && (
                <p className="mt-1 text-xs text-danger-600">{errors.scheduledDate.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Start Time *</label>
                <div
                  className="relative cursor-pointer"
                  onClick={() => focusPicker(startTimeRef)}
                >
                  <Clock className="w-4 h-4 text-slate-900 dark:text-slate-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="time"
                    {...register('scheduledTimeIn')}
                    className={`${errors.scheduledTimeIn ? 'input-error' : 'input'} pl-10`}
                    ref={(el) => {
                      register('scheduledTimeIn').ref(el);
                      startTimeRef.current = el;
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="label">End Time *</label>
                <div
                  className="relative cursor-pointer"
                  onClick={() => focusPicker(endTimeRef)}
                >
                  <Clock className="w-4 h-4 text-slate-900 dark:text-slate-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="time"
                    {...register('scheduledTimeOut')}
                    className={`${errors.scheduledTimeOut ? 'input-error' : 'input'} pl-10`}
                    ref={(el) => {
                      register('scheduledTimeOut').ref(el);
                      endTimeRef.current = el;
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="label">Purpose Details</label>
              <textarea
                {...register('purposeDetails')}
                className="input min-h-[80px]"
                placeholder="Brief description of the visit..."
              />
            </div>
            <div>
              <label className="label">Vehicle Number</label>
              <input
                type="text"
                {...register('vehicleNumber')}
                className="input"
                placeholder="ABC 1234"
              />
            </div>
            <div>
              <label className="label">Special Instructions</label>
              <input
                type="text"
                {...register('specialInstructions')}
                className="input"
                placeholder="Any special requirements..."
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={inviteMutation.isPending || reinviteMutation.isPending}
            className="btn-primary"
          >
            {(inviteMutation.isPending || reinviteMutation.isPending) ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                {selectedVisitor ? 'Send Invitation' : 'Send Invitation'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
