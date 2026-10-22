import { Router } from 'express';
import {
  getBanners,
  submitContact,
  subscribeNewsletter
} from '../controllers/contentController';

const router = Router();

router.get('/banners', getBanners);
router.post('/contact', submitContact);
router.post('/newsletter', subscribeNewsletter);

export default router;
