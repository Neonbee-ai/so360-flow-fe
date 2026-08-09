export const useShellBridge = () => null;
export const useShell = () => ({});
export const eventBus = { publish: () => {}, subscribe: () => () => {} };
export default {};
export const QuotaGate = ({ children }) => children;
export const QuotaBar = () => null;
export const toast = {
  success: () => 'toast-id',
  error: () => 'toast-id',
  warning: () => 'toast-id',
  info: () => 'toast-id',
  promise: (p) => p,
  dismiss: () => {},
};
export const toastBus = { subscribe: () => () => {} };
export const useToast = () => toast;
export const ToastViewport = () => null;
export const ToastProvider = ({ children }) => children;
export const getErrorMessage = (_e, f) => f ?? 'error';
export const attachToastErrorHandler = () => 0;
