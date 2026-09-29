import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, X } from 'lucide-react';
import { updateParentProfile } from '@/api/parent';
import { toast } from 'sonner';
import type { ParentProfileOut, ParentProfileUpdate } from '@/types/parent';

interface ParentProfileEditProps {
  profile: ParentProfileOut;
  onSave: (updatedProfile: ParentProfileOut) => void;
  onCancel: () => void;
}

export function ParentProfileEdit({ profile, onSave, onCancel }: ParentProfileEditProps) {
  const [formData, setFormData] = useState<ParentProfileUpdate>({
    email: profile.email || '',
    phone: profile.phone || '',
    occupation: profile.occupation || '',
  });

  const updateMutation = useMutation({
    mutationFn: updateParentProfile,
    onSuccess: (updatedProfile) => {
      toast.success('Profile updated successfully');
      onSave(updatedProfile);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof ParentProfileUpdate, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profile
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Profile</h1>
          <p className="text-muted-foreground">
            Update your personal information
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your contact details and occupation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Read-only fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Name cannot be changed. Contact administrator if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relation">Relation to Student</Label>
                <Input
                  id="relation"
                  value={profile.relation_to_student || 'Not specified'}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Relation cannot be changed. Contact administrator if needed.
                </p>
              </div>
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email address"
                />
                <p className="text-xs text-muted-foreground">
                  Used for important notifications and communications
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter your phone number"
                />
                <p className="text-xs text-muted-foreground">
                  Include country code for international numbers
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={formData.occupation}
                onChange={(e) => handleInputChange('occupation', e.target.value)}
                placeholder="Enter your occupation"
              />
              <p className="text-xs text-muted-foreground">
                Optional field for additional information
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={updateMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Children Information (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>My Children</CardTitle>
          <CardDescription>
            Children linked to your account (cannot be modified here)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile.children.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No children linked to your account.
            </div>
          ) : (
            <div className="space-y-4">
              {profile.children.map((child) => (
                <div key={child.student_id} className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">
                        {child.first_name} {child.last_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {child.admission_number} • {child.class_name} - {child.section_name}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      child.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {child.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}