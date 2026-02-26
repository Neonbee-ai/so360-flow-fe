import { Routes, Route, Navigate } from 'react-router-dom';
import { MfeShellInitializer } from './utils/initializeMfe';
import { FlowDashboard } from './pages/FlowDashboard';
import { FlowBuilder } from './pages/FlowBuilder';
import { PendingApprovals } from './pages/PendingApprovals';
import { InstanceViewer } from './pages/InstanceViewer';
import { InstanceList } from './pages/InstanceList';
import { ApprovalPoliciesPage } from './pages/ApprovalPoliciesPage';
import { FlowSimulatorPage } from './pages/FlowSimulatorPage';
import './index.css';

function App() {
    return (
        <MfeShellInitializer>
            <Routes>
                <Route path="/" element={<FlowDashboard />} />
                <Route path="builder/:flowId" element={<FlowBuilder />} />
                <Route path="approvals/pending" element={<PendingApprovals />} />
                <Route path="approvals/policies" element={<ApprovalPoliciesPage />} />
                <Route path="instance/:instanceId" element={<InstanceViewer />} />
                <Route path="instances" element={<InstanceList />} />
                <Route path="simulator" element={<FlowSimulatorPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </MfeShellInitializer>
    );
}

export default App;
