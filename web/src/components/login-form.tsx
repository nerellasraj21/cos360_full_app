import React from 'react';
import { useLoginMutation } from '../api/auth';
import { useAuthStore } from '../lib/authStore';
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, useNavigate } from '@tanstack/react-router'

export default function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const loginMutation = useLoginMutation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    console.log(username, password);
    loginMutation.mutate({ username, password, client_name: 'test_tenant' }, {
      onSuccess: () => {
        console.log("user12", isAuthenticated)
        navigate({ to: '/' });
      },
      onError: (error) => {
        console.error('Login error:', error);
      }
    });
  };

  if (isAuthenticated) {
    return <div>Welcome! You are logged in.</div>;
  }

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-xs sm:max-w-sm md:max-w-md", className)} {...props}>
      <Card className="w-full">
        <CardHeader className="text-center p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Welcome back</CardTitle>

        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:gap-6">

              <div className="grid gap-4 sm:gap-6">
                <div className="grid gap-2 sm:gap-3">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    required
                  />
                </div>
                <div className="grid gap-2 sm:gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="ml-auto text-xs sm:text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                  <Input id="password" type="password" required />
                </div>
                <Button type="submit" className="w-full cursor-pointer" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? 'Logging in...' : 'Login'}
                </Button>
              </div>
              {loginMutation.isError && (
                <div className="mt-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md text-xs sm:text-sm">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="text-red-700">
                      {loginMutation.error?.message || 'Login failed. Please check your credentials and try again.'}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-[10px] sm:text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}
