import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useStaffProfile, useUpdateStaffProfile } from '@/api/hooks/staff/useStaffProfile';
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

interface ProfileFormData {
  email: string;
  phone: string;
}

const StaffProfile: React.FC = () => {
  const { data: profile, isLoading, error } = useStaffProfile();
  const updateMutation = useUpdateStaffProfile();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const form = useForm<ProfileFormData>({
    defaultValues: {
      email: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, form]);

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(
      { email: data.email, phone: data.phone },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-6">Loading staff profile...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error loading profile: {error.message}</div>;
  }

  if (!profile) {
    return <div className="p-6">No profile data available.</div>;
  }

  const personalFields = [
    { label: 'First Name', value: profile.first_name || 'N/A' },
    { label: 'Last Name', value: profile.last_name || 'N/A' },
    { label: 'Designation', value: profile.designation || 'N/A' },
    { label: 'Employee ID', value: profile.employee_id || 'N/A' },
    { label: 'Date of Joining', value: profile.date_of_joining || 'N/A' },
    { label: 'Status', value: profile.is_active ? 'Active' : 'Inactive' },
  ];

  const renderField = (field: { label: string; value: string }) => (
    <div key={field.label} className="flex justify-between items-center py-2">
      <span className="font-medium">{field.label}:</span>
      <span className="text-muted-foreground">{field.value}</span>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Staff Profile</h1>
      <div className="flex justify-center mb-6">
        {profile.profile_photo_url ? (
          <img src={profile.profile_photo_url} alt="Profile Picture" className="w-24 h-24 rounded-full object-cover" />
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
          <div className="flex justify-between items-center py-2">
            <span className="font-medium">Phone:</span>
            <span className="text-muted-foreground">{profile.phone || 'N/A'}</span>
          </div>
          <div className="mt-2">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} guardDirty={form.formState.isDirty} onDirtyDiscard={() => form.reset()}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="text-xs">
                  edit email & phone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Email & Phone</DialogTitle>
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
                    <FormField
                      control={form.control}
                      name="phone"
                      rules={{
                        required: 'Phone is required',
                        pattern: {
                          value: /^\d{10}$/,
                          message: 'Phone must be 10 digits',
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" />
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

    </div>
  );
};

export default StaffProfile;