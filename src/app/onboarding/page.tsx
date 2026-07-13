import { redirect } from "next/navigation";
import { AccountSetupNotice } from "@/components/account-setup-notice";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getCurrentUserId } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { isAccountPlatformConfigured } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (!isAccountPlatformConfigured()) return <AccountSetupNotice title="Your private workspace needs one quick connection." />;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/sign-in");
  const profile = await getProfile(userId);
  if (profile?.onboardingComplete) redirect("/dashboard");
  return <OnboardingWizard />;
}
