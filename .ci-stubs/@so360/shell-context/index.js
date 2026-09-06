export const useShellBridge = () => null;
export const useShell = () => ({});
export const eventBus = { publish: () => {}, subscribe: () => () => {} };
export const useActivity = () => ({ recordActivity: () => {} });
export default {};
export const useSandboxLimit = () => ({ isSandboxMode: false, sandboxEntryLimit: 5, limitItems: (items) => items, isLimited: () => false });
export const useQuota = () => ({ quotas: [], isLoading: false, error: null, isExceeded: () => false, getQuota: () => null, getPercentage: () => 0, refresh: () => {} });
