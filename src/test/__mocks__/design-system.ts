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
export const Card = ({ children, title, actions, footer, padding: _p, onClick, name: _n, ...rest }: any) =>
  React.createElement('div', { onClick, ...rest }, title ? React.createElement('h3', null, title) : null, actions ?? null, children, footer ?? null);
export const Badge = ({ children, tone: _t, size: _s, dot: _d, variant: _v, shape: _sh, ...rest }: any) => React.createElement('span', rest, children);
export const Spinner = () => React.createElement('div', { 'data-testid': 'spinner' }, 'Loading...');
export const Skeleton = () => React.createElement('span', { 'data-testid': 'skeleton' });
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

// ---- Comb page templates & layout primitives (render semantic content so specs can assert on it) ----
const h = React.createElement;
export const Stack = ({ children, gap: _g, as: _a, ...rest }: any) => h('div', rest, children);
export const Cluster = ({ children, gap: _g, justify: _j, wrap: _w, align: _al, as: _a, ...rest }: any) => h('div', rest, children);
export const Split = ({ children, ratio: _r, collapseBelow: _c, ...rest }: any) => h('div', rest, children);
export const StatusBadge = ({ children, label, status, tone: _t, size: _s, ...rest }: any) => h('span', rest, children ?? label ?? status);
export const KpiCard = ({ label, value, hint, icon: _i, delta: _d, deltaLabel: _dl, loading: _l, onClick, name: _n, ...rest }: any) =>
  h('div', { 'data-slot': 'kpi-card', onClick, ...rest }, h('span', null, label), h('span', null, value), hint ? h('span', null, hint) : null);
export const EmptyState = ({ title, description, action, icon: _i, ...rest }: any) =>
  h('div', rest, title ? h('p', null, title) : null, description ? h('p', null, description) : null,
    action ? h('button', { type: 'button', onClick: action.onClick }, action.label) : null);
const trailBack = (trail: any[] | undefined) => {
  const last = trail && trail.length ? trail[trail.length - 1] : null;
  return last ? h('button', { type: 'button', 'aria-label': `Back to ${last.label}`, onClick: last.onClick }, `← ${last.label}`) : null;
};
export const ListPageTemplate = ({
  title, description, trail, count: _c, primaryAction, headerSecondaryActions, secondaryActions, overflowActions, kpis, views, search,
  filterConfig, toolbarEnd, loading, isEmpty, empty, children, pagination, footer,
}: any) =>
  h('div', { 'data-comb-page': 'list' },
    trailBack(trail),
    h('h1', null, title),
    description ? h('p', null, description) : null,
    h('div', { 'data-slot': 'header-actions' }, headerSecondaryActions,
      [...(secondaryActions || []), ...(overflowActions || [])].map((a: any) => h('button', { key: a.label, type: 'button', disabled: a.disabled, onClick: a.onSelect }, a.label)),
      primaryAction),
    kpis ?? null,
    h('div', { 'data-slot': 'toolbar' }, views, search,
      (filterConfig?.fields || []).map((f: any) =>
        h('select', {
          key: f.key, 'aria-label': f.label, name: f.key, value: (filterConfig.values?.[f.key] as string) ?? '',
          onChange: (e: any) => filterConfig.onChange({ ...filterConfig.values, [f.key]: e.target.value }),
        }, [h('option', { key: '', value: '' }, `All ${f.label}`), ...(f.options || []).map((o: any) => h('option', { key: o.value, value: o.value }, o.label))])),
      toolbarEnd),
    loading ? h('div', { 'data-testid': 'spinner' }, 'Loading...') : isEmpty ? empty : children,
    pagination ?? null, footer ?? null);
export const DetailPageTemplate = ({
  title, trail, status, meta, primaryAction, secondaryActions, actions, overflowActions: _o, tabs, activeTab, onTabChange, loading, children, sidePanel,
}: any) =>
  h('div', { 'data-comb-page': 'detail' },
    trailBack(trail),
    h('h1', null, title), status ?? null, meta ? h('div', null, meta) : null,
    h('div', { 'data-slot': 'header-actions' }, secondaryActions, actions, primaryAction),
    tabs ? h('div', { role: 'tablist' }, tabs.map((t: any) => h('button', { key: t.id, role: 'tab', 'aria-selected': activeTab === t.id, onClick: () => onTabChange?.(t.id) }, t.label))) : null,
    loading ? h('div', { 'data-testid': 'spinner' }, 'Loading...') : h(React.Fragment, null, h('div', null, children), sidePanel ? h('aside', null, sidePanel) : null));
export const DashboardPageTemplate = ({
  title, description, trail, meta, filters, toolbarEnd, secondaryActions, primaryAction, kpis, primary, secondary, bottom, children,
}: any) =>
  h('div', { 'data-comb-page': 'dashboard' },
    trailBack(trail),
    h('h1', null, title), description ? h('p', null, description) : null, meta ?? null,
    h('div', { 'data-slot': 'header-actions' }, secondaryActions, primaryAction), filters ?? null, toolbarEnd ?? null,
    h('div', { 'data-slot': 'kpis' }, kpis), primary ?? null, secondary ?? null, bottom ?? null, children ?? null);
export const FormPageTemplate = ({
  title, description, trail, status, meta, sections, children, onCancel, cancelLabel, secondaryAction, primaryAction, destructiveAction,
}: any) =>
  h('div', { 'data-comb-page': 'form' },
    trailBack(trail), h('h1', null, title), description ? h('p', null, description) : null, status ?? null, meta ?? null,
    (sections || []).map((s: any) => h('section', { key: s.id }, h('h2', null, s.title), s.content)), children ?? null,
    h('div', { 'data-slot': 'footer' }, destructiveAction, onCancel ? h('button', { type: 'button', onClick: onCancel }, cancelLabel || 'Cancel') : null, secondaryAction, primaryAction));
export const DataTable = ({ columns, rows, rowKey, loading, emptyState, onRowClick, rowActions, getRowProps, name: _n, ...rest }: any) => {
  if (loading) return h('div', { 'data-testid': 'spinner' }, 'Loading...');
  if (!rows || rows.length === 0) return h('div', null, emptyState ?? null);
  return h('table', { 'data-testid': rest['data-testid'] },
    h('thead', null, h('tr', null, columns.map((c: any) => h('th', { key: c.key }, c.header)))),
    h('tbody', null, rows.map((r: any) => h('tr', { key: rowKey(r), onClick: onRowClick ? () => onRowClick(r) : undefined, ...(getRowProps ? getRowProps(r) : {}) },
      columns.map((c: any) => h('td', { key: c.key }, c.render ? c.render(r) : r[c.key])),
      rowActions ? h('td', null, rowActions(r).map((a: any) => h('button', { key: a.label, type: 'button', onClick: a.onSelect }, a.label))) : null))));
};
export const SearchInput = ({ value, onChange, placeholder, ...rest }: any) =>
  h('input', { type: 'search', value, placeholder, 'aria-label': rest['aria-label'] ?? placeholder, onChange: (e: any) => onChange?.(e.target.value, e) });
export const Tabs = ({ items, value, onChange, children, maxVisible: _m, moreLabel: _ml, end, variant: _v, name: _n, defaultValue: _d }: any) =>
  h('div', null, h('div', { role: 'tablist' }, items.map((t: any) => h('button', { key: t.id, role: 'tab', 'aria-selected': value === t.id, onClick: () => onChange?.(t.id) }, t.label))), end ?? null,
    typeof children === 'function' ? children(value) : null);
export const Pagination = ({ currentPage, totalPages, totalItems, pageSize, onPageChange }: any) =>
  h('div', { 'data-slot': 'pagination' },
    h('span', null, `Showing ${(currentPage - 1) * pageSize + 1}\u2013${Math.min(currentPage * pageSize, totalItems)} of ${totalItems}`),
    h('button', { type: 'button', 'aria-label': 'Previous page', disabled: currentPage <= 1, onClick: () => onPageChange(currentPage - 1) }, '\u2039'),
    h('span', null, `Page ${currentPage} of ${totalPages}`),
    h('button', { type: 'button', 'aria-label': 'Next page', disabled: currentPage >= totalPages, onClick: () => onPageChange(currentPage + 1) }, '\u203a'));
export const DescriptionList = ({ items, title }: any) =>
  h('dl', null, title ? h('h3', null, title) : null,
    (items || []).filter((i: any) => !i.hidden).map((i: any) => h('div', { key: i.label }, h('dt', null, i.label), h('dd', null, i.value))));
export const Progress = ({ value, max = 100, label, tone: _t, size: _s, variant: _v, showValue: _sv, ...rest }: any) =>
  h('div', { role: 'progressbar', 'aria-valuenow': value, 'aria-valuemax': max, 'aria-label': label, ...rest });
