import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function GET(request) {
  const results = {
    headers: {},
    cookies: {},
    tokenFromAuth: null,
    tokenFromCookie: null,
    verification: null
  };
  
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    results.tokenFromAuth = authHeader.substring(7);
    results.headers.authorization = authHeader.substring(0, 50) + '...';
  }
  
  // Check cookie
  const cookieToken = request.cookies.get('accessToken')?.value;
  if (cookieToken) {
    results.tokenFromCookie = cookieToken;
    results.cookies.accessToken = cookieToken.substring(0, 50) + '...';
  }
  
  // Try to verify with token from auth header first
  let tokenToVerify = results.tokenFromAuth || results.tokenFromCookie;
  
  if (tokenToVerify) {
    results.verification = await verifyAccessToken(tokenToVerify);
  }
  
  // Log all cookies
  const allCookies = {};
  request.cookies.getAll().forEach(cookie => {
    allCookies[cookie.name] = cookie.value?.substring(0, 30) + '...';
  });
  results.allCookies = allCookies;
  
  return NextResponse.json(results);
}