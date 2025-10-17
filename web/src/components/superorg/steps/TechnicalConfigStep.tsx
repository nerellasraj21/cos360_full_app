import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Settings, Info, CheckCircle } from 'lucide-react';
import type { SuperOrgFormData } from '@/types/organization';

export const TechnicalConfigStep: React.FC = () => {
    const { register, formState: { errors }, watch, setValue } = useFormContext<SuperOrgFormData>();

    const schemaName = watch('schema_name');
    const isActive = watch('is_active');
    const orgName = watch('name');

    // Auto-generate schema name based on organization name
    React.useEffect(() => {
        if (orgName && !schemaName) {
            const generatedSchema = orgName
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            setValue('schema_name', `${generatedSchema}_db`);
        }
    }, [orgName, schemaName, setValue]);

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <Settings className="w-12 h-12 text-primary mx-auto mb-3" />
                <h2 className="text-xl font-semibold">Technical Configuration</h2>
                <p className="text-muted-foreground">
                    Configure the technical aspects of your organization's setup
                </p>
            </div>

            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    These settings configure the database and system-level parameters for your organization.
                    Most settings can be changed later if needed.
                </AlertDescription>
            </Alert>

            <div className="grid gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Database className="w-5 h-5" />
                            Database Configuration
                        </CardTitle>
                        <CardDescription>
                            Configure the database schema for your organization's data isolation
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="schema_name" className="flex items-center gap-2">
                                <Database className="w-4 h-4" />
                                Database Schema Name *
                            </Label>
                            <Input
                                id="schema_name"
                                placeholder="organization_schema_db"
                                {...register('schema_name', {
                                    required: 'Schema name is required',
                                    pattern: {
                                        value: /^[a-z][a-z0-9_]*$/,
                                        message: 'Schema name must start with a letter and contain only lowercase letters, numbers, and underscores'
                                    },
                                    minLength: { value: 3, message: 'Schema name must be at least 3 characters' }
                                })}
                                className={errors.schema_name ? 'border-destructive' : ''}
                            />
                            <p className="text-xs text-muted-foreground">
                                This will be used as the database schema name for data isolation.
                                It should be unique and follow database naming conventions.
                            </p>
                            {errors.schema_name && (
                                <p className="text-sm text-destructive">{errors.schema_name.message}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CheckCircle className="w-5 h-5" />
                            Organization Status
                        </CardTitle>
                        <CardDescription>
                            Control the active status of your organization
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="is_active" className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Active Status
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    When enabled, users can access and use the organization's services
                                </p>
                            </div>
                            <Switch
                                id="is_active"
                                checked={isActive}
                                onCheckedChange={(checked) => setValue('is_active', checked)}
                            />
                        </div>

                        <Alert className={isActive ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                            <CheckCircle className={`h-4 w-4 ${isActive ? 'text-green-600' : 'text-yellow-600'}`} />
                            <AlertDescription className={isActive ? 'text-green-800' : 'text-yellow-800'}>
                                {isActive
                                    ? 'Organization will be active and accessible to users immediately after creation.'
                                    : 'Organization will be created in inactive state. You can activate it later from the management panel.'
                                }
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};