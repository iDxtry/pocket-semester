import { clerkMiddleware } from "@clerk/nextjs/server";

// Establishes Clerk's request context for both optional-session public routes
// and account-only API handlers. Individual routes enforce ownership server-side.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
