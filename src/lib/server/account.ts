import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { getProfile } from "@/lib/data";

export async function requireActiveAccount() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/sign-in");

  const profile = await getProfile(userId);
  if (!profile?.onboardingComplete) redirect("/onboarding");

  return { userId, profile };
}
