import { redirect } from "next/navigation";

// Dynamic redirect URI for Vercel preview deployments
const REDIRECT_PATHNAME = '/callback';

const REDIRECT_ORIGIN =
  process.env.VERCEL_ENV === 'production'
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_ENV === 'preview'
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

const REDIRECT_URI = new URL(REDIRECT_PATHNAME, REDIRECT_ORIGIN);

export default function RootPage() {
  // Log the redirect URI for debugging
  console.log('🔗 Redirect URI:', REDIRECT_URI.href);
  console.log('🌍 Environment:', process.env.VERCEL_ENV || 'development');
  console.log('📍 Origin:', REDIRECT_ORIGIN);
  console.log('🔄 Redirecting from root (/) to /chat');
  
  redirect("/chat");
}
