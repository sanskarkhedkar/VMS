import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

// Merge Tailwind classes
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format date
export function formatDate(date, formatStr = 'MMM d, yyyy') {
  if (!date) return '-';
  return format(new Date(date), formatStr);
}

// Format time
export function formatTime(date) {
  if (!date) return '-';
  return format(new Date(date), 'h:mm a');
}

// Format date and time
export function formatDateTime(date) {
  if (!date) return '-';
  return format(new Date(date), 'MMM d, yyyy h:mm a');
}

// Format relative time
export function formatRelativeTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  
  if (isToday(d)) {
    return `Today at ${format(d, 'h:mm a')}`;
  }
  
  if (isYesterday(d)) {
    return `Yesterday at ${format(d, 'h:mm a')}`;
  }
  
  return formatDistanceToNow(d, { addSuffix: true });
}

// Get initials from name
export function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}`;
}

// Get full name
export function getFullName(user) {
  if (!user) return '-';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim();
}

// Format role name
export function formatRole(role) {
  if (!role) return '-';
  return role.split('_').map(word => 
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ');
}

// Get status badge color
export function getStatusColor(status) {
  const colors = {
    // Visit statuses
    INVITED: 'badge-primary',
    PENDING_DETAILS: 'badge-warning',
    PENDING_APPROVAL: 'badge-warning',
    APPROVED: 'badge-success',
    REJECTED: 'badge-danger',
    CHECKED_IN: 'badge-success',
    CHECKED_OUT: 'badge-gray',
    CANCELLED: 'badge-danger',
    BLOCKED: 'badge-danger',
    BLACKLISTED: 'badge-danger',
    
    // User statuses
    ACTIVE: 'badge-success',
    SUSPENDED: 'badge-danger',
  };
  
  return colors[status] || 'badge-gray';
}

// Format status text
export function formatStatus(status) {
  if (!status) return '-';
  return status.split('_').map(word => 
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ');
}

// Format purpose
export function formatPurpose(purpose) {
  if (!purpose) return '-';
  return purpose.charAt(0) + purpose.slice(1).toLowerCase();
}

// Truncate text
export function truncate(text, length = 50) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Validate email
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Download file from blob
export function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Generate random color for avatar
export function getAvatarColor(name) {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
  ];
  
  const index = name?.charCodeAt(0) % colors.length || 0;
  return colors[index];
}
