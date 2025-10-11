import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

// Dynamic redirect URI for Vercel preview deployments
const REDIRECT_PATHNAME = '/callback';

const REDIRECT_ORIGIN =
  process.env.VERCEL_ENV === 'production'
    ? 'https://rift.mx'
    : process.env.VERCEL_ENV === 'preview'
    ? 'https://dev.rift.mx'
    : 'http://localhost:3000';

const REDIRECT_URI = new URL(REDIRECT_PATHNAME, REDIRECT_ORIGIN);

export default authkitMiddleware({
  redirectUri: REDIRECT_URI.href,
  eagerAuth: true,
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      "/",
      "/sign-in",
      "/sign-up",
    ],
  },
});

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Match all API routes
    "/api/:path*",
    // Match trpc routes if applicable
    "/trpc/:path*",
  ],
};
