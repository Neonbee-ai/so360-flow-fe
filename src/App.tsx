import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useShellBridge } from '@so360/shell-context';
import { FeatureRoute, Button } from '@so360/design-system';
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
        <div className="flex flex-col items-center justify-center py-nb-12 gap-4 text-center px-6">
            <div>
                <h2 className="text-lg font-semibold text-fg">This feature is part of a higher plan</h2>
                <p className="text-sm text-fg-muted mt-1">Upgrade your plan to unlock it.</p>
            </div>
            <Button type="button" onClick={() => navigate('/org/billing')}>
                Upgrade plan
            </Button>
        </div>
    );
};

// Route-level panel shown when a feature is `disabled` (admin turned it off — no upgrade path).
const FeatureUnavailable = () => (
    <div className="flex flex-col items-center justify-center py-nb-12 gap-2 text-center px-6">
        <h2 className="text-lg font-semibold text-fg">Feature unavailable</h2>
        <p className="text-sm text-fg-muted">This feature has been turned off for your organization.</p>
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

// Guards a route on the signed-in user's ROLE PERMISSIONS — the page-level
// counterpart to FlagGuard. A plan flag answers "is this feature in the plan";
// this answers "may this user open it". Both must pass, so the two compose
// rather than replace one another.
//
// Fail-closed: while entitlements resolve (or with no bridge at all) the page is
// withheld rather than flashed. Denial renders an explanatory notice instead of
// a blank screen so "not allowed" is distinguishable from "broken". Codes are
// wildcard-aware via the shell bridge, matching the backend resolver exactly.
const PermissionGuard = ({ permission, children }: { permission: string | string[]; children: React.ReactNode }) => {
    const shell = useShellBridge();
    if (!shell || !shell.permissionsLoaded) return null;
    const codes = Array.isArray(permission) ? permission : [permission];
    const allowed = shell.hasAnyPermission
        ? shell.hasAnyPermission(...codes)
        : codes.some((c: string) => shell.hasPermission?.(c) ?? false);
    if (allowed) return <>{children}</>;
    return (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-fg-muted dark:text-fg">You don&apos;t have access to this page</h2>
            <p className="mt-2 max-w-md text-sm text-fg-subtle dark:text-fg-muted">
                Your role doesn&apos;t include permission for this page. Ask an administrator if you need it.
            </p>
        </div>
    );
};

function App() {
    return (
        <MfeShellInitializer>
            <Routes>
                {/* Landing route stays ungated — the Shell's module filter has already
                    established the user belongs in Flow, and gating the module's default
                    route would strand them on an empty page. */}
                <Route path="/" element={<FlowDashboard />} />
                <Route path="builder/:flowId" element={<PermissionGuard permission="workflows.read"><FlowBuilder /></PermissionGuard>} />
                <Route path="approvals/pending" element={<PermissionGuard permission="instances.view"><PendingApprovals /></PermissionGuard>} />
                <Route path="approvals/policies" element={<PermissionGuard permission="workflows.update"><ApprovalPoliciesPage /></PermissionGuard>} />
                <Route path="instance/:instanceId" element={<PermissionGuard permission="instances.view"><FlagGuard flagKey="submodule:flow:advanced"><InstanceViewer /></FlagGuard></PermissionGuard>} />
                <Route path="instances" element={<PermissionGuard permission="instances.view"><FlagGuard flagKey="submodule:flow:advanced"><InstanceList /></FlagGuard></PermissionGuard>} />
                <Route path="simulator" element={<PermissionGuard permission="workflows.read"><FlowSimulatorPage /></PermissionGuard>} />
                <Route path="approvals/history/:entityType/:entityId" element={<PermissionGuard permission="instances.view"><ApprovalHistoryPage /></PermissionGuard>} />
                {/* Approval dashboard is the approver's personal work queue — left ungated. */}
                <Route path="approvals/dashboard" element={<ApprovalDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </MfeShellInitializer>
    );
}

export default App;
