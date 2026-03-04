import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAdminProfile, useUpdateAdminProfile, useChangeAdminPassword } from '@/api/hooks/admin/useAdminProfile';
import { useAuthStore } from '@/lib/authStore';
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
import { toast } from 'sonner';

interface EmailFormData {
  email: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const AdminProfile: React.FC = () => {
  const { user } = useAuthStore();
  const userId = user?.id;

  if (!userId) {
    return <div className="p-6">No user ID available.</div>;
  }

  const { data: profile, isLoading, error } = useAdminProfile(userId);
  const updateMutation = useUpdateAdminProfile(userId);
  const changePasswordMutation = useChangeAdminPassword();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  const emailForm = useForm<EmailFormData>({
    defaultValues: {
      email: '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  useEffect(() => {
    if (profile) {
      emailForm.reset({
        email: profile.email || '',
      });
    }
  }, [profile, emailForm]);

  const onSubmitEmail = (data: EmailFormData) => {
    updateMutation.mutate(
      { email: data.email },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
        },
      }
    );
  };

  const onSubmitPassword = (data: PasswordFormData) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('New password and confirm password do not match.');
      return;
    }
    changePasswordMutation.mutate(
      {
        current_password: data.current_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      },
      {
        onSuccess: () => {
          setIsPasswordDialogOpen(false);
          passwordForm.reset();
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-6">Loading admin profile...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error loading profile: {error.message}</div>;
  }

  if (!profile) {
    return <div className="p-6">No profile data available.</div>;
  }

  const profileFields = [
    { label: 'Username', value: profile.username || 'N/A' },
    { label: 'Email', value: profile.email || 'N/A' },
    { label: 'Status', value: profile.is_active ? 'Active' : 'Inactive' },
    { label: 'Role', value: profile.role?.name || 'N/A' },
  ];

  const renderField = (field: { label: string; value: string }) => (
    <div key={field.label} className="flex justify-between items-center py-2">
      <span className="font-medium">{field.label}:</span>
      <span className="text-muted-foreground">{field.value}</span>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          {profileFields.map(renderField)}
          <div className="mt-4 space-x-2">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} guardDirty={emailForm.formState.isDirty} onDirtyDiscard={() => emailForm.reset()}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm">
                  Edit Email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Email</DialogTitle>
                </DialogHeader>
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
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

            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} guardDirty={passwordForm.formState.isDirty} onDirtyDiscard={() => passwordForm.reset()}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="current_password"
                      rules={{
                        required: 'Current password is required',
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="new_password"
                      rules={{
                        required: 'New password is required',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters',
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirm_password"
                      rules={{
                        required: 'Confirm password is required',
                        validate: (value) =>
                          value === passwordForm.watch('new_password') || 'Passwords do not match',
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" />
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
                      <Button type="submit" disabled={changePasswordMutation.isPending}>
                        {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
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

export default AdminProfile;