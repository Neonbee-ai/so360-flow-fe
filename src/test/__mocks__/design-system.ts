import React from 'react';
export const Button = ({ children, ...rest }: any) => React.createElement('button', rest, children);
export const Input = (props: any) => React.createElement('input', props);
export const Select = ({ children, ...rest }: any) => React.createElement('select', rest, children);
export const Modal = ({ children, isOpen, ...rest }: any) => isOpen ? React.createElement('div', { 'data-testid': 'modal', ...rest }, children) : null;
export const Card = ({ children, ...rest }: any) => React.createElement('div', rest, children);
export const Badge = ({ children, ...rest }: any) => React.createElement('span', rest, children);
export const Spinner = () => React.createElement('div', { 'data-testid': 'spinner' }, 'Loading...');
export const Tooltip = ({ children }: any) => React.createElement('span', null, children);
// Universal toast surface (shell owns the real viewport; tests spy on these).
export const toast = {
  success: (_message?: any, _opts?: any) => 'toast-id',
  error: (_message?: any, _opts?: any) => 'toast-id',
  warning: (_message?: any, _opts?: any) => 'toast-id',
  info: (_message?: any, _opts?: any) => 'toast-id',
  promise: <T,>(p: Promise<T> | T, _msgs?: any, _opts?: any) => p,
  dismiss: (_id?: string) => {},
};
export const toastBus = { subscribe: () => () => {} };
export const useToast = () => toast;
export const ToastViewport = () => null;
export const ToastProvider = ({ children }: any) => children;
export const getErrorMessage = (_err: any, fallback?: string) => fallback ?? 'error';
export const attachToastErrorHandler = (_client?: any, _opts?: any) => 0;
export const FeatureRoute =({ children, loading, state, hiddenFallback, lockedFallback, disabledFallback }: any) => {
  if (loading) return null;
  if (state === 'hidden') return hiddenFallback ?? null;
  if (state === 'locked') return lockedFallback ?? null;
  if (state === 'disabled') return disabledFallback ?? null;
  return children;
};
