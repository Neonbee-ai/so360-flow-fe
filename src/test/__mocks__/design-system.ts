import React from 'react';
const stripBtn = ({ variant: _v, size: _s, loading: _l, ...rest }: any) => rest;
export const Button = ({ children, ...rest }: any) => React.createElement('button', stripBtn(rest), children);
export const IconButton = ({ label, icon, tooltipSide: _t, hideTooltip: _h, selected: _sel, ...rest }: any) =>
  React.createElement('button', { type: 'button', 'aria-label': label, ...stripBtn(rest) }, icon);
export const Input = (props: any) => React.createElement('input', props);
// Field mocks: render an associated <label> (when given) + the bare control, dropping DS-only props.
const fieldLabel = (label: any, name: any) => (label ? React.createElement('label', { htmlFor: name }, label) : null);
export const TextField = ({ label, name, hint: _hint, error: _e, size: _s, leadingIcon: _li, prefix: _p, suffix: _su, ...rest }: any) =>
  React.createElement(React.Fragment, null, fieldLabel(label, name), React.createElement('input', { id: name, name, ...rest }));
export const Textarea = ({ label, name, hint: _hint, error: _e, size: _s, ...rest }: any) =>
  React.createElement(React.Fragment, null, fieldLabel(label, name), React.createElement('textarea', { id: name, name, ...rest }));
export const Checkbox = ({ label, name, description: _d, indeterminate: _i, hideLabel: _h, ...rest }: any) =>
  React.createElement('label', null, React.createElement('input', { type: 'checkbox', name, ...rest }), label);
export const Select = ({ children, options, placeholder, label, name, hint: _hint, error: _e, size: _s, variant: _v, onValueChange, onChange, ...rest }: any) =>
  React.createElement(
    React.Fragment,
    null,
    fieldLabel(label, name),
    React.createElement(
      'select',
      { id: name, name, onChange: onValueChange || onChange ? (e: any) => { onChange?.(e); onValueChange?.(e.target.value); } : undefined, ...rest },
      placeholder !== undefined ? React.createElement('option', { value: '' }, placeholder) : null,
      options ? options.map((o: any) => React.createElement('option', { key: o.value, value: o.value, disabled: o.disabled }, o.label)) : children,
    ),
  );
export const RadioGroup = ({ name, label, options, value, onChange }: any) =>
  React.createElement('fieldset', null,
    React.createElement('legend', null, label),
    (options || []).map((o: any) =>
      React.createElement('label', { key: o.value },
        React.createElement('input', { type: 'radio', name, value: o.value, checked: value === o.value, onChange: () => onChange?.(o.value) }),
        o.label)));
export const Grid = ({ children, columns: _c, template: _t, gap: _g, as: _a, ...rest }: any) => React.createElement('div', rest, children);
export const GridItem = ({ children, span: _s, as: _a, ...rest }: any) => React.createElement('div', rest, children);
export const useConfirm = () => {
  const ref = (globalThis as any).__confirmMock ?? ((..._a: any[]) => Promise.resolve(true));
  return [ref, null] as const;
};
export const Modal = ({ children, open, isOpen, title, description, footer, onClose: _c, size: _s, closeOnOverlayClick: _co, dismissible: _d, bodyPadding: _b, initialFocusRef: _i, formId: _f, submitLabel: _sl, cancelLabel: _cl, submitLoading: _sd, submitDisabled: _sdis, ...rest }: any) =>
  open || isOpen
    ? React.createElement('div', { 'data-testid': 'modal', role: 'dialog', ...rest },
        title ? React.createElement('h2', null, title) : null,
        description ? React.createElement('p', null, description) : null,
        children,
        footer ?? null)
    : null;
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
