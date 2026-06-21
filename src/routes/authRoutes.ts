import { Router } from 'express';
import { login, logout, getMe } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limit login route to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { message: 'Thực hiện đăng nhập quá nhiều lần, vui lòng thử lại sau 15 phút.' },
});

router.post('/login', loginLimiter, login);
router.get('/me', authenticateJWT, getMe);
router.post('/logout', authenticateJWT, logout);

export default router;
