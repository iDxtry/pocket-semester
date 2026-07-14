import { AccountSetupNotice } from "@/components/account-setup-notice";
import { AuthShell } from "@/components/auth-shell";
import { PasswordAuthForm } from "@/components/password-auth-form";
import { isAuthConfigured } from "@/lib/auth";

export default function SignUpPage() {
  if (!isAuthConfigured()) return <AccountSetupNotice title="Sign-up needs a database connection." />;
  return (
    <AuthShell title="Build a calmer semester plan." copy="Start with your allowance, the categories that matter, and one practical savings goal.">
      <PasswordAuthForm mode="sign-up" />
    </AuthShell>
  );
}
