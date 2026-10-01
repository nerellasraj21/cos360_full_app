import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { Building2, Database, Globe, Crown, CheckCircle, AlertTriangle } from 'lucide-react';
import type { SuperOrgFormData } from '@/types/organization';

// Mock plans data - should match PlanSelectionStep
const plans = [
    { id: 1, name: 'Starter', price: 29 },
    { id: 2, name: 'Professional', price: 79 },
    { id: 3, name: 'Enterprise', price: 199 }
];

export const ReviewStep: React.FC = () => {
    const { watch, setValue, register, formState: { errors } } = useFormContext<SuperOrgFormData>();

    const formData = watch();
    const selectedPlan = plans.find(plan => plan.id === formData.plan_id);

    const handleTermsChange = (checked: boolean) => {
        setValue('terms_accepted', checked, { shouldValidate: true });
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
                <h2 className="text-xl font-semibold">Review & Confirm</h2>
                <p className="text-muted-foreground">
                    Please review your organization details before creating
                </p>
            </div>

            <div className="grid gap-6">
                {/* Organization Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Organization Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Organization Name</Label>
                                <p className="font-medium">{formData.name || 'Not specified'}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Subdomain</Label>
                                <p className="font-medium flex items-center gap-1">
                                    <Globe className="w-4 h-4" />
                                    {formData.subdomain || 'Not specified'}.yourapp.com
                                </p>
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                            <p className="text-sm">{formData.description || 'No description provided'}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Technical Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5" />
                            Technical Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={formData.is_active} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Plan Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Crown className="w-5 h-5" />
                            Selected Plan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedPlan ? (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-lg">{selectedPlan.name} Plan</p>
                                    <p className="text-sm text-muted-foreground">
                                        Includes 14-day free trial
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">${selectedPlan.price}</p>
                                    <p className="text-sm text-muted-foreground">/month</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No plan selected</p>
                        )}
                    </CardContent>
                </Card>

                <Separator />

                {/* Terms and Conditions */}
                <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-800">
                            <AlertTriangle className="w-5 h-5" />
                            Terms & Conditions
                        </CardTitle>
                        <CardDescription className="text-orange-700">
                            Please review and accept our terms before proceeding
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="text-sm text-orange-800 space-y-2">
                                <p>By creating this organization, you agree to:</p>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>Our Terms of Service and Privacy Policy</li>
                                    <li>Responsible use of the platform and services</li>
                                    <li>Compliance with applicable laws and regulations</li>
                                    <li>Payment terms for the selected plan after trial period</li>
                                </ul>
                            </div>

                            <div className="flex items-start space-x-3 pt-2">
                                <Checkbox
                                    id="terms_accepted"
                                    checked={formData.terms_accepted}
                                    onCheckedChange={handleTermsChange}
                                    className="mt-1"
                                    {...register('terms_accepted', {
                                        required: 'You must accept the terms and conditions to continue'
                                    })}
                                />
                                <Label
                                    htmlFor="terms_accepted"
                                    className="text-sm leading-relaxed cursor-pointer"
                                >
                                    I have read and agree to the{' '}
                                    <a href="#" className="text-primary hover:underline">Terms of Service</a>
                                    {' '}and{' '}
                                    <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                                </Label>
                            </div>

                            {errors.terms_accepted && (
                                <p className="text-sm text-destructive">
                                    {errors.terms_accepted.message}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};