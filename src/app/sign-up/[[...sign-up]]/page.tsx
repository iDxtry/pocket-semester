import { SignUp } from "@clerk/nextjs";
import { AccountSetupNotice } from "@/components/account-setup-notice";
import { isClerkConfigured } from "@/lib/auth";

export default function SignUpPage() {
  if (!isClerkConfigured()) return <AccountSetupNotice title="Sign-up is being connected." />;
  return <main className="auth-page"><SignUp path="/sign-up" routing="path" signInUrl="/sign-in" fallbackRedirectUrl="/onboarding" /></main>;
}
