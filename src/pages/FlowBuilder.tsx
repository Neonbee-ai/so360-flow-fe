import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2 } from 'lucide-react';
import { useActivity, useShellBridge } from '@so360/shell-context';
import { toast, Select, Button, Card, EmptyState, FormPageTemplate, IconButton, Stack, TextField, Textarea, Checkbox, RadioGroup, Grid, GridItem, Skeleton } from '@so360/design-system';
import { flowApi } from '../services/flowApi';
import type { FlowDefinition, FlowState, FlowTransition } from '../types/flow';

export const FlowBuilder = () => {
    const { flowId } = useParams<{ flowId: string }>();
    const navigate = useNavigate();
    const isNew = flowId === 'new';
    const { recordActivity } = useActivity();
    const shell = useShellBridge();
    const canAccessBuilder = (shell?.effectiveFlagsLoaded !== false) && (shell?.isFeatureEnabled?.('submodule:flow:builder') ?? true);

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [moduleCode, setModuleCode] = useState('');
    const [scope, setScope] = useState<'all_projects' | 'selective_projects'>('all_projects');
    const [states, setStates] = useState<FlowState[]>([]);
    const [transitions, setTransitions] = useState<FlowTransition[]>([]);

    const modules = [
        { code: 'module:crm:lead', name: 'CRM - Leads' },
        { code: 'module:crm:deal', name: 'CRM - Deals' },
        { code: 'module:projects:task', name: 'Projects - Tasks' },
        { code: 'module:projects:stages', name: 'Projects - Stages' },
        { code: 'module:projects:lifecycle', name: 'Projects - Lifecycle' },
        { code: 'module:procurement:purchase_request', name: 'Procurement - Purchase Requests' },
        { code: 'module:procurement:purchase_order', name: 'Procurement - Purchase Orders' },
        { code: 'module:timesheet:batch', name: 'Timesheet - Batches' },
        { code: 'module:accounting:expense', name: 'Accounting - Expenses' },
        { code: 'module:accounting:invoice', name: 'Accounting - Invoices' },
        { code: 'module:dailystore:order', name: 'Daily Store - Orders' },
        { code: 'module:fulfillment:order', name: 'Fulfillment - Orders' },
        { code: 'module:inbox:conversation', name: 'Inbox - Conversations' },
        { code: 'module:inventory:item', name: 'Inventory - Items' },
        { code: 'module:people:leave', name: 'People Connect - Leave Requests' },
        { code: 'module:support:ticket', name: 'Support - Tickets' },
    ];

    useEffect(() => {
        if (!isNew && flowId) {
            loadFlow();
        }
    }, [flowId, isNew]);

    const loadFlow = async () => {
        try {
            const response = await flowApi.getFlowDefinition(flowId!);
            const flow = response.data;
            setName(flow.name);
            setDescription(flow.description || '');
            setModuleCode(flow.module_code);
            setScope(flow.metadata?.scope || (flow.metadata?.is_default ? 'all_projects' : 'all_projects'));
            setStates(flow.states || []);
            setTransitions(flow.transitions || []);
        } catch (error) {
            console.error('Failed to load flow:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const data = {
                name,
                description,
                module_code: moduleCode,
                states,
                transitions,
                metadata: {
                    scope,
                    is_default: scope === 'all_projects',
                    applicable_to_all: scope === 'all_projects',
                },
            };

            if (isNew) {
                const created = await flowApi.createFlowDefinition(data);
                recordActivity({
                    eventType: 'flow.created',
                    eventCategory: 'system',
                    description: `Created flow "${name}"`,
                    resourceType: 'flow',
                    resourceId: created.data?.id,
                }).catch(() => {});
            } else {
                await flowApi.updateFlowDefinition(flowId!, data);
                recordActivity({
                    eventType: 'flow.updated',
                    eventCategory: 'system',
                    description: `Updated flow "${name}"`,
                    resourceType: 'flow',
                    resourceId: flowId!,
                }).catch(() => {});
            }

            toast.success(isNew ? 'Flow created' : 'Flow updated');
            navigate('/flow');
        } catch (error) {
            console.error('Failed to save flow:', error);
            // Error toast comes from the flowApi interceptor.
        } finally {
            setSaving(false);
        }
    };

    const addState = () => {
        setStates([
            ...states,
            {
                code: '',
                name: '',
                color: '#94a3b8', // comb-exception: persisted default state colour (data, not styling)
                is_initial: states.length === 0,
                is_terminal: false,
            },
        ]);
    };

    const removeState = (index: number) => {
        setStates(states.filter((_, i) => i !== index));
        // Remove transitions involving this state
        const stateCode = states[index].code;
        setTransitions(
            transitions.filter((t) => t.from_state !== stateCode && t.to_state !== stateCode)
        );
    };

    const addTransition = () => {
        setTransitions([
            ...transitions,
            {
                code: '',
                name: '',
                from_state: '',
                to_state: '',
            },
        ]);
    };

    const removeTransition = (index: number) => {
        setTransitions(transitions.filter((_, i) => i !== index));
    };

    if (!canAccessBuilder) {
        return (
            <FormPageTemplate title="Workflow Builder" trail={[{ label: 'Flow', onClick: () => navigate('/flow') }]}>
                <EmptyState title="Workflow Builder" description="This feature is not available on your current plan." />
            </FormPageTemplate>
        );
    }

    if (loading) {
        return (
            <FormPageTemplate title={isNew ? 'New Flow' : 'Edit Flow'} trail={[{ label: 'Flows', onClick: () => navigate('/flow') }]}>
                <div role="status" aria-busy="true" className="p-4"><span className="sr-only">Loading…</span><Skeleton variant="rect" className="h-10 w-1/3 mb-4" /><Skeleton lines={6} /></div>
            </FormPageTemplate>
        );
    }

    return (
        <FormPageTemplate
            title={isNew ? 'New Flow' : 'Edit Flow'}
            trail={[{ label: 'Flows', onClick: () => navigate('/flow') }]}
            onCancel={() => navigate('/flow')}
            primaryAction={
                <Button
                    onClick={handleSave}
                    disabled={saving || !name || !moduleCode || states.length === 0}
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Flow'}
                </Button>
            }
            sections={[
                {
                    id: 'info',
                    title: 'Flow Information',
                    content: (
                        <div className="md:col-span-2">
                            <Stack gap="default">
                                <TextField
                            name="flow-name"
                            label="Flow Name *"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Lead Approval Flow"
                        />
                        <Textarea
                            name="flow-description"
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Describe this workflow..."
                        />
                        <Select
                            name="module-code"
                            label="Module *"
                            value={moduleCode}
                            onChange={(e) => setModuleCode(e.target.value)}
                            options={[{ value: '', label: 'Select Module' }, ...modules.map((mod) => ({ value: mod.code, label: mod.name }))]}
                        />
                        {moduleCode === 'module:projects:stages' && (
                            <div className="p-4 rounded-lg bg-primary-container/40 border border-primary/50 space-y-2">
                                <span className="text-sm font-semibold text-primary block">
                                    Project Scope & Applicability
                                </span>
                                <p className="text-xs text-fg-muted leading-relaxed">
                                    Define how these stages are applied across your organization. "All Projects" sets this flow as the default stage pipeline, while "Selective Projects" lets project managers opt-in or select custom stages during project setup.
                                </p>
                                <RadioGroup
                                    name="scope"
                                    label="Scope"
                                    orientation="horizontal"
                                    value={scope}
                                    onChange={(v) => setScope(v as typeof scope)}
                                    options={[
                                        { value: 'all_projects', label: 'All Projects in this Organization (Default)' },
                                        { value: 'selective_projects', label: 'Selective Projects (Project-Level Applicability)' },
                                    ]}
                                />
                            </div>
                        )}
                            </Stack>
                        </div>
                    ),
                },
                {
                    id: 'states',
                    title: 'States',
                    content: (
                        <div className="md:col-span-2">
                            <Stack gap="default">
                                {states.map((state, index) => (
                            <Card key={index}>
                                <Grid columns="auto" gap="sm" className="mb-3">
                                    <GridItem span={6}>
                                        <TextField
                                            name={`state-code-${index}`}
                                            label="Code *"
                                            size="sm"
                                            value={state.code}
                                            onChange={(e) => {
                                                const updated = [...states];
                                                updated[index].code = e.target.value;
                                                setStates(updated);
                                            }}
                                            placeholder="e.g., draft"
                                        />
                                    </GridItem>
                                    <GridItem span={6}>
                                        <TextField
                                            name={`state-name-${index}`}
                                            label="Name *"
                                            size="sm"
                                            value={state.name}
                                            onChange={(e) => {
                                                const updated = [...states];
                                                updated[index].name = e.target.value;
                                                setStates(updated);
                                            }}
                                            placeholder="e.g., Draft"
                                        />
                                    </GridItem>
                                </Grid>
                                <div className="flex items-center gap-4 mb-3">
                                    <Checkbox
                                        name={`state-is_initial-${index}`}
                                        label="Initial State"
                                        checked={state.is_initial || false}
                                        onChange={(e) => {
                                            const updated = [...states];
                                            updated[index].is_initial = e.target.checked;
                                            setStates(updated);
                                        }}
                                    />
                                    <Checkbox
                                        name={`state-is_terminal-${index}`}
                                        label="Terminal State"
                                        checked={state.is_terminal || false}
                                        onChange={(e) => {
                                            const updated = [...states];
                                            updated[index].is_terminal = e.target.checked;
                                            setStates(updated);
                                        }}
                                    />
                                    {moduleCode === 'module:projects:stages' && (
                                        <Checkbox
                                        name={`state-is_mandatory-${index}`}
                                        label="Mandatory for All Projects"
                                        checked={state.is_mandatory || false}
                                        onChange={(e) => {
                                            const updated = [...states];
                                            updated[index].is_mandatory = e.target.checked;
                                            setStates(updated);
                                        }}
                                    />
                                    )}
                                    <IconButton className="ml-auto" label="Remove state" icon={<Trash2 className="w-4 h-4" />} onClick={() => removeState(index)} />
                                </div>
                            </Card>
                        ))}
                                <div>
                                    <Button variant="secondary" size="sm" onClick={addState}>
                                        <Plus className="w-4 h-4" />
                                        Add State
                                    </Button>
                                </div>
                            </Stack>
                        </div>
                    ),
                },
                {
                    id: 'transitions',
                    title: 'Transitions',
                    content: (
                        <div className="md:col-span-2">
                            <Stack gap="default">
                                {transitions.map((transition, index) => (
                            <Card key={index}>
                                <Grid columns="auto" gap="sm" className="mb-3">
                                    <GridItem span={6}>
                                        <TextField
                                            name={`transition-code-${index}`}
                                            label="Code *"
                                            size="sm"
                                            value={transition.code}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].code = e.target.value;
                                                setTransitions(updated);
                                            }}
                                            placeholder="e.g., submit"
                                        />
                                    </GridItem>
                                    <GridItem span={6}>
                                        <TextField
                                            name={`transition-name-${index}`}
                                            label="Name *"
                                            size="sm"
                                            value={transition.name}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].name = e.target.value;
                                                setTransitions(updated);
                                            }}
                                            placeholder="e.g., Submit for Review"
                                        />
                                    </GridItem>
                                </Grid>
                                <Grid columns="auto" gap="sm">
                                    <GridItem span={6}>
                                        <Select
                                            name={`transition-from_state-${index}`}
                                            label="From State *"
                                            size="sm"
                                            value={transition.from_state}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].from_state = e.target.value;
                                                setTransitions(updated);
                                            }}
                                            placeholder="Select State"
                                            options={states.map((s) => ({ value: s.code, label: s.name }))}
                                        />
                                    </GridItem>
                                    <GridItem span={6}>
                                        <Select
                                            name={`transition-to_state-${index}`}
                                            label="To State *"
                                            size="sm"
                                            value={transition.to_state}
                                            onChange={(e) => {
                                                const updated = [...transitions];
                                                updated[index].to_state = e.target.value;
                                                setTransitions(updated);
                                            }}
                                            placeholder="Select State"
                                            options={states.map((s) => ({ value: s.code, label: s.name }))}
                                        />
                                    </GridItem>
                                </Grid>
                                <div className="flex items-center justify-between mt-3">
                                    <Checkbox
                                        name={`transition-requires_approval-${index}`}
                                        label="Requires Approval"
                                        checked={transition.requires_approval || false}
                                        onChange={(e) => {
                                            const updated = [...transitions];
                                            updated[index].requires_approval = e.target.checked;
                                            setTransitions(updated);
                                        }}
                                    />
                                    <IconButton label="Remove transition" icon={<Trash2 className="w-4 h-4" />} onClick={() => removeTransition(index)} />
                                </div>
                            </Card>
                        ))}
                                <div>
                                    <Button variant="secondary" size="sm" onClick={addTransition}>
                                        <Plus className="w-4 h-4" />
                                        Add Transition
                                    </Button>
                                </div>
                            </Stack>
                        </div>
                    ),
                },
            ]}
        />
    );
};
