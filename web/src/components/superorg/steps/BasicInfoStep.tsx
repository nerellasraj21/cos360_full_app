import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Globe, FileText } from 'lucide-react';
import type { SuperOrgFormData } from '@/types/organization';

export const BasicInfoStep: React.FC = () => {
    const { register, formState: { errors }, watch } = useFormContext<SuperOrgFormData>();

    const subdomain = watch('subdomain');

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <Building2 className="w-12 h-12 text-primary mx-auto mb-3" />
                <h2 className="text-xl font-semibold">Basic Organization Information</h2>
                <p className="text-muted-foreground">
                    Let's start with the fundamental details about your organization
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Building2 className="w-5 h-5" />
                            Organization Details
                        </CardTitle>
                        <CardDescription>
                            Provide the basic information about your organization
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Organization Name *
                            </Label>
                            <Input
                                id="name"
                                placeholder="Enter organization name"
                                {...register('name', {
                                    required: 'Organization name is required',
                                    minLength: { value: 3, message: 'Name must be at least 3 characters' }
                                })}
                                className={errors.name ? 'border-destructive' : ''}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Description *
                            </Label>
                            <Textarea
                                id="description"
                                placeholder="Describe your organization's mission and purpose"
                                rows={3}
                                {...register('description', {
                                    required: 'Description is required',
                                    minLength: { value: 10, message: 'Description must be at least 10 characters' }
                                })}
                                className={errors.description ? 'border-destructive' : ''}
                            />
                            {errors.description && (
                                <p className="text-sm text-destructive">{errors.description.message}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Globe className="w-5 h-5" />
                            Web Presence
                        </CardTitle>
                        <CardDescription>
                            Configure your organization's online identity
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="subdomain" className="flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Subdomain *
                            </Label>
                            <div className="flex items-center space-x-2">
                                <Input
                                    id="subdomain"
                                    placeholder="your-org"
                                    {...register('subdomain', {
                                        required: 'Subdomain is required',
                                        pattern: {
                                            value: /^[a-z0-9-]+$/,
                                            message: 'Subdomain can only contain lowercase letters, numbers, and hyphens'
                                        },
                                        minLength: { value: 3, message: 'Subdomain must be at least 3 characters' }
                                    })}
                                    className={`flex-1 ${errors.subdomain ? 'border-destructive' : ''}`}
                                />
                                <span className="text-muted-foreground">.yourapp.com</span>
                            </div>
                            {subdomain && (
                                <p className="text-sm text-muted-foreground">
                                    Your organization will be accessible at: <strong>{subdomain}.yourapp.com</strong>
                                </p>
                            )}
                            {errors.subdomain && (
                                <p className="text-sm text-destructive">{errors.subdomain.message}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};