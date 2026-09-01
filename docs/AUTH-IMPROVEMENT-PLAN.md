# Auth System — Complete Improvement Plan

**Date:** August 31, 2026
**Status:** Planning
**Target:** Production-ready auth for users and admins

---

## Table of Contents

1. [Current State](#current-state)
2. [User Auth Improvements](#user-auth-improvements)
3. [Admin Auth Improvements](#admin-auth-improvements)
4. [Security Features](#security-features)
5. [Implementation Plan](#implementation-plan)

---

## Current State

### What Exists

| Feature | Status | Notes |
|---|---|---|
| Email/password registration | ✅ Working | Basic, no verification |
| Google OAuth | ✅ Working | No scope configuration |
| 2FA (TOTP) | ⚠️ Partial | Plugin exists, UI non-functional |
| Password reset | ❌ Missing | Link points to # |
| Email verification | ❌ Disabled | `requireEmailVerification: false` |
| Banned user check | ❌ Missing | Fields exist, no enforcement |
| Session management | ❌ Missing | No UI to view/revoke sessions |
| Login notifications | ❌ Missing | No alerts on new device |
| Password complexity | ⚠️ Weak | Only 8 char minimum |
| Rate limiting | ❌ Missing | No protection against brute force |

### Current Auth Flow

```
REGISTRATION:
  1. User enters name, email, password
  2. authClient.signUp.email() called
  3. User created in database
  4. Auto-login after registration
  5. Redirect to /trade/demo

LOGIN:
  1. User enters email, password
  2. authClient.signIn.email() called
  3. Session created
  4. If 2FA enabled → redirect to /2fa-verify
  5. Otherwise → redirect to /trade/demo
```

---

## User Auth Improvements

### 1. Email Verification

**Why:** Prevents fake accounts, enables password reset, required for compliance

**Flow:**
```
1. User registers
2. Verification email sent with 6-digit code
3. User enters code on /verify-email page
4. Email marked as verified
5. User can now login

RULES:
  - Code expires in 15 minutes
  - Max 3 verification attempts
  - Can resend after 60 seconds
  - Blocked from trading until verified
```

**Implementation:**
```typescript
// lib/auth.ts
emailAndPassword: {
  enabled: true,
  minPasswordLength: 12,
  requireEmailVerification: true,  // Enable this
}

// New API routes:
POST /api/auth/send-verification    - Send verification code
POST /api/auth/verify-email         - Verify email with code
POST /api/auth/resend-verification  - Resend verification code
```

**New Pages:**
```
/verify-email          - Enter verification code
/verify-email/success  - Email verified confirmation
```

---

### 2. Password Reset

**Why:** Users forget passwords, prevents account lockout

**Flow:**
```
1. User clicks "Forgot password?"
2. User enters email
3. Reset link sent (valid for 1 hour)
4. User clicks link → /reset-password page
5. User enters new password
6. Password updated
7. All existing sessions invalidated
8. User redirected to login

RULES:
  - Link expires in 1 hour
  - Max 3 reset requests per hour
  - Must use unique link (one-time use)
  - Invalidate all sessions on reset
```

**Implementation:**
```typescript
// New API routes:
POST /api/auth/forgot-password     - Send reset link
POST /api/auth/reset-password      - Reset with token
POST /api/auth/validate-reset-token - Validate token

// New pages:
/forgot-password     - Enter email
/reset-password      - Enter new password (with token)
/reset-password/success - Password reset confirmation
```

---

### 3. Password Complexity

**Why:** Prevents weak passwords, brute force attacks

**Current:** 8 characters minimum

**Recommended:**
```
MINIMUM REQUIREMENTS:
  - 12 characters minimum
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (!@#$%^&*)
  - Not in common password list

BONUS:
  - Show password strength indicator
  - Suggest improvements
  - Check against breached password databases
```

**Implementation:**
```typescript
// lib/auth.ts
emailAndPassword: {
  enabled: true,
  minPasswordLength: 12,
  password: {
    validate: (password: string) => {
      const checks = {
        minLength: password.length >= 12,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*]/.test(password),
        notCommon: !isCommonPassword(password),
      };
      
      const passed = Object.values(checks).filter(Boolean).length;
      return {
        valid: passed >= 5,
        message: passed < 5 ? 'Password too weak' : undefined,
      };
    },
  },
}
```

---

### 4. 2FA Enable/Disable

**Why:** Critical security for trading accounts

**Flow (Enable):**
```
1. User goes to Account Settings
2. Clicks "Enable 2FA"
3. Enters password to confirm
4. QR code displayed
5. User scans with authenticator app
6. User enters 6-digit code to verify
7. 2FA enabled
8. Backup codes displayed (10 codes)
9. User saves backup codes

RULES:
  - Must verify password before enabling
  - Must verify TOTP code before enabling
  - Show backup codes once (never again)
  - Can disable with password + TOTP code
```

**Flow (Disable):**
```
1. User goes to Account Settings
2. Clicks "Disable 2FA"
3. Enters password
4. Enters current TOTP code
5. 2FA disabled
6. Audit log entry created
```

**Flow (Login with 2FA):**
```
1. User enters email + password
2. If 2FA enabled → show 2FA input
3. User enters 6-digit code
4. If invalid → show error, allow retry
5. If backup code → mark as used
6. If valid → login complete

RULES:
  - Max 5 failed attempts → lock for 15 minutes
  - Backup codes are one-time use
  - Show remaining backup codes count
```

**Implementation:**
```typescript
// New API routes:
POST /api/auth/2fa/enable      - Enable 2FA
POST /api/auth/2fa/disable     - Disable 2FA
POST /api/auth/2fa/verify      - Verify TOTP code
GET  /api/auth/2fa/backup-codes - Get backup codes

// New pages:
/2fa-setup      - Enable 2FA (QR code + verification)
/2fa-verify     - Enter TOTP code during login
/2fa-recovery   - Use backup code
```

---

### 5. Session Management

**Why:** Users need to see and control their active sessions

**Features:**
```
SESSION LIST:
  - Device type (mobile/desktop)
  - Browser/OS
  - IP address
  - Location (country)
  - Last active time
  - Current session indicator

SESSION ACTIONS:
  - Revoke specific session
  - Revoke all other sessions
  - View session details

SECURITY:
  - Show warning for suspicious sessions
  - Auto-revoke sessions from new countries
  - Max 5 active sessions per user
```

**Implementation:**
```typescript
// New API routes:
GET  /api/auth/sessions           - List all sessions
DELETE /api/auth/sessions/:id     - Revoke specific session
DELETE /api/auth/sessions/all     - Revoke all except current

// New pages:
/account/sessions   - Session management UI
```

---

### 6. Login Notifications

**Why:** Alert users of unauthorized access attempts

**Notifications:**
```
NEW DEVICE LOGIN:
  "New login from Chrome on Windows (192.168.1.1)"
  Sent via: Email + In-app

NEW LOCATION LOGIN:
  "New login from Mumbai, India"
  Sent via: Email + In-app

FAILED LOGIN ATTEMPTS:
  "3 failed login attempts on your account"
  Sent via: Email

PASSWORD CHANGED:
  "Your password was changed"
  Sent via: Email

2FA DISABLED:
  "Two-factor authentication was disabled"
  Sent via: Email
```

**Implementation:**
```typescript
// lib/auth-notifications.ts
async function notifyNewLogin(userId: string, session: Session) {
  const device = parseUserAgent(session.userAgent);
  const location = await getLocation(session.ipAddress);
  
  await createNotification(userId, {
    type: 'SECURITY',
    title: 'New login',
    body: `New login from ${device.browser} on ${device.os} (${location})`,
  });
  
  await sendEmail(userId, {
    subject: 'New login to your account',
    template: 'new-login',
    data: { device, location, timestamp: session.createdAt },
  });
}
```

---

### 7. Account Lockout

**Why:** Prevent brute force attacks

**Rules:**
```
LOCKOUT TRIGGERS:
  - 5 failed login attempts → lock for 15 minutes
  - 10 failed login attempts → lock for 1 hour
  - 20 failed login attempts → lock for 24 hours

LOCKOUT BEHAVIOR:
  - Show "Account locked" message
  - Show time remaining
  - Send email notification
  - Admin can manually unlock

RESET CONDITIONS:
  - Successful login resets counter
  - Password reset resets counter
  - Admin manually resets counter
```

---

## Admin Auth Improvements

### 1. Admin 2FA Enforcement

**Why:** Admin accounts are high-value targets

**Rules:**
```
MANDATORY 2FA:
  - All admin accounts MUST enable 2FA
  - Cannot access admin panel without 2FA
  - Cannot disable 2FA once enabled

ENFORCEMENT:
  - On login, check if admin has 2FA enabled
  - If not → redirect to /2fa-setup
  - Block all admin routes until 2FA enabled

RECOVERY:
  - Admin must save backup codes
  - Super admin can disable 2FA for other admins
  - Emergency recovery via support ticket
```

**Implementation:**
```typescript
// lib/auth.ts - Admin plugin config
admin({
  defaultRole: "player",
  adminRoles: ["super_admin"],
  roles,
  require2FA: true,  // Enforce 2FA for admins
})

// middleware check
async function requireAdmin2FA(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.role === 'super_admin' && !user.twoFactorEnabled) {
    return false;  // Must enable 2FA
  }
  return true;
}
```

---

### 2. Admin Session Management

**Why:** Admin sessions are more sensitive

**Rules:**
```
SESSION LIMITS:
  - Max 2 active admin sessions
  - Session timeout: 30 minutes inactivity
  - Must re-authenticate for sensitive actions

SENSITIVE ACTIONS (require re-auth):
  - Delete user
  - Change user role
  - Modify payout settings
  - Approve large withdrawals (>$1000)
  - Change platform settings
```

---

### 3. Admin Audit Logging

**Why:** Track admin actions for accountability

**Log All:**
```
ADMIN ACTIONS:
  - Login/logout
  - User management (ban, unban, role change)
  - Financial actions (approve/reject deposits/withdrawals)
  - Settings changes
  - Pair management
  - Any sensitive operation

LOG FORMAT:
{
  adminId: string,
  action: string,
  target: string,  // affected resource
  details: object,
  ipAddress: string,
  timestamp: Date
}
```

---

### 4. Admin IP Whitelisting

**Why:** Extra security layer for admin access

**Rules:**
```
OPTIONAL IP RESTRICTION:
  - Admin can whitelist specific IPs
  - Login blocked from non-whitelisted IPs
  - Can be bypassed with 2FA + email verification

IMPLEMENTATION:
  - Store whitelisted IPs in database
  - Check on admin login
  - Check on sensitive operations
```

---

## Security Features

### 1. Rate Limiting

```
ENDPOINT                          LIMIT
─────────────────────────────────────────────
POST /api/auth/sign-in            5/min per IP
POST /api/auth/sign-up            3/min per IP
POST /api/auth/forgot-password    3/min per email
POST /api/auth/verify-email       5/min per email
POST /api/trades                  30/min per user
POST /api/account/deposit         5/min per user
POST /api/account/withdraw        5/min per user
GET  /api/*                       100/min per IP
```

---

### 2. CSRF Protection

```
IMPLEMENTATION:
  - Use SameSite=Strict cookies for admin
  - Add CSRF token for state-changing operations
  - Validate Origin/Referer headers
```

---

### 3. Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

### 4. Password Security

```
STORAGE:
  - Bcrypt with cost factor 12
  - Never store plain text
  - Never log passwords

HISTORY:
  - Check against last 5 passwords
  - Prevent password reuse

BREACH CHECK:
  - Check against HaveIBeenPwned API
  - Block compromised passwords
```

---

## Implementation Plan

### Phase 1: Critical Security (Week 1)

| Day | Task | Priority |
|---|---|---|
| 1 | Enable email verification | P1 |
| 1 | Add password complexity requirements | P1 |
| 2 | Implement rate limiting | P1 |
| 2 | Add security headers | P1 |
| 3 | Implement account lockout | P1 |
| 3 | Add banned user check | P1 |

### Phase 2: Password Reset (Week 2)

| Day | Task | Priority |
|---|---|---|
| 4 | Create forgot-password page | P1 |
| 4 | Create reset-password page | P1 |
| 5 | Implement reset API routes | P1 |
| 5 | Add email templates | P1 |
| 6 | Test full flow | P1 |

### Phase 3: 2FA (Week 3)

| Day | Task | Priority |
|---|---|---|
| 7 | Implement 2FA enable/disable | P1 |
| 8 | Create 2FA setup page | P1 |
| 8 | Create 2FA verify page | P1 |
| 9 | Implement backup codes | P1 |
| 9 | Add admin 2FA enforcement | P1 |

### Phase 4: Session Management (Week 4)

| Day | Task | Priority |
|---|---|---|
| 10 | Implement session listing | P2 |
| 10 | Create session management page | P2 |
| 11 | Add session revocation | P2 |
| 11 | Implement login notifications | P2 |
| 12 | Add admin audit logging | P2 |

### Phase 5: Advanced Features (Week 5)

| Day | Task | Priority |
|---|---|---|
| 13 | Add IP whitelisting (admin) | P3 |
| 13 | Implement sensitive action re-auth | P3 |
| 14 | Add breach password check | P3 |
| 14 | Implement session analytics | P3 |

---

## Pages to Create

### User Pages

```
/verify-email          - Email verification
/forgot-password       - Request password reset
/reset-password        - Enter new password
/2fa-setup             - Enable 2FA (QR code)
/2fa-verify            - Enter TOTP during login
/2fa-recovery          - Use backup code
/account/security      - Security settings
/account/sessions      - Active sessions
```

### Admin Pages

```
/console-panel/security    - Security overview
/console-panel/audit       - Audit logs
/console-panel/sessions    - All user sessions
```

---

## API Routes to Create

### Auth Routes

```
POST /api/auth/send-verification
POST /api/auth/verify-email
POST /api/auth/resend-verification
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/validate-reset-token
POST /api/auth/2fa/enable
POST /api/auth/2fa/disable
POST /api/auth/2fa/verify
GET  /api/auth/2fa/backup-codes
GET  /api/auth/sessions
DELETE /api/auth/sessions/:id
DELETE /api/auth/sessions/all
```

### Admin Routes

```
GET  /api/admin/audit-logs
GET  /api/admin/sessions
DELETE /api/admin/sessions/:id
POST /api/admin/users/:id/unlock
POST /api/admin/users/:id/2fa-disable
```

---

## Summary

### Priority Order

```
P0 (Critical - Do First):
  ✓ Fix debug endpoints (DONE)
  ✓ Fix trade settlement (DONE)
  ✓ Fix trade amount (DONE)
  ✓ Add reconciliation (DONE)
  ✓ Remove hardcoded password (DONE)

P1 (High - Week 1-2):
  □ Email verification
  □ Password reset
  □ Password complexity
  □ Rate limiting
  □ Account lockout
  □ Banned user check

P2 (Medium - Week 3-4):
  □ 2FA enable/disable
  □ Session management
  □ Login notifications
  □ Admin audit logging

P3 (Low - Week 5+):
  □ IP whitelisting
  □ Sensitive action re-auth
  □ Breach password check
```

### Expected Outcome

```
BEFORE:
  - Basic email/password auth
  - No email verification
  - No password reset
  - Non-functional 2FA
  - No session management

AFTER:
  - Full email verification flow
  - Secure password reset
  - Working 2FA with backup codes
  - Complete session management
  - Login notifications
  - Admin 2FA enforcement
  - Rate limiting
  - Security headers
  - Account lockout
  - Audit logging
```

---

**Document Version:** 1.0
**Last Updated:** August 31, 2026
