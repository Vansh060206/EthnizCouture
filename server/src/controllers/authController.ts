import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../prisma';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { backgroundQueue } from '../services/backgroundQueue';
import { emailService } from '../services/emailService';
import { logger } from '../utils/logger';
import {
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhone
} from '../utils/validation';

const generateToken = (user: { id: string; email: string; role: string; name: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    const nameVal = validateFullName(name, 'Full Name');
    if (!nameVal.isValid) {
      res.status(400).json({ message: nameVal.message, field: 'name' });
      return;
    }

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      res.status(400).json({ message: emailVal.message, field: 'email' });
      return;
    }

    const passwordVal = validatePassword(password);
    if (!passwordVal.isValid) {
      res.status(400).json({ message: passwordVal.message, field: 'password' });
      return;
    }

    const phoneVal = validatePhone(phone, false);
    if (!phoneVal.isValid) {
      res.status(400).json({ message: phoneVal.message, field: 'phone' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      res.status(400).json({ message: 'An account with this email already exists', field: 'email' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        phone: phone?.trim() || null,
        role: 'CUSTOMER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    const token = generateToken(user);

    // Enqueue luxury welcome email for new registration (non-blocking, exactly-once)
    backgroundQueue.enqueue('WELCOME_EMAIL', {
      userId: user.id,
      email: user.email,
      name: user.name
    }).catch((qErr) => {
      logger.error('Failed to enqueue welcome email during registration', qErr);
    });

    res.status(201).json({
      message: 'Account created successfully',
      user,
      token
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      res.status(400).json({ message: emailVal.message, field: 'email' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      res.status(400).json({ message: 'Password is required.', field: 'password' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    if (!user.passwordHash) {
      res.status(401).json({
        message: 'This account was registered using Google. Please click "Continue with Google" to access your atelier account.'
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user);

    res.json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      token
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
};

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, masterKey } = req.body;

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      res.status(400).json({ message: 'Valid administrator email is required.', field: 'email' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      res.status(400).json({ message: 'Master password is required.', field: 'password' });
      return;
    }

    if (!masterKey || typeof masterKey !== 'string' || masterKey.trim().length === 0) {
      res.status(400).json({ message: 'Atelier Secret Passkey is required.', field: 'masterKey' });
      return;
    }

    // Verify Master Secret Passkey strictly
    const expectedKey = config.adminMasterKey.trim();
    if (masterKey.trim() !== expectedKey) {
      res.status(403).json({ message: 'Invalid Atelier Secret Passkey. Access rejected.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid administrator credentials.' });
      return;
    }

    // Enforce that only users with role === 'ADMIN' can authenticate
    if (user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Access denied. Account lacks administrative privileges.' });
      return;
    }

    if (!user.passwordHash) {
      res.status(401).json({ message: 'Invalid administrator credentials.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid administrator credentials.' });
      return;
    }

    const token = generateToken(user);

    res.json({
      message: 'Atelier administrative session authenticated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      token
    });
  } catch (error: any) {
    console.error('adminLogin error:', error);
    res.status(500).json({ message: 'Internal server error during administrative authentication.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        addresses: {
          orderBy: { isDefault: 'desc' }
        },
        _count: {
          select: {
            orders: true,
            wishlist: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    console.error('getMe error:', error);
    res.status(500).json({ message: 'Failed to retrieve profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { name, phone } = req.body;

    if (name !== undefined) {
      const nameVal = validateFullName(name, 'Full Name');
      if (!nameVal.isValid) {
        res.status(400).json({ message: nameVal.message, field: 'name' });
        return;
      }
    }

    if (phone !== undefined && phone !== null && String(phone).trim().length > 0) {
      const phoneVal = validatePhone(phone, true);
      if (!phoneVal.isValid) {
        res.status(400).json({ message: phoneVal.message, field: 'phone' });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name ? name.trim() : undefined,
        phone: phone ? phone.trim() : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true
      }
    });

    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (error: any) {
    console.error('updateProfile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

/**
 * Authoritative Google Sign-In & Registration Controller.
 * Verifies Google ID token cryptographically, handles account linking,
 * enforces customer roles, and triggers luxury welcome emails exactly once.
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawToken = req.body?.idToken || req.body?.credential;

    if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
      res.status(400).json({ message: 'Google ID token credential is required.' });
      return;
    }

    const token = rawToken.trim();

    // Verify Google ID token cryptographically via google-auth-library
    let payload: any;
    try {
      const client = new OAuth2Client(config.googleClientId || undefined);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: config.googleClientId ? [config.googleClientId] : undefined
      });
      payload = ticket.getPayload();
    } catch (verifyErr: any) {
      logger.warn('Google ID token verification failed', { error: verifyErr.message });
      res.status(401).json({ message: 'Invalid or expired Google authentication credential.' });
      return;
    }

    if (!payload || !payload.sub) {
      res.status(401).json({ message: 'Invalid Google authentication credential payload.' });
      return;
    }

    // Validate Issuer
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (payload.iss && !validIssuers.includes(payload.iss)) {
      res.status(401).json({ message: 'Invalid Google token issuer.' });
      return;
    }

    const googleId = String(payload.sub);
    const rawEmail = payload.email;

    if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.includes('@')) {
      res.status(400).json({ message: 'Google account does not provide a valid email address.' });
      return;
    }

    // Require email verification claim from Google
    if (payload.email_verified !== true && payload.email_verified !== 'true') {
      res.status(400).json({
        message: 'Your Google email address is unverified by Google. Please verify it or sign in with your password.'
      });
      return;
    }

    const email = rawEmail.toLowerCase().trim();
    let isNewUser = false;
    let user: any = null;

    // 1. Look up existing patron by permanent Google Subject ID
    const existingUserByGoogleId = await prisma.user.findUnique({
      where: { googleId }
    });

    if (existingUserByGoogleId) {
      user = existingUserByGoogleId;

      // Update avatar if not previously recorded
      if (payload.picture && !user.avatar) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatar: payload.picture }
        });
      }
    } else {
      // 2. Look up existing patron by verified email
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUserByEmail) {
        // Link Google ID to existing verified account. Preserve existing role (never elevate)
        user = await prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            googleId,
            avatar: existingUserByEmail.avatar || payload.picture || null
          }
        });
        logger.info(`Safely linked Google ID to existing customer account [User ID: ${user.id}]`);
      } else {
        // 3. Create brand-new patron account
        try {
          const rawName = payload.name?.trim();
          const fallbackName = email.split('@')[0];
          const patronName = rawName && rawName.length > 0 ? rawName : fallbackName;

          user = await prisma.user.create({
            data: {
              name: patronName,
              email,
              googleId,
              avatar: payload.picture || null,
              passwordHash: null,
              role: 'CUSTOMER', // Strict guarantee: Google Sign-in always defaults to CUSTOMER
              welcomeEmailSent: false
            }
          });

          isNewUser = true;

          // Enqueue luxury welcome email exactly once
          backgroundQueue.enqueue('WELCOME_EMAIL', {
            userId: user.id,
            email: user.email,
            name: user.name
          }).catch((qErr) => {
            logger.error('Failed to enqueue welcome email for new Google patron', qErr);
          });

          logger.info(`New patron account registered via Google Sign-In [User ID: ${user.id}]`);
        } catch (createErr: any) {
          // Concurrency & race condition safety (P2002 unique constraint violation)
          if (createErr.code === 'P2002') {
            user = await prisma.user.findFirst({
              where: { OR: [{ googleId }, { email }] }
            });
            if (!user) throw createErr;
          } else {
            throw createErr;
          }
        }
      }
    }

    const tokenJwt = generateToken(user);

    res.json({
      message: isNewUser ? 'Welcome to Ethniz Couture!' : 'Authenticated successfully with Google',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar
      },
      token: tokenJwt,
      isNewUser
    });
  } catch (error: any) {
    logger.error('googleAuth error:', error);
    res.status(500).json({ message: 'Internal server error during Google authentication.' });
  }
};

/**
 * Initiates the password recovery flow by generating and dispatching a 6-digit OTP to the patron's email.
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      res.status(400).json({ message: emailVal.message, field: 'email' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Spam / Flood prevention: enforce minimum 60 seconds interval per email address
    const recentReset = await prisma.passwordReset.findFirst({
      where: {
        email: cleanEmail,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) }
      }
    });

    if (recentReset) {
      res.status(429).json({
        message: 'A verification code was recently dispatched. Please wait 60 seconds before requesting another.'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    // Timing-attack / User Enumeration resistance:
    // If the account does not exist, return a generic message without exposing user non-existence
    if (!user) {
      res.status(200).json({
        message: 'If an atelier account is associated with this email, a 6-digit recovery code has been sent.'
      });
      return;
    }

    // Invalidate any previous unconsumed reset tokens for this email
    await prisma.passwordReset.updateMany({
      where: {
        email: cleanEmail,
        used: false
      },
      data: {
        used: true
      }
    });

    // Generate secure 6-digit cryptographic OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lifetime

    await prisma.passwordReset.create({
      data: {
        email: cleanEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        used: false
      }
    });

    // Send email asynchronously via Resend
    emailService.sendPasswordResetOtpEmail({
      email: cleanEmail,
      name: user.name,
      otp,
      expiresMinutes: 15
    }).catch((emailErr) => {
      logger.error(`Failed to send password recovery OTP to ${cleanEmail}`, emailErr);
    });

    logger.info(`Password recovery OTP generated and queued for ${cleanEmail}`);

    res.status(200).json({
      message: 'If an atelier account is associated with this email, a 6-digit recovery code has been sent.'
    });
  } catch (error: any) {
    logger.error('forgotPassword error:', error);
    res.status(500).json({ message: 'Internal server error during password recovery initiation.' });
  }
};

/**
 * Validates the 6-digit OTP before allowing patron to enter a new password.
 */
export const verifyResetOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      res.status(400).json({ message: 'Valid email is required', field: 'email' });
      return;
    }

    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      res.status(400).json({ message: 'Please enter a valid 6-digit verification code.', field: 'otp' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    const activeReset = await prisma.passwordReset.findFirst({
      where: {
        email: cleanEmail,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeReset) {
      res.status(400).json({ message: 'Verification code has expired or is invalid. Please request a new one.' });
      return;
    }

    if (activeReset.attempts >= 5) {
      await prisma.passwordReset.update({
        where: { id: activeReset.id },
        data: { used: true }
      });
      res.status(400).json({ message: 'Too many incorrect attempts. Please request a new recovery code.' });
      return;
    }

    const otpHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (otpHash !== activeReset.otpHash) {
      await prisma.passwordReset.update({
        where: { id: activeReset.id },
        data: { attempts: { increment: 1 } }
      });
      const remainingAttempts = 4 - activeReset.attempts;
      res.status(400).json({
        message: `Incorrect verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Code invalidated.'}`
      });
      return;
    }

    res.status(200).json({
      valid: true,
      message: 'Verification code verified successfully.'
    });
  } catch (error: any) {
    logger.error('verifyResetOtp error:', error);
    res.status(500).json({ message: 'Internal server error verifying recovery code.' });
  }
};

/**
 * Resets the patron's password after validating the OTP and applies the new bcrypt hash.
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      res.status(400).json({ message: 'Valid email is required', field: 'email' });
      return;
    }

    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      res.status(400).json({ message: 'Please enter a valid 6-digit verification code.', field: 'otp' });
      return;
    }

    const passVal = validatePassword(newPassword);
    if (!passVal.isValid) {
      res.status(400).json({ message: passVal.message, field: 'newPassword' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    const activeReset = await prisma.passwordReset.findFirst({
      where: {
        email: cleanEmail,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeReset) {
      res.status(400).json({ message: 'Verification code has expired or is invalid. Please request a new one.' });
      return;
    }

    if (activeReset.attempts >= 5) {
      await prisma.passwordReset.update({
        where: { id: activeReset.id },
        data: { used: true }
      });
      res.status(400).json({ message: 'Too many incorrect attempts. Please request a new recovery code.' });
      return;
    }

    const otpHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (otpHash !== activeReset.otpHash) {
      await prisma.passwordReset.update({
        where: { id: activeReset.id },
        data: { attempts: { increment: 1 } }
      });
      res.status(400).json({ message: 'Incorrect verification code. Please check your email.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      res.status(404).json({ message: 'Account not found.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Atomically update password and consume reset token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      }),
      prisma.passwordReset.update({
        where: { id: activeReset.id },
        data: { used: true }
      })
    ]);

    // Send security notification email
    emailService.sendPasswordResetSuccessEmail({
      email: cleanEmail,
      name: user.name
    }).catch((emailErr) => {
      logger.error(`Failed to send password reset confirmation email to ${cleanEmail}`, emailErr);
    });

    logger.info(`Password successfully updated for user ${user.id} (${cleanEmail})`);

    res.status(200).json({
      message: 'Password reset successful. You may now sign in with your new password.'
    });
  } catch (error: any) {
    logger.error('resetPassword error:', error);
    res.status(500).json({ message: 'Internal server error while resetting password.' });
  }
};
