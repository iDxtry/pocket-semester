import { SignIn } from "@clerk/nextjs";
import { AccountSetupNotice } from "@/components/account-setup-notice";
import { AuthShell } from "@/components/auth-shell";
import { isClerkConfigured } from "@/lib/auth";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  if (!isClerkConfigured()) return <AccountSetupNotice title="Sign-in is being connected." />;
  return (
    <AuthShell title="Your semester, in view." copy="Pick up your private budget, review the month, and make the next choice with context.">
      <SignIn appearance={clerkAppearance} path="/sign-in" routing="path" signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
    </AuthShell>
  );
}
