'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';

export const showToast = {
  success: (message) => toast.success(message),
  error: (message) => toast.error(message),
  loading: (message) => toast.loading(message),
  custom: (message, options) => toast(message, options)
};

export function ToastProvider({ children }) {
  return <>{children}</>;
}