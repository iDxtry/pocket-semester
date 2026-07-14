import { isAuthConfigured } from "@/lib/auth";
import { isDatabaseConfigured } from "@/db";

export function isAccountPlatformConfigured() {
  return isAuthConfigured() && isDatabaseConfigured();
}
