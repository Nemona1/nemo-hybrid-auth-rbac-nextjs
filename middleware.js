import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';

// Public routes - allow everyone to access
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/verify',
  '/forgot-password',
  '/reset-password',
  '/verify/success',
  '/verify/error',
  '/verify/already-verified',
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/me',
  '/api/auth/logout',
];

// Role-specific dashboard routes
const ROLE_DASHBOARDS = {
  'ADMIN': '/dashboard/admin',
  'MANAGER': '/dashboard/manager',
  'EDITOR': '/dashboard/editor',
  'VIEWER': '/dashboard/viewer',
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  
  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route))) {
    return response;
  }
  
  // Get token from Authorization header or cookie
  let token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    token = request.cookies.get('accessToken')?.value;
  }
  
  // If no token and trying to access protected route, redirect to login
  if (!token && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // For API routes without token, return 401
  if (!token && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Verify token
  const { valid, decoded, error } = await verifyAccessToken(token);
  
  if (!valid && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const clearResponse = NextResponse.redirect(loginUrl);
    clearResponse.cookies.delete('accessToken');
    clearResponse.cookies.delete('refreshToken');
    clearResponse.cookies.delete('lastActivity');
    clearResponse.cookies.delete('sessionToken');
    return clearResponse;
  }
  
  if (!valid && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  
  // ============================================================
  // INACTIVITY CHECK - SERVER SIDE
  // ============================================================
  
  // Skip inactivity check for activity tracking endpoint
  if (pathname === '/api/user/activity') {
    return response;
  }
  
  // Get last activity from cookie
  const lastActivityCookie = request.cookies.get('lastActivity')?.value;
  const now = Date.now();
  const INACTIVITY_TIMEOUT_MS = 60 * 1000; // 1 minute
  
  if (lastActivityCookie) {
    const lastActivityTime = parseInt(lastActivityCookie);
    const inactiveDuration = now - lastActivityTime;
    
    if (inactiveDuration > INACTIVITY_TIMEOUT_MS) {
      console.log(`[Middleware] Session expired due to inactivity: ${Math.floor(inactiveDuration / 1000)} seconds`);
      
      // Log the inactivity timeout to database
      try {
        await prisma.securityLog.create({
          data: {
            userId: decoded.userId,
            action: 'SESSION_EXPIRED_INACTIVITY',
            details: { 
              lastActivity: new Date(lastActivityTime).toISOString(),
              inactiveSeconds: Math.floor(inactiveDuration / 1000),
              path: pathname
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            success: false
          }
        });
      } catch (logError) {
        console.error('Failed to log inactivity timeout:', logError);
      }
      
      // Clear all auth cookies
      const expiredResponse = NextResponse.redirect(new URL('/login?expired=true', request.url));
      expiredResponse.cookies.delete('accessToken');
      expiredResponse.cookies.delete('refreshToken');
      expiredResponse.cookies.delete('lastActivity');
      expiredResponse.cookies.delete('sessionToken');
      
      return expiredResponse;
    }
  }
  
  // Update last activity cookie for non-API routes
  if (!pathname.startsWith('/api/')) {
    response.cookies.set('lastActivity', now.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 // 1 minute
    });
  }
  
  // ============================================================
  // ROLE-BASED REDIRECT FOR ROOT PATH
  // ============================================================
  
  // If accessing root path, redirect based on user role
  if (pathname === '/') {
    try {
      // Fetch user with role from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { role: true }
      });
      
      if (user) {
        // If user has approved role, redirect to role-specific dashboard
        if (user.applicationStatus === 'APPROVED' && user.role?.name) {
          const roleName = user.role.name;
          const dashboardUrl = ROLE_DASHBOARDS[roleName] || '/dashboard';
          return NextResponse.redirect(new URL(dashboardUrl, request.url));
        }
        
        // If user has pending application, redirect to role-request
        if (user.applicationStatus === 'PENDING') {
          return NextResponse.redirect(new URL('/role-request', request.url));
        }
      }
    } catch (error) {
      console.error('Role redirect error:', error);
    }
  }
  
  // ============================================================
  // ROLE-BASED ACCESS CONTROL FOR PROTECTED ROUTES
  // ============================================================
  
  // Check if route requires specific role (for dashboard routes)
  const isDashboardRoute = pathname.startsWith('/dashboard/');
  if (isDashboardRoute) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { role: true }
      });
      
      if (!user || user.applicationStatus !== 'APPROVED' || !user.role) {
        return NextResponse.redirect(new URL('/role-request', request.url));
      }
      
      const expectedRole = pathname.split('/')[2]?.toUpperCase(); // admin, manager, editor, viewer
      const userRole = user.role.name;
      
      if (expectedRole && userRole !== expectedRole) {
        // Redirect to user's correct dashboard
        const correctDashboard = ROLE_DASHBOARDS[userRole] || '/dashboard';
        return NextResponse.redirect(new URL(correctDashboard, request.url));
      }
    } catch (error) {
      console.error('Role check error:', error);
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};