import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DetailPageTemplate, EmptyState } from '@so360/design-system';
import { ApprovalHistory } from '../components/ApprovalHistory';

export const ApprovalHistoryPage: React.FC = () => {
    const { entityType, entityId } = useParams<{ entityType: string; entityId: string }>();
    const navigate = useNavigate();

    return (
        <DetailPageTemplate
            trail={[{ label: 'Back', onClick: () => navigate(-1) }]}
            title="Approval History"
            meta={`${entityType} · ${entityId?.slice(0, 8)}`}
        >
            {entityType && entityId ? (
                <ApprovalHistory entityType={entityType} entityId={entityId} />
            ) : (
                <EmptyState title="Invalid entity parameters" />
            )}
        </DetailPageTemplate>
    );
};
