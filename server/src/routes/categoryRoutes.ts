import { Router } from 'express';
import { getCategories, getCollections } from '../controllers/categoryController';

const router = Router();

router.get('/', getCategories);
router.get('/collections', getCollections);

export default router;
