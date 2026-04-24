// Cron job to clean up expired sessions
// Can be run via API endpoint or scheduled task

import { prisma } from '@/lib/prisma';

export async function cleanupExpiredSessions() {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
    
    console.log(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  } catch (error) {
    console.error('Session cleanup error:', error);
    return 0;
  }
}

// Optional: Create an API endpoint to trigger cleanup
// app/api/admin/cleanup-sessions/route.js