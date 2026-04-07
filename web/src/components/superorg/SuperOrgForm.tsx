import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { TechnicalConfigStep } from './steps/TechnicalConfigStep';
import { PlanSelectionStep } from './steps/PlanSelectionStep';
import { ReviewStep } from './steps/ReviewStep';
import { useCreateOrganization } from '@/api/organizations';
import type { SuperOrgFormData, OrganizationRead } from '@/types/organization';
import { toast } from 'sonner';

interface SuperOrgFormProps {
    onComplete: (newOrg?: OrganizationRead) => void;
}

const steps = [
    { id: 'basic', title: 'Basic Information', Component: BasicInfoStep, icon: Building2 },
    { id: 'technical', title: 'Technical Config', Component: TechnicalConfigStep, icon: Building2 },
    { id: 'plan', title: 'Plan Selection', Component: PlanSelectionStep, icon: Building2 },
    { id: 'review', title: 'Review & Confirm', Component: ReviewStep, icon: Building2 },
];

// Dummy data for testing
const dummyData: SuperOrgFormData = {
    name: 'Acme Education Institute',
    description: 'A premier educational institution focused on excellence in learning and development.',
    subdomain: 'acme-edu',
    schema_name: 'acme_education_db',
    is_active: true,
    plan_id: 2,
    terms_accepted: false,
};

const SuperOrgForm: React.FC<SuperOrgFormProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const createOrganizationMutation = useCreateOrganization();

    const methods = useForm<SuperOrgFormData>({
        defaultValues: {
            is_active: true,
            terms_accepted: false,
        }
    });

    const { handleSubmit, trigger, reset, watch } = methods;
    const isSubmitting = createOrganizationMutation.isPending;

    const nextStep = async () => {
        const currentStepFields = getStepFields(currentStep);
        const isValid = await trigger(currentStepFields);

        if (isValid && currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const getStepFields = (stepIndex: number): (keyof SuperOrgFormData)[] => {
        switch (stepIndex) {
            case 0: // Basic Information
                return ['name', 'description', 'subdomain'];
            case 1: // Technical Configuration
                return ['schema_name', 'is_active'];
            case 2: // Plan Selection
                return ['plan_id'];
            case 3: // Review & Confirmation
                return ['terms_accepted'];
            default:
                return [];
        }
    };

    const fillWithDummyData = () => {
        reset(dummyData);
    };

    const onSubmit = async (data: SuperOrgFormData) => {
        // Validate terms acceptance before submission
        if (!data.terms_accepted) {
            toast.error('Please accept the terms and conditions to continue.');
            return;
        }

        try {
            console.log('Submitting organization data:', data);

            // Prepare data for API call
            const organizationData = {
                name: data.name,
                description: data.description,
                subdomain: data.subdomain,
                schema_name: data.schema_name,
                is_active: data.is_active,
                plan_id: data.plan_id,
            };

            // Use the mutation hook to create organization
            const result = await createOrganizationMutation.mutateAsync(organizationData);

            // Success is handled by the mutation hook (toast notification)
            onComplete(result);
        } catch (error) {
            console.error('Failed to create organization:', error);
            // Error is handled by the mutation hook (toast notification)
        }
    };

    const CurrentStepComponent = steps[currentStep].Component;

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Header with Dummy Data Button */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <Building2 className="w-6 h-6 text-primary" />
                        <div>
                            <h3 className="text-lg font-semibold">Create Super Organization</h3>
                            <p className="text-sm text-muted-foreground">Step {currentStep + 1} of {steps.length}</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fillWithDummyData}
                        className="text-xs"
                    >
                        Fill with Sample Data
                    </Button>
                </div>

                {/* Step Progress Indicator */}
                <div className="flex items-center justify-between mb-8">
                    {steps.map((step, index) => {
                        const StepIcon = step.icon;
                        return (
                            <div key={step.id} className="flex items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 ${index <= currentStep
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-muted-foreground border-muted'
                                        }`}
                                >
                                    {index < currentStep ? (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <StepIcon className="w-5 h-5" />
                                    )}
                                </div>
                                <div className="ml-3 hidden sm:block">
                                    <span
                                        className={`text-sm font-medium ${index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                                            }`}
                                    >
                                        {step.title}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`w-12 h-0.5 mx-4 ${index < currentStep ? 'bg-primary' : 'bg-muted'
                                            }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Current Step Form */}
                <div className="min-h-[400px] bg-card rounded-lg border p-6">
                    <CurrentStepComponent />
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={currentStep === 0 ? () => onComplete() : prevStep}
                        className="flex items-center gap-2"
                        disabled={isSubmitting}
                    >
                        {currentStep === 0 ? (
                            'Cancel'
                        ) : (
                            <>
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </>
                        )}
                    </Button>

                    {currentStep === steps.length - 1 ? (
                        <Button
                            type="submit"
                            className="flex items-center gap-2"
                            disabled={isSubmitting || !watch('terms_accepted')}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Organization'
                            )}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={nextStep}
                            className="flex items-center gap-2"
                            disabled={isSubmitting}
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </form>
        </FormProvider>
    );
};

export default SuperOrgForm;