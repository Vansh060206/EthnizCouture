import { Router } from 'express';
import { authenticateUser, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  getDashboardStats,
  getAdminProducts,
  createProduct,
  updateProduct,
  duplicateProduct,
  deleteProduct,
  getInventory,
  updateStock,
  getAdminOrders,
  getFulfilmentStats,
  executeFulfilmentAction,
  updateOrderStatus,
  getAdminCustomers,
  getAdminReviews,
  updateReviewStatus,
  deleteReview,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getAdminBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getMediaAssets,
  uploadMediaAsset,
  deleteMediaAsset,
  getAdminInquiries,
  getInquiryStats,
  updateInquiryStatus,
  replyToInquiry,
  deleteInquiry,
  getNewsletterSubscribers,
  exportNewsletterSubscribers
} from '../controllers/adminController';

const router = Router();

// Protect ALL admin routes
router.use(authenticateUser);
router.use(requireAdmin);

// Dashboard
router.get('/stats', getDashboardStats);

// Products
router.get('/products', getAdminProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.post('/products/:id/duplicate', duplicateProduct);
router.delete('/products/:id', deleteProduct);

// Inventory
router.get('/inventory', getInventory);
router.put('/inventory/:id/stock', updateStock);

// Orders & Fulfilment Workflow
router.get('/orders/fulfilment-stats', getFulfilmentStats);
router.get('/orders', getAdminOrders);
router.post('/orders/:id/fulfilment-action', executeFulfilmentAction);
router.put('/orders/:id/status', updateOrderStatus);

// Customers
router.get('/customers', getAdminCustomers);

// Reviews
router.get('/reviews', getAdminReviews);
router.put('/reviews/:id/status', updateReviewStatus);
router.delete('/reviews/:id', deleteReview);

// Categories
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Coupons
router.get('/coupons', getAdminCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Banners & Homepage Content
router.get('/banners', getAdminBanners);
router.post('/banners', createBanner);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

// Media Library
router.get('/media', getMediaAssets);
router.post('/media/upload', upload.single('file'), uploadMediaAsset);
router.delete('/media/:id', deleteMediaAsset);

// Patron Contact Inquiries & Concierge Inbox
router.get('/inquiries/stats', getInquiryStats);
router.get('/inquiries', getAdminInquiries);
router.put('/inquiries/:id/status', updateInquiryStatus);
router.post('/inquiries/:id/reply', replyToInquiry);
router.delete('/inquiries/:id', deleteInquiry);

// Newsletter Subscribers
router.get('/newsletter/subscribers', getNewsletterSubscribers);
router.get('/newsletter/export', exportNewsletterSubscribers);

export default router;
