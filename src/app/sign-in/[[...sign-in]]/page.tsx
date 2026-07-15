import { AccountSetupNotice } from "@/components/account-setup-notice";
import { AuthShell } from "@/components/auth-shell";
import { PasswordAuthForm } from "@/components/password-auth-form";
import { isAuthConfigured } from "@/lib/auth";

export default function SignInPage() {
  if (!isAuthConfigured()) return <AccountSetupNotice title="Sign-in needs a database connection." />;
  return (
    <AuthShell title="Your semester, in view." copy="Pick up your private budget, review the month, and make the next choice with context.">
      <PasswordAuthForm mode="sign-in" />
    </AuthShell>
  );
}
