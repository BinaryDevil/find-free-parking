import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

// Next.js 16 renamed the middleware convention to proxy. Keeping the locale
// matcher here preserves the existing URL behavior without the deprecation.
export default createMiddleware(routing);

export const config = {
  matcher: [
    "/",
    "/(zh|en|es|hi|fr|ar|bn|pt)/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
