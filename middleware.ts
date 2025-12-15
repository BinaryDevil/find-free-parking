import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  matcher: [
    "/",
    "/(zh|en|es|hi|fr|ar|bn|pt)/:path*",
    // Enable redirects that add missing locales
    // (e.g. `/pathnames` -> `/en/pathnames`)
    // Exclude api, _next, and files with extensions
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
