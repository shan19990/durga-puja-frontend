import toast from 'react-hot-toast';
import React from 'react';

// Custom toast styles for your Durga Pujo theme
const toastStyles = {
  success: {
    style: {
      border: '1px solid #10B981',
      padding: '16px',
      color: '#065F46',
      background: '#D1FAE5',
    },
    iconTheme: {
      primary: '#10B981',
      secondary: '#FFFFFF',
    },
  },
  error: {
    style: {
      border: '1px solid #EF4444',
      padding: '16px',
      color: '#991B1B',
      background: '#FEE2E2',
    },
    iconTheme: {
      primary: '#EF4444',
      secondary: '#FFFFFF',
    },
  },
  warning: {
    style: {
      border: '1px solid #F59E0B',
      padding: '16px',
      color: '#92400E',
      background: '#FEF3C7',
    },
    iconTheme: {
      primary: '#F59E0B',
      secondary: '#FFFFFF',
    },
  },
  info: {
    style: {
      border: '1px solid #3B82F6',
      padding: '16px',
      color: '#1E40AF',
      background: '#DBEAFE',
    },
    iconTheme: {
      primary: '#3B82F6',
      secondary: '#FFFFFF',
    },
  },
  durga: {
    style: {
      border: '2px solid #F97316',
      padding: '16px',
      color: '#9A3412',
      background: '#FED7AA',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#F97316',
      secondary: '#FFFFFF',
    },
  },
} as const;

// Custom toast functions
export const showToast = {
  // Basic toasts
  success: (message: string, options?: any) => 
    toast.success(message, { ...toastStyles.success, ...options }),
  
  error: (message: string, options?: any) => 
    toast.error(message, { ...toastStyles.error, ...options }),
  
  warning: (message: string, options?: any) => 
    toast(message, { 
      icon: '⚠️',
      ...toastStyles.warning, 
      ...options 
    }),
  
  info: (message: string, options?: any) => 
    toast(message, { 
      icon: 'ℹ️',
      ...toastStyles.info, 
      ...options 
    }),

  // Loading toast
  loading: (message: string, options?: any) => 
    toast.loading(message, {
      style: {
        border: '1px solid #F59E0B',
        padding: '16px',
        color: '#92400E',
        background: '#FEF3C7',
      },
      ...options
    }),

  // Custom Durga Pujo themed toast
  durga: (message: string, options?: any) => 
    toast(message, { 
      icon: '🙏',
      ...toastStyles.durga, 
      ...options 
    }),

  // Promise toast for API calls
  promise: <T,>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: any
  ) => toast.promise(promise, msgs, {
    loading: { ...toastStyles.warning },
    success: { ...toastStyles.success },
    error: { ...toastStyles.error },
    ...options
  }),

  // Custom toast with custom content - using React.ReactElement
  custom: (content: (t: any) => React.ReactElement, options?: any) => 
    toast.custom(content, options),

  // Dismiss specific toast
  dismiss: (toastId?: string) => toast.dismiss(toastId),

  // Dismiss all toasts
  dismissAll: () => toast.dismiss(),
};

// Shorthand exports
export const { success, error, warning, info, loading, durga, promise, custom, dismiss, dismissAll } = showToast;

export default showToast;