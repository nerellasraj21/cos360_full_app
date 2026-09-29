import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useSetPasswordMutation } from '@/api/auth';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const setPasswordMutation = useSetPasswordMutation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('change_password_token');
    if (!token) {
      setTokenMissing(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem('change_password_token');
    if (!token) {
      setTokenMissing(true);
      return;
    }

    setPasswordMutation.mutate(
      { change_password_token: token, new_password: newPassword, confirm_password: confirmPassword },
      {
        onSuccess: () => {
          navigate({ to: '/' });
        },
        onError: (error) => {
          // If token expired (401), clear it and send back to login
          if (error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('invalid')) {
            sessionStorage.removeItem('change_password_token');
            setTokenMissing(true);
          }
        },
      }
    );
  };

  if (tokenMissing) {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <Card className="w-full">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <KeyRound className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="font-semibold">Session expired or invalid</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please log in again with your temporary password.
                  </p>
                </div>
                <Button className="w-full" onClick={() => navigate({ to: '/login' })}>
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-xs sm:max-w-sm flex-col gap-6">
        <Card className="w-full">
          <CardHeader className="text-center p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Set Your Password</CardTitle>
            <CardDescription>
              Create a new password to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label={showNew ? 'Hide password' : 'Show password'}
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={setPasswordMutation.isPending}
                >
                  {setPasswordMutation.isPending ? 'Setting password...' : 'Set Password'}
                </Button>

                {setPasswordMutation.isError && (
                  <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md text-xs sm:text-sm">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-red-400 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="text-red-700">
                        {setPasswordMutation.error?.message || 'Failed to set password. Please try again.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
