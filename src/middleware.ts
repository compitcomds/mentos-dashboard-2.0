import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Read environment variables
const PREVIEW_TOKEN = process.env.NEXT_PUBLIC_JWT_PREVIEW_TOKEN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'production';
const IS_DEVELOPMENT = ENVIRONMENT === 'development';

const PROTECTED_ROUTES = ['/dashboard']; // Base paths for protected routes
const AUTH_ROUTES = ['/login', '/register']; // Routes for authentication

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let token: string | undefined;
  let tokenSource: string = 'none';

  if (IS_DEVELOPMENT && PREVIEW_TOKEN) {
    // In development, prioritize the preview token from ENV
    token = PREVIEW_TOKEN;
    tokenSource = 'env_preview'; // Indicate source is ENV variable for dev
    // console.log(`[Middleware - Development] Using preview token from ENV.`);
  } else if (!IS_DEVELOPMENT) {
    // In production, check the actual cookie
    const tokenCookie = request.cookies.get('accessToken');
    token = tokenCookie?.value;
    tokenSource = token ? 'cookie' : 'none';
    // console.log(`[Middleware - Production] Cookie 'accessToken' found: ${!!token}`);
  } else {
    // Development but no preview token defined
     console.warn('[Middleware - Development] No NEXT_PUBLIC_JWT_PREVIEW_TOKEN defined in .env. Authentication might not work correctly in preview.');
  }

  const hasToken = !!token;

  // console.log(`[Middleware] Path: ${pathname}, Env: ${ENVIRONMENT}, Token Source: ${tokenSource}, Has Token: ${hasToken}`);

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !hasToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname); // Optionally add redirect param
    // console.log(`[Middleware] No token found for protected route ${pathname}. Redirecting to login.`);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users trying to access login/register pages
  if (isAuthRoute && hasToken) {
      const dashboardUrl = new URL('/dashboard', request.url);
      // console.log(`[Middleware] Authenticated user (token source: ${tokenSource}) accessing ${pathname}. Redirecting to dashboard.`);
      return NextResponse.redirect(dashboardUrl);
  }

  // Allow the request to proceed
  // console.log(`[Middleware] Allowing request for ${pathname}.`);
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - Excluded implicitly by Next.js unless specified
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * These are patterns, not exact paths.
     * We are primarily interested in matching our app routes.
     */
    '/dashboard/:path*', // All dashboard routes
    '/login',
    '/register',
    // Add '/' if the root needs auth checks/redirects. Current setup redirects from '/' to '/login' via HomePage component.
    // '/((?!api|_next/static|_next/image|favicon.ico).*)', // More general matcher if needed, but specific is often better.
  ],
};
