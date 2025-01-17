import { NextResponse } from 'next/server';

export function middleware(request) {
  // Get the response
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', '*'); // Configure this based on your needs
    response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
    response.headers.set('Access-Control-Allow-Headers', 'Accept, Accept-Version, Content-Length, Content-Type, Date');
  }

  return response;
}

// Configure which routes should be handled by middleware
export const config = {
  matcher: [
    // Apply to all API routes
    '/api/:path*',
    // Apply to OneSignal service worker routes
    '/OneSignalSDKWorker.js',
    '/OneSignalSDKUpdaterWorker.js'
  ]
};