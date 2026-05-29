import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useShellBridge } from '@so360/shell-context';
import { FeatureRoute } from '@so360/design-system';
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

// Route-level upgrade prompt shown when a feature is `locked` (a higher plan unlocks it).
const UpgradeLocked = () => {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center px-6">
            <div>
                <h2 className="text-lg font-semibold text-slate-100">This feature is part of a higher plan</h2>
                <p className="text-sm text-slate-400 mt-1">Upgrade your plan to unlock it.</p>
            </div>
            <button
                type="button"
                onClick={() => navigate('/org/billing')}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
                Upgrade plan
            </button>
        </div>
    );
};

// Route-level panel shown when a feature is `disabled` (admin turned it off — no upgrade path).
const FeatureUnavailable = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 text-center px-6">
        <h2 className="text-lg font-semibold text-slate-100">Feature unavailable</h2>
        <p className="text-sm text-slate-400">This feature has been turned off for your organization.</p>
    </div>
);

// Guards a route on the resolved 5-state model via the shared FeatureRoute:
// enabled→render · read_only→inert · locked→upgrade prompt · disabled→unavailable · hidden→redirect.
const FlagGuard = ({ flagKey, children }: { flagKey: string; children: React.ReactNode }) => {
    const shell = useShellBridge();
    if (!shell) return null;
    const state = shell.getFeatureState ? shell.getFeatureState(flagKey) : 'enabled';
    return (
        <FeatureRoute
            state={state}
            hiddenFallback={<Navigate to="/" replace />}
            lockedFallback={<UpgradeLocked />}
            disabledFallback={<FeatureUnavailable />}
        >
            {children}
        </FeatureRoute>
    );
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
