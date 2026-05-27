import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useShellBridge } from '@so360/shell-context';
import { MfeShellInitializer } from './utils/initializeMfe';
import { FlowDashboard } from './pages/FlowDashboard';
import { FlowBuilder } from './pages/FlowBuilder';
import { PendingApprovals } from './pages/PendingApprovals';
import { InstanceViewer } from './pages/InstanceViewer';
import { InstanceList } from './pages/InstanceList';
import { ApprovalPoliciesPage } from './pages/ApprovalPoliciesPage';
import { FlowSimulatorPage } from './pages/FlowSimulatorPage';
import { ApprovalHistoryPage } from './pages/ApprovalHistoryPage';
import { ApprovalDashboard } from './pages/ApprovalDashboard';
import './index.css';

// Guards a route behind a feature flag — redirects to Flow designer when hidden
const FlagGuard = ({ flagKey, children }: { flagKey: string; children: React.ReactNode }) => {
    const shell = useShellBridge();
    const navigate = useNavigate();
    const hidden = shell?.isFeatureHidden ? shell.isFeatureHidden(flagKey) : false;
    useEffect(() => {
        if (shell && hidden) navigate('/', { replace: true });
    }, [hidden, shell, navigate]);
    if (!shell || hidden) return null;
    return <>{children}</>;
};

function App() {
    return (
        <MfeShellInitializer>
            <Routes>
                <Route path="/" element={<FlowDashboard />} />
                <Route path="builder/:flowId" element={<FlowBuilder />} />
                <Route path="approvals/pending" element={<PendingApprovals />} />
                <Route path="approvals/policies" element={<ApprovalPoliciesPage />} />
                <Route path="instance/:instanceId" element={<FlagGuard flagKey="submodule:flow:advanced"><InstanceViewer /></FlagGuard>} />
                <Route path="instances" element={<FlagGuard flagKey="submodule:flow:advanced"><InstanceList /></FlagGuard>} />
                <Route path="simulator" element={<FlowSimulatorPage />} />
                <Route path="approvals/history/:entityType/:entityId" element={<ApprovalHistoryPage />} />
                <Route path="approvals/dashboard" element={<ApprovalDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </MfeShellInitializer>
    );
}

export default App;
