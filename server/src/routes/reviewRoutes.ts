import { Router } from 'express';
import { getProductReviews, submitReview, checkReviewEligibility } from '../controllers/reviewController';
import { authenticateUser } from '../middleware/auth';

const router = Router();

router.get('/product/:productId', getProductReviews);
router.get('/eligibility/:productId', authenticateUser, checkReviewEligibility);
router.post('/', authenticateUser, submitReview);

export default router;
