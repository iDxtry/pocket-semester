import { SignIn } from "@clerk/nextjs";
import { AccountSetupNotice } from "@/components/account-setup-notice";
import { isClerkConfigured } from "@/lib/auth";

export default function SignInPage() {
  if (!isClerkConfigured()) return <AccountSetupNotice title="Sign-in is being connected." />;
  return <main className="auth-page"><SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" /></main>;
}
