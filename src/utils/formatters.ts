import { useContext } from 'react';
import { ShellContext } from '@so360/shell-context';
import { parseUtcDate } from './datetime';

// Self-contained formatters — does not depend on @so360/formatters package
// so flow-fe doesn't need it as a dependency.
export function useFlowFormatters() {
    const ctx = useContext(ShellContext) as any;
    const settings = ctx?.businessSettings;
    const currency = settings?.base_currency || 'USD';
    const locale = settings?.document_language || 'en-US';
    const timezone = settings?.timezone || 'UTC';

    const formatDate = (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => {
        if (!date) return '-';
        try {
            const opts = options ?? { year: 'numeric', month: 'short', day: 'numeric' };
            return new Intl.DateTimeFormat(locale, { ...opts, timeZone: timezone }).format(parseUtcDate(date));
        } catch { return String(date); }
    };

    return {
        formatDate,
        formatDateTime: (date: string | Date | null | undefined) => formatDate(date, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
        formatCurrency: (amount: number | null | undefined) => {
            if (amount == null || isNaN(amount)) return '-';
            try { return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'symbol' }).format(amount); }
            catch { return `${currency} ${amount}`; }
        },
        formatNumber: (num: number | null | undefined) => {
            if (num == null || isNaN(num)) return '-';
            try { return new Intl.NumberFormat(locale).format(num); } catch { return String(num); }
        },
        currency, locale, timezone,
    };
}
