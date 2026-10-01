import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Info, CheckCircle } from 'lucide-react';
import type { SuperOrgFormData } from '@/types/organization';

export const TechnicalConfigStep: React.FC = () => {
    const { watch, setValue } = useFormContext<SuperOrgFormData>();

    const isActive = watch('is_active');

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
                    These settings configure the system-level parameters for your organization.
                    Most settings can be changed later if needed.
                </AlertDescription>
            </Alert>

            <div className="grid gap-6">
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