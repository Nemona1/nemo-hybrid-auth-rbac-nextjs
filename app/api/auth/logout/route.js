import { NextResponse } from 'next/server';

export async function POST(request) {
  const response = NextResponse.json({ success: true });

  // Clear auth cookies (best-effort). Let browser scope handle domain.
  try {
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    response.cookies.delete('lastActivity');
  } catch (e) {
    // ignore
  }

  return response;
}