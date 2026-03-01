import { useEffect, useState } from 'react';
import { useShellBridge } from '@so360/shell-context';

export const MfeShellInitializer = ({ children }: { children: React.ReactNode }) => {
    const shell = useShellBridge();
    const [isSynced, setIsSynced] = useState(false);

    useEffect(() => {
        const accessToken = (shell as unknown as { accessToken?: string })?.accessToken;
        if (shell?.currentTenant?.id && shell?.currentOrg?.id && accessToken) {
            // Store in localStorage for axios interceptor
            localStorage.setItem('currentTenantId', shell.currentTenant.id);
            localStorage.setItem('currentOrgId', shell.currentOrg.id);
            localStorage.setItem('flowAuthToken', accessToken);
            if (shell.user?.id) {
                localStorage.setItem('userId', shell.user.id);
            }
            setIsSynced(true);
        }
    }, [shell]);

    if (!isSynced) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                    <p className="mt-4 text-slate-400">Initializing Flow...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
