import { SignUp } from "@clerk/nextjs";
import { AccountSetupNotice } from "@/components/account-setup-notice";
import { AuthShell } from "@/components/auth-shell";
import { isClerkConfigured } from "@/lib/auth";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  if (!isClerkConfigured()) return <AccountSetupNotice title="Sign-up is being connected." />;
  return (
    <AuthShell title="Build a calmer semester plan." copy="Start with your allowance, the categories that matter, and one practical savings goal.">
      <SignUp appearance={clerkAppearance} path="/sign-up" routing="path" signInUrl="/sign-in" fallbackRedirectUrl="/onboarding" />
    </AuthShell>
  );
}
