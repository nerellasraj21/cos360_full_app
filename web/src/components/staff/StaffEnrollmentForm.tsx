import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/DatePicker';
import { useCreateStaffEnrollment, useUpdateStaffEnrollment, useDesignationsDropdown } from '@/hooks/staff';
import { useRoles } from '@/api/auth';
import { toast } from 'sonner';

interface StaffEnrollmentFormProps {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Phone is optional, but if entered it must be exactly 10 digits.
// Returns a clear message indicating whether the number is too short or too long.
const validatePhoneMessage = (value: string): string => {
  if (!value) return ''; // optional
  if (!/^\d+$/.test(value)) return 'Phone number must contain digits only';
  if (value.length < 10) return `Number is less than 10 digits — you entered ${value.length}. Please enter exactly 10 digits`;
  if (value.length > 10) return `Number exceeds 10 digits — you entered ${value.length}. Please enter exactly 10 digits`;
  return '';
};

// True only when the value is exactly 10 digits (used to show the green "valid" hint).
const isValidPhone = (value: string): boolean => /^\d{10}$/.test(value);

export function StaffEnrollmentForm({ initialData, onSuccess, onCancel }: StaffEnrollmentFormProps) {
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [experienceError, setExperienceError] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [joiningDateError, setJoiningDateError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    gender: initialData?.gender || '',
    date_of_birth: initialData?.date_of_birth || '',
    joining_date: initialData?.joining_date || '',
    qualification: initialData?.qualification || '',
    experience_years: initialData?.experience_years || '',
    address: initialData?.address || '',
    designation_id: initialData?.designation_id || '',
    department: initialData?.department || '',
    role_id: initialData?.role_id || '',
    is_active: initialData?.is_active ?? true
  });

  const { data: designations = [] } = useDesignationsDropdown();
  const { data: roles = [] } = useRoles();
  const createMutation = useCreateStaffEnrollment();
  const updateMutation = useUpdateStaffEnrollment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextFirstNameError = formData.first_name.trim() ? '' : 'First name is required';
    const nextJoiningDateError = formData.joining_date ? '' : 'Joining date is required';
    const nextRoleError = formData.role_id ? '' : 'Role is required';
    const nextPhoneError = validatePhoneMessage(formData.phone);

    setFirstNameError(nextFirstNameError);
    setJoiningDateError(nextJoiningDateError);
    setRoleError(nextRoleError);
    setPhoneError(nextPhoneError);

    if (nextFirstNameError || nextJoiningDateError || nextRoleError || nextPhoneError || emailError || experienceError) {
      toast.error('Please fix the highlighted fields before saving');
      return;
    }

    try {
      const submitData = {
        ...formData,
        qualification: formData.qualification
          ? [...new Set(formData.qualification.split(',').map((s: string) => s.trim()).filter(Boolean))].join(', ')
          : formData.qualification,
        experience_years: formData.experience_years ? parseInt(formData.experience_years.toString()) : undefined
      };

      if (initialData?.id) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          data: submitData
        });
      } else {
        await createMutation.mutateAsync(submitData);
      }

      onSuccess?.();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="w-full max-w-2xl mx-auto flex flex-col max-h-[90vh]">
      <CardHeader className="flex-shrink-0">
        <CardTitle>{initialData ? 'Edit Staff Member' : 'Add New Staff Member'}</CardTitle>
        <CardDescription>
          {initialData ? 'Update staff member information' : 'Enter the details for the new staff member'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <CardContent className="overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFirstNameError(val.trim() ? '' : 'First name is required');
                      handleInputChange('first_name', val);
                    }}
                    placeholder="Enter first name"
                    required
                  />
                  {firstNameError && <span className="text-red-500 text-sm">{firstNameError}</span>}
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      const val = e.target.value;
                      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
                      setEmailError(val && !valid ? 'Please enter a valid email address' : '');
                      handleInputChange('email', val);
                    }}
                    placeholder="Enter email address"
                  />
                  {emailError && <span className="text-red-500">{emailError}</span>}
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    inputMode="numeric"
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPhoneError(validatePhoneMessage(val));
                      handleInputChange('phone', val);
                    }}
                    placeholder="Enter phone number"
                  />
                  {phoneError ? (
                    <span className="text-red-500 text-sm">{phoneError}</span>
                  ) : isValidPhone(formData.phone) && (
                    <span className="text-green-600 text-sm">Mobile number is valid</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <DatePicker
                    value={formData.date_of_birth}
                    onChange={(v) => handleInputChange('date_of_birth', v)}
                    placeholder="Select date of birth"
                  />
                </div>
                <div>
                  <Label>Joining Date *</Label>
                  <DatePicker
                    value={formData.joining_date}
                    onChange={(v) => {
                      setJoiningDateError(v ? '' : 'Joining date is required');
                      handleInputChange('joining_date', v);
                    }}
                    placeholder="Select joining date"
                    required
                  />
                  {joiningDateError && <span className="text-red-500 text-sm">{joiningDateError}</span>}
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Professional Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input
                    id="qualification"
                    value={formData.qualification}
                    onChange={(e) => handleInputChange('qualification', e.target.value)}
                    placeholder="e.g., Bachelor of Education"
                  />
                </div>
                <div>
                  <Label htmlFor="experience_years">Experience (Years)</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    min="0"
                    value={formData.experience_years}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExperienceError(val && Number(val) > 50 ? 'Experience cannot exceed 50 years' : '');
                      handleInputChange('experience_years', val);
                    }}
                    placeholder="Years of experience"
                  />
                  {experienceError && <span className="text-red-500">{experienceError}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="designation_id">Designation</Label>
                  <Select value={formData.designation_id} onValueChange={(value) => handleInputChange('designation_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((designation: any) => (
                        <SelectItem key={designation.id} value={designation.id}>
                          {designation.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    placeholder="e.g., Teaching, Administration"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="role_id">Role *</Label>
                <Select
                  value={formData.role_id}
                  onValueChange={(value) => {
                    setRoleError(value ? '' : 'Role is required');
                    handleInputChange('role_id', value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role: any) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {roleError && <span className="text-red-500 text-sm">{roleError}</span>}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address</h3>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter full address"
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
        </CardContent>

        {/* Fixed Action Buttons at Bottom */}
        <div className="flex-shrink-0 border-t bg-card px-6 py-4 flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : initialData ? 'Update Staff' : 'Add Staff'}
          </Button>
        </div>
      </form>
    </Card>
  );
}