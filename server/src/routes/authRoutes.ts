import { Router } from 'express';
import {
  register,
  login,
  adminLogin,
  getMe,
  updateProfile,
  googleAuth,
  forgotPassword,
  verifyResetOtp,
  resetPassword
} from '../controllers/authController';
import { authenticateUser } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/admin-login', authLimiter, adminLogin);
router.get('/me', authenticateUser, getMe);
router.put('/profile', authenticateUser, updateProfile);

// Password recovery endpoints
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-reset-otp', authLimiter, verifyResetOtp);
router.post('/reset-password', authLimiter, resetPassword);

export default router;
