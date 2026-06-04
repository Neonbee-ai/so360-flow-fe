import { useBusinessSettings } from '@so360/shell-context';
import { useFormatters as useFormattersBase } from '@so360/formatters';

export function useFlowFormatters() {
    const { settings } = useBusinessSettings();
    return useFormattersBase({
        currency: settings?.base_currency || 'USD',
        locale: settings?.document_language || 'en-US',
        timezone: settings?.timezone || 'UTC',
    });
}
