import { NextResponse } from "next/server";

// Authentication is enforced in server components and API handlers from the
// signed, httpOnly Pocket Semester session cookie. Middleware stays neutral so
// the public demo and auth pages remain accessible on the free Vercel domain.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};
