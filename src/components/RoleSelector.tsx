import React, { useEffect, useState } from 'react';
import { flowApi } from '../services/flowApi';

interface RoleOption {
    role_id: string;
    role_name: string;
    user_count: number;
}

interface RoleSelectorProps {
    value: string;
    onChange: (roleId: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ value, onChange, disabled, placeholder = 'Select a role' }) => {
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        flowApi.getRoles()
            .then(res => setRoles(res.data || []))
            .catch(() => setRoles([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled || loading}
            className="w-full bg-slate-950 border border-slate-700 text-slate-100 px-3 py-1.5 rounded text-sm disabled:opacity-50"
        >
            <option value="">{loading ? 'Loading roles...' : placeholder}</option>
            {roles.map(r => (
                <option key={r.role_id} value={r.role_id}>
                    {r.role_name} ({r.user_count} approver{r.user_count !== 1 ? 's' : ''})
                </option>
            ))}
        </select>
    );
};
