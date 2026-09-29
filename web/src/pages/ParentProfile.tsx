import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, Briefcase, Edit, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { getParentProfile } from '@/api/parent';
import { PermissionGuard } from '@/components/PermissionGuard';
import { ParentProfileEdit } from '@/components/parent/ParentProfileEdit';
import type { ParentProfileOut } from '@/types/parent';

export function ParentProfile() {
  return (
    // <PermissionGuard
    //   resource="parent_profile"
    //   action="read_own"
    //   fallback={
    //     <div className="p-6 space-y-6">
    //       <div className="flex items-center justify-center min-h-[400px]">
    //         <Card className="w-full max-w-md">
    //           <CardContent className="pt-6">
    //             <div className="text-center space-y-4">
    //               <User className="h-16 w-16 text-muted-foreground mx-auto" />
    //               <div>
    //                 <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
    //                 <p className="text-muted-foreground mt-2">
    //                   You don't have permission to view your profile.
    //                 </p>
    //               </div>
    //             </div>
    //           </CardContent>
    //         </Card>
    //       </div>
    //     </div>
    //   }
    // >
      <ParentProfileContent />
    // </PermissionGuard>
  );
}

function ParentProfileContent() {
  const [isEditing, setIsEditing] = useState(false);

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['parent-profile'],
    queryFn: getParentProfile,
  });

  const handleEditSuccess = () => {
    setIsEditing(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Failed to load profile. Please try again.
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Profile not found.
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <ParentProfileEdit
        profile={profile}
        onSave={handleEditSuccess}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="My Profile" icon={<User className="h-5 w-5" />} subtitle="Manage your personal information and view your children" />

        <PermissionGuard resource="parent_profile" action="update_own">
          <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        </PermissionGuard>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Your basic profile details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p className="text-lg font-semibold">{profile.name}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Relation to Student</label>
              <p className="text-lg">{profile.relation_to_student || 'Not specified'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <p className="text-lg">{profile.email || 'Not provided'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </label>
              <p className="text-lg">{profile.phone || 'Not provided'}</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Occupation
              </label>
              <p className="text-lg">{profile.occupation || 'Not provided'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Children Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Children ({profile.children.length})
          </CardTitle>
          <CardDescription>
            Children linked to your account
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
                <div key={child.student_id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">
                        {child.first_name} {child.last_name}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Admission Number:</span>
                          <p className="font-medium">{child.admission_number || 'N/A'}</p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Class:</span>
                          <p className="font-medium">{child.class_name || 'N/A'}</p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Section:</span>
                          <p className="font-medium">{child.section_name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <StatusBadge status={child.is_active} />
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

export default ParentProfile;