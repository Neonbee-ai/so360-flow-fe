import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { IconButton } from '@so360/design-system';
import { ApprovalHistory } from '../components/ApprovalHistory';

export const ApprovalHistoryPage: React.FC = () => {
    const { entityType, entityId } = useParams<{ entityType: string; entityId: string }>();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-bg p-6">
            <div className="flex items-center gap-3 mb-6">
                <IconButton label="Back" icon={<ArrowLeft className="w-5 h-5" />} onClick={() => navigate(-1)} />
                <div>
                    <h1 className="text-2xl font-bold text-fg">Approval History</h1>
                    <p className="text-fg-muted text-sm">{entityType} · {entityId?.slice(0, 8)}</p>
                </div>
            </div>
            {entityType && entityId ? (
                <ApprovalHistory entityType={entityType} entityId={entityId} />
            ) : (
                <p className="text-fg-muted">Invalid entity parameters</p>
            )}
        </div>
    );
};
