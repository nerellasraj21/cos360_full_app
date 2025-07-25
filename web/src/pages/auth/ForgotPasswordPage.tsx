import ForgotPasswordForm from "@/components/ui/forgot-password-form";

export default function ForgotPasswordPage() {
  const host = window.location.hostname; // e.g., school1.abc.com or www.school1.abc.com
  const cleanHost = host.replace(/^www\./, "");
  const match = cleanHost.match(/^([^.]+)\./); // match subdomain
  if(match){
  console.log(match[1],"match")}
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">

            <span className="font-bold">@</span>
          </div>
          School Name
        </a>
        <ForgotPasswordForm />
      </div>
    </div>
  );
} 