import React, { useEffect, useState } from 'react';
import { flowApi } from '../services/flowApi';
import { Select } from '@so360/design-system';

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
        <Select
            name="role"
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled || loading}
            options={[
                { value: '', label: loading ? 'Loading roles...' : placeholder },
                ...roles.map(r => ({
                    value: r.role_id,
                    label: `${r.role_name} (${r.user_count} approver${r.user_count !== 1 ? 's' : ''})`,
                })),
            ]}
        />
    );
};
