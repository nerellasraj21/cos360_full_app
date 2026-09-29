import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Building } from 'lucide-react';
import type { SuperOrgFormData, Plan } from '@/types/organization';

// Mock plans data - replace with API call
const plans: Plan[] = [
    {
        id: 1,
        name: 'Starter',
        description: 'Perfect for small organizations getting started',
        price: 29,
        features: [
            'Up to 100 students',
            'Basic reporting',
            'Email support',
            'Standard templates',
            '5GB storage'
        ]
    },
    {
        id: 2,
        name: 'Professional',
        description: 'Ideal for growing educational institutions',
        price: 79,
        features: [
            'Up to 500 students',
            'Advanced reporting & analytics',
            'Priority support',
            'Custom templates',
            '25GB storage',
            'API access',
            'Custom branding'
        ]
    },
    {
        id: 3,
        name: 'Enterprise',
        description: 'For large institutions with advanced needs',
        price: 199,
        features: [
            'Unlimited students',
            'Full analytics suite',
            '24/7 dedicated support',
            'Unlimited custom templates',
            '100GB storage',
            'Full API access',
            'White-label solution',
            'Advanced integrations',
            'Custom development'
        ]
    }
];

export const PlanSelectionStep: React.FC = () => {
    const { watch, setValue, register, formState: { errors } } = useFormContext<SuperOrgFormData>();

    const selectedPlanId = watch('plan_id');

    const handlePlanSelect = (planId: number) => {
        setValue('plan_id', planId, { shouldValidate: true });
    };

    const getPlanIcon = (planName: string) => {
        switch (planName.toLowerCase()) {
            case 'starter':
                return Building;
            case 'professional':
                return Zap;
            case 'enterprise':
                return Crown;
            default:
                return Building;
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <Crown className="w-12 h-12 text-primary mx-auto mb-3" />
                <h2 className="text-xl font-semibold">Choose Your Plan</h2>
                <p className="text-muted-foreground">
                    Select the plan that best fits your organization's needs
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {plans.map((plan) => {
                    const PlanIcon = getPlanIcon(plan.name);
                    const isSelected = selectedPlanId === plan.id;
                    const isPopular = plan.name === 'Professional';

                    return (
                        <Card
                            key={plan.id}
                            className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected
                                ? 'ring-2 ring-primary border-primary shadow-lg'
                                : 'hover:border-primary/50'
                                }`}
                            onClick={() => handlePlanSelect(plan.id)}
                        >
                            {isPopular && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <Badge className="bg-primary text-primary-foreground">
                                        Most Popular
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="text-center pb-4">
                                <div className="flex justify-center mb-2">
                                    <div className={`p-3 rounded-full ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                        }`}>
                                        <PlanIcon className="w-6 h-6" />
                                    </div>
                                </div>
                                <CardTitle className="text-xl">{plan.name}</CardTitle>
                                <CardDescription className="text-sm">
                                    {plan.description}
                                </CardDescription>
                                <div className="mt-4">
                                    <span className="text-3xl font-bold">${plan.price}</span>
                                    <span className="text-muted-foreground">/month</span>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                <ul className="space-y-3">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {isSelected && (
                                    <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                        <div className="flex items-center gap-2 text-primary">
                                            <Check className="w-4 h-4" />
                                            <span className="text-sm font-medium">Selected Plan</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <input
                type="hidden"
                {...register('plan_id', {
                    required: 'Please select a plan to continue',
                    validate: (value) => value > 0 || 'Please select a plan to continue'
                })}
            />

            {errors.plan_id && (
                <p className="text-sm text-destructive text-center">
                    {errors.plan_id.message}
                </p>
            )}

            <div className="text-center text-sm text-muted-foreground">
                <p>All plans include a 14-day free trial. No credit card required.</p>
                <p>You can upgrade or downgrade your plan at any time.</p>
            </div>
        </div>
    );
};