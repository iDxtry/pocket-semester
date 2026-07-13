import { isClerkConfigured } from "@/lib/auth";
import { isDatabaseConfigured } from "@/db";

export function isAccountPlatformConfigured() {
  return isClerkConfigured() && isDatabaseConfigured();
}
