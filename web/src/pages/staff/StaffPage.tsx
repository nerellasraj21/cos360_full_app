import { useState } from 'react';
import { MasterPage } from '@/pages/masters/common/MasterPage';
import type { Staff, StaffInput, StaffEnrollmentRequest, Designation } from '@/types/staff';
import type { FormField } from '@/pages/masters/common/MasterPage';
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useStaffEnrollmentMutation
} from '@/api/hooks/staff/staff';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const columns = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'gender', label: 'Gender' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'joining_date', label: 'Joining Date' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'experience_years', label: 'Experience Years' },
  { key: 'address', label: 'Address' },
  { key: 'designation', label: 'Designation' },
  { key: 'department', label: 'Department' },
  { key: 'is_active', label: 'Is Active' },
  { key: 'role_id', label: 'Role Id' },
];

const sections = [
  {
    key: 'personal',
    label: 'Personal Info',
    fields: [
      { name: 'first_name', label: 'First Name', type: 'text' as const, required: true },
      { name: 'last_name', label: 'Last Name', type: 'text' as const, required: false },
      { name: 'gender', label: 'Gender', type: 'text' as const, required: true },
    ],
  },
  {
    key: 'contact',
    label: 'Contact Info',
    fields: [
      { name: 'email', label: 'Email', type: 'text' as const, required: true },
      { name: 'phone', label: 'Phone', type: 'text' as const, required: false },
    ],
  },
  {
    key: 'employment',
    label: 'Employment Details',
    fields: [
      { name: 'joining_date', label: 'Joining Date', type: 'date' as const, required: true },
      { name: 'qualification', label: 'Qualification', type: 'text' as const, required: false },
      { name: 'department', label: 'Department', type: 'text' as const, required: false },
      { name: 'designation_id', label: 'Designation', type: 'text' as const, required: true },
    ],
  },
  {
    key: 'summary',
    label: 'Review',
    fields: [],
  },
];

const allFields = sections.flatMap((s) => s.fields);

const defaultValues: StaffEnrollmentRequest = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  gender: '',
  joining_date: '',
  qualification: '',
  department: '',
  designation_id: '',
};

export default function StaffPage() {
  const { data = [], isLoading } = useStaff();
  const createStaffMutation = useCreateStaff();
  const updateStaffMutation = useUpdateStaff();
  const deleteStaffMutation = useDeleteStaff();
  const staffEnrollmentMutation = useStaffEnrollmentMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<StaffEnrollmentRequest>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCreate = async (input: StaffEnrollmentRequest) => {
    await staffEnrollmentMutation.mutateAsync(input);
  };

  const validateStep = (): boolean => {
    const currentSection = sections[step];
    if (!currentSection || currentSection.key === 'summary') return true;

    const newErrors: Record<string, string> = {};
    let isValid = true;
    for (const field of currentSection.fields) {
      if (field.required) {
        const value = formData[field.name as keyof StaffEnrollmentRequest];
        if (value === null || value === undefined || String(value).trim() === '') {
          newErrors[field.name] = `${field.label} is required.`;
          isValid = false;
        }
      }
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleUpdate = async (id: string | number, input: Partial<StaffInput>) => {
    await updateStaffMutation.mutateAsync({ id: Number(id), input });
  };

  const handleDelete = async (id: string | number) => {
    await deleteStaffMutation.mutateAsync(Number(id));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNext = () => {
    if (validateStep()) {
      setErrors({});

      setStep((s) => Math.min(s + 1, sections.length - 1));
    }
  };
  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };
  const handleModalOpenChange = (open: boolean) => {
    setAddOpen(open);
    if (!open) {
      setStep(0);
      setFormData(defaultValues);
      setErrors({});
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();


    if (step === sections.length - 1) {
      await handleCreate(formData);
      setAddOpen(false);
      setStep(0);
      setFormData(defaultValues);
      setErrors({});
    }
  };

  function renderField(field: FormField) {
    const { name, label, type = 'text', required = false } = field;
    return (
      <div key={name} className="mb-4 w-full">
        <Label htmlFor={name} className="text-sm font-medium">{label}</Label>
        <Input
          id={name}
          name={name}
          type={type}
          value={formData[name as keyof StaffEnrollmentRequest] as string}
          onChange={handleInputChange}
          required={required}
          className={`mt-1 w-full ${errors[name] ? 'border-red-500' : ''}`}
        />
        {errors[name] && <p className="text-sm text-red-500 mt-1">{errors[name]}</p>}
      </div>
    );
  }

  function renderSummary() {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Review Staff Information</h3>
        <p className="text-sm text-muted-foreground mb-4">Please review all information before submitting</p>

        {sections.slice(0, 3).map((section) => (
          <div key={section.key} className="mb-6">
            <h4 className="text-md font-medium mb-3 pb-1 border-b">{section.label}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-2">
              {section.fields.map((field) => (
                <div key={field.name} className="flex flex-col sm:flex-row sm:justify-between py-1 break-words">
                  <span className="font-medium mr-2">{field.label}:</span>
                  <span className="text-muted-foreground">
                    {String(formData[field.name as keyof StaffEnrollmentRequest] ?? 'N/A')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function ProgressStepper() {
    return (
      <div className="flex items-center justify-between mb-6 px-2">
        {sections.map((section, idx) => (
          <div key={section.key} className="flex-1 flex flex-col items-center min-w-0">
            <div
              className={`rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center font-bold border-2 text-xs sm:text-sm ${step === idx ? 'bg-blue-500 text-white border-blue-500' : idx < step ? 'bg-blue-100 text-blue-600 border-blue-400' : 'bg-gray-200 text-gray-400 border-gray-300'}`}
            >
              {idx + 1}
            </div>
            <span className={`mt-1 sm:mt-2 text-xs sm:text-sm text-center truncate w-full ${step === idx ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
              {section.label}
            </span>
            {idx < sections.length - 1 && (
              <div className={`w-full h-0.5 sm:h-1 mt-1 ${idx < step ? 'bg-blue-400' : 'bg-gray-200'}`}></div>
            )}
          </div>
        ))}
      </div>
    );
  }

  const addModal = (
    <Dialog open={addOpen} onOpenChange={handleModalOpenChange}>
      <DialogTrigger asChild>
        <Button>Add Staff</Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <DialogTitle>Add New Staff</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} id="staff-form">
          <ProgressStepper />
          <div className="space-y-4 mt-6 px-1 sm:px-2">
            {step < sections.length - 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sections[step].fields.map(renderField)}
              </div>
            ) : (
              renderSummary()
            )}
          </div>
          <DialogFooter className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 px-1 sm:px-2">
            <div className="flex gap-2 order-2 sm:order-1">
              {step > 0 && (
                <Button type="button" variant="secondary" onClick={handleBack} className="w-full sm:w-auto">
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="flex-1 sm:flex-none">
                  Cancel
                </Button>
              </DialogClose>
              {step < sections.length - 1 ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNext();
                  }}
                  className="flex-1 sm:flex-none"
                >
                  {step === sections.length - 2 ? 'Review' : 'Next'}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createStaffMutation.isPending}
                  className="flex-1 sm:flex-none"
                >
                  Submit
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <MasterPage<Staff, StaffInput>
      config={{
        title: 'Staff',
        columns,
        defaultValues: defaultValues as any, // Type compatibility workaround
        formFields: allFields,
        isLoading,
        data,
        onCreate: handleCreate as any, // Type compatibility workaround
        onUpdate: handleUpdate,
        onDelete: handleDelete,
        isCreatePending: staffEnrollmentMutation.isPending,
        resetForm: () => { },
        showColumnSelector: true,
        addModal,
      }}
    />
  );
} 