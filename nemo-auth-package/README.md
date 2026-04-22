# 🔐 Nemo Auth Next.js

Enterprise-grade authentication and authorization system for Next.js applications with RBAC, 2FA, and security logging.

[![npm version](https://badge.fury.io/js/nemo-auth-nextjs.svg)](https://www.npmjs.com/package/nemo-auth-nextjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5+-blue)](https://prisma.io/)

## ✨ Features

- ✅ **JWT Authentication** with Refresh Token Rotation
- ✅ **Two-Factor Authentication (2FA)** - Email-based OTP
- ✅ **Role-Based Access Control (RBAC)** - Admin, Manager, Editor, Viewer
- ✅ **Permission-Based Access Control (PBAC)** - Granular permissions
- ✅ **Email Verification** - Required before role applications
- ✅ **Password Reset Flow** - OTP-based secure reset
- ✅ **Brute Force Protection** - 3 attempts = 30-second lockout
- ✅ **Session Management** - View and revoke active sessions
- ✅ **Audit & Security Logs** - Complete event logging
- ✅ **Inactivity Timeout** - Auto-logout after inactivity
- ✅ **Production Anti-Tamper** - Disables DevTools shortcuts

## 📦 Installation

```bash
npm install nemo-auth-nextjs
🚀 Quick Start
1. Add Prisma Schema
Copy the Prisma schema to your project:

bash
cp node_modules/nemo-auth-nextjs/prisma/schema.prisma prisma/
2. Set Up Environment Variables
Create a .env file in your project root:

env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/your_db"

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars-different"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="noreply@yourapp.com"

# Application URL
NEXTAUTH_URL="http://localhost:3000"

# Security Thresholds
MAX_LOGIN_ATTEMPTS="3"
LOCKOUT_DURATION_SECONDS="30"
INACTIVITY_TIMEOUT_SECONDS="60"
3. Initialize Database
bash
npx prisma db push
npx prisma generate
4. Seed Database (Roles & Permissions)
bash
node node_modules/nemo-auth-nextjs/prisma/seed.js
5. Use in Your API Routes
Create an auth endpoint:

javascript
// app/api/auth/login/route.js
import { generateAccessToken, generateRefreshToken } from 'nemo-auth-nextjs';
import { comparePassword } from 'nemo-auth-nextjs';
import { prisma } from 'nemo-auth-nextjs';

export async function POST(request) {
  const { email, password } = await request.json();
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return Response.json({ error: 'User not found' }, { status: 401 });
  
  const valid = await comparePassword(password, user.password);
  if (!valid) return Response.json({ error: 'Invalid password' }, { status: 401 });
  
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  return Response.json({ accessToken, refreshToken, user });
}
6. Protect Routes with Middleware
Create middleware.js:

javascript
import { verifyAccessToken } from 'nemo-auth-nextjs';

export async function middleware(request) {
  const token = request.cookies.get('accessToken')?.value;
  
  if (!token) {
    return Response.redirect(new URL('/login', request.url));
  }
  
  const { valid, decoded } = await verifyAccessToken(token);
  if (!valid) {
    return Response.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/profile/:path*']
};
📚 API Reference
Authentication
Function	Description
generateAccessToken(user)	Generate JWT access token
generateRefreshToken(user)	Generate JWT refresh token
verifyAccessToken(token)	Verify and decode access token
rotateRefreshToken(token)	Rotate refresh token
hashPassword(password)	Hash password with bcrypt
verifyPassword(password, hash)	Verify password against hash
validatePasswordStrength(password)	Check password strength
Two-Factor Authentication (2FA)
Function	Description
generateOtp()	Generate 6-digit OTP
generateBackupCodes()	Generate 10 backup codes
verifyBackupCode(code, storedCodes)	Verify backup code
storeOtp(userId, otp, expiryMinutes)	Store OTP in database
verifyStoredOtp(userId, inputOtp)	Verify stored OTP
Permissions
Function	Description
hasPermission(userId, permission)	Check if user has permission
getUserPermissions(userId)	Get all user permissions
requirePermission(permission)	Middleware for permission check
Security & Audit
Function	Description
isUserLockedOut(email)	Check if user is locked out
handleFailedLogin(email, ip, userAgent)	Handle failed login attempt
resetFailedAttempts(email)	Reset failed login counter
createAuditLog(data)	Create audit log entry
logSecurityEvent(data)	Create security log entry
Constants
javascript
import { ROLES, PERMISSIONS } from 'nemo-auth-nextjs';

// Roles
ROLES.ADMIN     // 'ADMIN'
ROLES.MANAGER   // 'MANAGER'
ROLES.EDITOR    // 'EDITOR'
ROLES.VIEWER    // 'VIEWER'

// Permissions
PERMISSIONS.USERS_READ     // 'users:read'
PERMISSIONS.USERS_CREATE   // 'users:create'
PERMISSIONS.CONTENT_VIEW   // 'content:view'
PERMISSIONS.ADMIN_ACCESS   // 'admin:access'
// ... and more
🗄️ Database Schema
The package includes a complete Prisma schema with:

User - User accounts, roles, verification status

Role - System roles (ADMIN, MANAGER, EDITOR, VIEWER)

Permission - Granular permissions

RolePermission - Role-permission mappings

UserPermission - Direct user permission overrides

Session - User sessions with refresh tokens

AuditLog - General user action logs

SecurityLog - Security-critical event logs

RoleApplication - User role requests

TwoFactorAuth - 2FA settings and backup codes

🔒 Security Features
✅ JWT tokens stored in httpOnly cookies

✅ Refresh token rotation on each use

✅ Brute force protection with progressive lockout

✅ Password validation (min 8 chars, uppercase, lowercase, number, special)

✅ Email verification required for role applications

✅ Session invalidation on password change

✅ Inactivity timeout (configurable)

📖 Complete API Routes
The package includes full API routes you can copy to your project:

text
/api/auth/register
/api/auth/login
/api/auth/logout
/api/auth/refresh
/api/auth/me
/api/auth/verify/[token]
/api/auth/forgot-password
/api/auth/reset-password
/api/auth/2fa/setup
/api/auth/2fa/enable
/api/auth/2fa/verify-login
/api/admin/users
/api/admin/roles
/api/admin/permissions
/api/admin/audit-logs
/api/admin/security-logs
🧪 Demo Accounts (After Seeding)
Role	Email	Password
Admin	admin@nemo-auth.com	Admin@123456
Manager	manager@nemo-auth.com	Manager@123456
Editor	editor@nemo-auth.com	Editor@123456
Viewer	viewer@nemo-auth.com	Viewer@123456
🤝 Contributing
Contributions are welcome! Please read our contributing guidelines.

📄 License
MIT © Nemona1

⭐ Support
If you find this package helpful, please give it a star on GitHub!

Built with ❤️ for enterprise security
