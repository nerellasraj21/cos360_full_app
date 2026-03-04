import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useStudentProfile, useUpdateStudentProfile } from '@/api/hooks/students/useStudentProfile';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { User } from 'lucide-react';

interface EmailFormData {
  email: string;
}

const StudentProfile: React.FC = () => {
  const { data: profile, isLoading, error } = useStudentProfile();
  const updateMutation = useUpdateStudentProfile();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const form = useForm<EmailFormData>({
    defaultValues: {
      email: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({ email: profile.email || '' });
    }
  }, [profile, form]);

  const onSubmit = (data: EmailFormData) => {
    updateMutation.mutate(
      { email: data.email },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-6">Loading student profile...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error loading profile: {error.message}</div>;
  }

  if (!profile) {
    return <div className="p-6">No profile data available.</div>;
  }

  const personalFields = [
    { label: 'First Name', value: profile.first_name },
    { label: 'Last Name', value: profile.last_name },
    { label: 'Phone', value: profile.phone || 'N/A' },
    { label: 'Date of Birth', value: profile.date_of_birth || 'N/A' },
    { label: 'Address', value: profile.address || 'N/A' },
    { label: 'Emergency Contact', value: profile.emergency_contact || 'N/A' },
    { label: 'Blood Group', value: profile.blood_group || 'N/A' },
  ];

  const academicFields = [
    { label: 'Admission Number', value: profile.admission_number || 'N/A' },
    { label: 'Roll Number', value: profile.roll_number || 'N/A' },
    { label: 'Class', value: profile.class_name || 'N/A' },
    { label: 'Section', value: profile.section_name || 'N/A' },
    { label: 'Academic Year', value: profile.academic_year || 'N/A' },
  ];


  const renderField = (field: { label: string; value: string }) => (
    <div key={field.label} className="flex justify-between items-center py-2">
      <span className="font-medium">{field.label}:</span>
      <span className="text-muted-foreground">{field.value}</span>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Student Profile</h1>
      <div className="flex justify-center mb-6">
        {profile.profile_picture_url ? (
          <img src={profile.profile_picture_url} alt="Profile Picture" className="w-24 h-24 rounded-full object-cover" />
        ) : (
          <User className="w-24 h-24 text-gray-400" />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          {personalFields.map(renderField)}
          <div className="flex justify-between items-center py-2">
            <span className="font-medium">Email:</span>
            <span className="text-muted-foreground">{profile.email || 'N/A'}</span>
          </div>
          <div className="mt-2">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} guardDirty={form.formState.isDirty} onDirtyDiscard={() => form.reset()}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="text-xs">
                  edit email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Email</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      rules={{
                        required: 'Email is required',
                        pattern: {
                          value: /^\S+@\S+$/i,
                          message: 'Invalid email address',
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Updating...' : 'Update'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic Information</CardTitle>
        </CardHeader>
        <CardContent>
          {academicFields.map((field) => (
            <div key={field.label} className="flex justify-between items-center py-2">
              <span className="font-medium">{field.label}:</span>
              <span className="text-muted-foreground">{field.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
};

export default StudentProfile;