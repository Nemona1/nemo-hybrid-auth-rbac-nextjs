import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

/**
 * Generate a random 6-digit OTP
 */
export function generateOtp() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('[2FA] Generated OTP:', otp);
  return otp;
}

/**
 * Generate backup codes (10 codes, 8 characters each)
 */
export function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
    codes.push(formattedCode);
  }
  return codes;
}

/**
 * Hash backup codes for storage
 */
export async function hashBackupCodes(codes) {
  const hashedCodes = await Promise.all(
    codes.map(async (code) => ({
      code,
      hash: await bcrypt.hash(code, 10)
    }))
  );
  return hashedCodes;
}

/**
 * Verify a backup code
 */
export async function verifyBackupCode(inputCode, storedCodes) {
  for (const stored of storedCodes) {
    if (await bcrypt.compare(inputCode, stored.hash)) {
      return stored.code;
    }
  }
  return null;
}

/**
 * Generate device fingerprint
 */
export function generateDeviceFingerprint(userAgent, ipAddress) {
  const data = `${userAgent}|${ipAddress}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get device type from user agent
 */
export function getDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Get device name from user agent
 */
export function getDeviceName(userAgent) {
  if (!userAgent) return 'Unknown Device';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('chrome')) return 'Chrome Browser';
  if (ua.includes('firefox')) return 'Firefox Browser';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari Browser';
  if (ua.includes('edge')) return 'Edge Browser';
  if (ua.includes('mobile') || ua.includes('android')) return 'Mobile Device';
  if (ua.includes('tablet')) return 'Tablet Device';
  
  return 'Web Browser';
}

/**
 * Store OTP in database
 */
export async function storeOtp(userId, otp, expiryMinutes = 10) {
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorOtp: otp,
      twoFactorOtpExpiry: expiresAt,
      twoFactorOtpAttempts: 0
    }
  });
  
  console.log('[2FA] ========== OTP STORED IN DB ==========');
  console.log('[2FA] User ID:', userId);
  console.log('[2FA] OTP:', otp);
  console.log('[2FA] Expires at:', expiresAt.toISOString());
  console.log('[2FA] =======================================');
}

/**
 * Verify OTP from database
 */
export async function verifyStoredOtp(userId, inputOtp) {
  console.log('[2FA] ========== OTP VERIFICATION ==========');
  console.log('[2FA] User ID:', userId);
  console.log('[2FA] Input OTP:', inputOtp);
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorOtp: true,
      twoFactorOtpExpiry: true,
      twoFactorOtpAttempts: true
    }
  });
  
  if (!user) {
    console.log('[2FA] User not found');
    return { valid: false, error: 'User not found' };
  }
  
  const storedOtp = user.twoFactorOtp;
  const storedExpiry = user.twoFactorOtpExpiry;
  let attempts = user.twoFactorOtpAttempts || 0;
  
  if (!storedOtp) {
    console.log('[2FA] No OTP found for user');
    return { valid: false, error: 'No OTP found. Please request a new code.' };
  }
  
  console.log('[2FA] Stored OTP:', storedOtp);
  console.log('[2FA] Stored expiry:', storedExpiry?.toISOString());
  console.log('[2FA] Current time:', new Date().toISOString());
  console.log('[2FA] Attempts so far:', attempts);
  
  if (storedExpiry && storedExpiry < new Date()) {
    console.log('[2FA] OTP expired');
    return { valid: false, error: 'OTP has expired. Please request a new code.' };
  }
  
  // Rate limiting: max 5 attempts
  if (attempts >= 5) {
    console.log('[2FA] Too many failed attempts');
    return { valid: false, error: 'Too many failed attempts. Please request a new code.' };
  }
  
  attempts++;
  console.log('[2FA] Attempt count after increment:', attempts);
  
  // Compare as strings
  const isValid = String(storedOtp).trim() === String(inputOtp).trim();
  console.log('[2FA] Comparison result:', isValid);
  
  if (!isValid) {
    // Update attempts count
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorOtpAttempts: attempts }
    });
    
    console.log('[2FA] OTP mismatch');
    console.log('[2FA] =====================================');
    return { valid: false, error: 'Invalid OTP', remainingAttempts: 5 - attempts };
  }
  
  // Clear OTP after successful verification
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorOtp: null,
      twoFactorOtpExpiry: null,
      twoFactorOtpAttempts: 0
    }
  });
  
  console.log('[2FA] OTP verified successfully!');
  console.log('[2FA] =====================================');
  
  return { valid: true };
}