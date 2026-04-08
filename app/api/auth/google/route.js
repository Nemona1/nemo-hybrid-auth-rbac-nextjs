import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  // Use the FULL callback URL (this is what Google expects)
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google/callback`;
  const scope = 'email profile';
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline`;
  
  console.log('[Google OAuth] Redirect URI:', redirectUri);
  console.log('[Google OAuth] Auth URL:', authUrl);
  
  return NextResponse.redirect(authUrl);
}