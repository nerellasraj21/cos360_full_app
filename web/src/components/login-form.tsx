import React, { useState, useEffect } from "react";
import { useLoginMutation, useAcademicYears } from "../api/auth";
import { useAuthStore } from "../lib/authStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";


export default function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("");
  const loginMutation = useLoginMutation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  const { data: academicYears = [], isLoading: yearsLoading } = useAcademicYears();

  // Auto-select the active academic year once loaded
  useEffect(() => {
    if (academicYears.length > 0 && !selectedAcademicYearId) {
      const activeYear = academicYears.find((y) => y.is_active);
      setSelectedAcademicYearId(activeYear?.id ?? academicYears[0].id);
    }
  }, [academicYears, selectedAcademicYearId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.elements.namedItem("username") as HTMLInputElement)
      .value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    loginMutation.mutate(
      { username, password, client_name: "test_tenant", academic_year_id: selectedAcademicYearId || undefined },
      {
        onSuccess: (data) => {
          if ('requires_password_change' in data && data.requires_password_change) {
            sessionStorage.setItem('change_password_token', data.change_password_token);
            navigate({ to: '/set-password' });
            return;
          }
          navigate({ to: "/" });
        },
        onError: (error) => {
          console.error("Login error:", error);
        },
      }
    );
  };

  if (isAuthenticated) {
    return <div>Welcome! You are logged in.</div>;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6 w-full max-w-xs sm:max-w-sm md:max-w-md",
        className
      )}
      {...props}
    >
      <Card className="w-full">
        <CardHeader className="text-center p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Welcome!</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:gap-6">
              <div className="grid gap-4 sm:gap-6">
                <div className="grid gap-2 sm:gap-3">
                  <Label>Academic Year</Label>
                  {yearsLoading ? (
                    <div className="flex items-center gap-2 h-9 px-3 border rounded-md text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading years...
                    </div>
                  ) : (
                    <Select
                      value={selectedAcademicYearId}
                      onValueChange={setSelectedAcademicYearId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map((year) => (
                          <SelectItem key={year.id} value={year.id}>
                            {`${year.title}${year.is_active ? ' (Current)' : ''}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="grid gap-2 sm:gap-3">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter Username"
                    required
                  />
                </div>
                <div className="grid gap-2 sm:gap-3">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter Password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full cursor-pointer"
                  disabled={loginMutation.isPending || !selectedAcademicYearId}
                >
                  {loginMutation.isPending ? "Logging in..." : "Login"}
                </Button>
                <Link
                  to="/forgot-password"
                  className="text-xs sm:text-sm underline-offset-4 hover:underline text-center"
                >
                  Forgot your password?
                </Link>
              </div>
              {loginMutation.isError && (
                <div className="mt-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md text-xs sm:text-sm">
                  <div className="flex items-center">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-red-700">
                      {loginMutation.error?.message ||
                        "Login failed. Please check your credentials and try again."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
