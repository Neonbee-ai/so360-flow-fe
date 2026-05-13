import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ApprovalHistory } from '../components/ApprovalHistory';

export const ApprovalHistoryPage: React.FC = () => {
    const { entityType, entityId } = useParams<{ entityType: string; entityId: string }>();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-100">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Approval History</h1>
                    <p className="text-slate-400 text-sm">{entityType} · {entityId?.slice(0, 8)}</p>
                </div>
            </div>
            {entityType && entityId ? (
                <ApprovalHistory entityType={entityType} entityId={entityId} />
            ) : (
                <p className="text-slate-400">Invalid entity parameters</p>
            )}
        </div>
    );
};
