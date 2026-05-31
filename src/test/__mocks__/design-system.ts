import React from 'react';
export const Button = ({ children, ...rest }: any) => React.createElement('button', rest, children);
export const Input = (props: any) => React.createElement('input', props);
export const Select = ({ children, ...rest }: any) => React.createElement('select', rest, children);
export const Modal = ({ children, isOpen, ...rest }: any) => isOpen ? React.createElement('div', { 'data-testid': 'modal', ...rest }, children) : null;
export const Card = ({ children, ...rest }: any) => React.createElement('div', rest, children);
export const Badge = ({ children, ...rest }: any) => React.createElement('span', rest, children);
export const Spinner = () => React.createElement('div', { 'data-testid': 'spinner' }, 'Loading...');
export const Tooltip = ({ children }: any) => React.createElement('span', null, children);
export const FeatureRoute = ({ children, state, hiddenFallback, lockedFallback, disabledFallback }: any) => {
  if (state === 'hidden') return hiddenFallback ?? null;
  if (state === 'locked') return lockedFallback ?? null;
  if (state === 'disabled') return disabledFallback ?? null;
  return children;
};
