import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Public paths
  if (path === '/login' || path.startsWith('/api/') || path.startsWith('/_next/') || path === '/favicon.ico') {
    return NextResponse.next();
  }

  // To truly secure Next.js at the edge, we would check JWT cookies here.
  // Since we are mocking auth in localStorage for this demo phase, 
  // we cannot access localStorage in edge middleware. 
  // However, we can enforce a basic redirect to /login if they hit the root without any state,
  // but client-side layout will handle the strict redirecting for this demo.
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
