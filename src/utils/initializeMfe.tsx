import { useEffect, useState } from 'react';
import { useShellBridge } from '@so360/shell-context';
import { Skeleton } from '@so360/design-system';

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
            // Bridge for UserSelector component (reads sb-access-token)
            localStorage.setItem('sb-access-token', accessToken);
            if (shell.user?.id) {
                localStorage.setItem('userId', shell.user.id);
            }
            setIsSynced(true);
        }
    }, [shell]);

    if (!isSynced) {
        return (
            <>
                <Skeleton.Page template="list" />
                <span className="sr-only">Initializing Flow...</span>
            </>
        );
    }

    return <>{children}</>;
};
