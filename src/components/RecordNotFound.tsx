import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@so360/design-system';

export interface RecordNotFoundProps {
    /** Route (relative to the module mount) of the list to send the user back to. */
    listPath: string;
    /** Human name of that list, e.g. "Tickets". */
    listLabel: string;
}

/** True when a failed fetch means the record is missing or not accessible (404/403). */
export function isNotFoundError(e: unknown): boolean {
    const s = (e as { status?: number; response?: { status?: number } } | null | undefined);
    const status = s?.status ?? s?.response?.status;
    return status === 404 || status === 403;
}

/**
 * Shown by detail pages once loading has ended and the record came back 404/403/null,
 * e.g. when a link carries another organisation's id.
 */
const RecordNotFound: React.FC<RecordNotFoundProps> = ({ listPath, listLabel }) => {
    const navigate = useNavigate();
    return (
        <EmptyState
            icon={SearchX}
            title="Record not found"
            description="This record doesn't exist or you don't have access to it."
            action={{ label: `Back to ${listLabel}`, onClick: () => navigate(listPath) }}
        />
    );
};

export default RecordNotFound;
