export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  googleId?: string | null;
  avatar?: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt?: string;
  addresses?: Address[];
  _count?: {
    orders: number;
    wishlist: number;
  };
}

export interface Address {
  id: string;
  userId?: string;
  fullName: string;
  phone: string;
  street: string;
  apartment?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  details?: string | null;
  fabric?: string | null;
  occasion?: string | null;
  careInstructions?: string | null;
  gender: 'WOMEN' | 'MEN' | 'UNISEX';
  categoryId: string;
  collectionId?: string | null;
  price: number;
  comparePrice?: number | null;
  discountPercent: number;
  stock: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  tags?: string | null;
  availableSizes?: string | null;
  availableColors?: string | null;
  rating?: number;
  reviewCount?: number;
  category?: Category;
  collection?: Collection;
  images: ProductImage[];
  reviews?: Review[];
  ratingDistribution?: Record<number, number>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  featured: boolean;
  _count?: {
    products: number;
  };
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  bannerImage?: string | null;
  tagline?: string | null;
  featured: boolean;
  _count?: {
    products: number;
  };
}

export interface CartItem {
  id: string;
  cartId?: string;
  productId: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  product: Product;
}

export interface Cart {
  id: string;
  userId?: string;
  items: CartItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string | null;
  productName: string;
  productImage?: string | null;
  size?: string | null;
  color?: string | null;
  price: number;
  quantity: number;
  total: number;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: string;
  notes?: string | null;
  actorId?: string | null;
  source?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingStreet: string;
  shippingApartment?: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  shippingCountry: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  couponCode?: string | null;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  orderStatus: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'RETURN_REQUESTED' | 'RETURN_APPROVED' | 'RETURNED';
  paymentMethod: string;
  paymentIntentId?: string | null;
  trackingNumber?: string | null;
  carrierName?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  estimatedDelivery?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: (OrderItem & {
    product?: {
      id: string;
      name: string;
      sku: string;
      stock: number;
    } | null;
  })[];
  statusHistory?: OrderStatusHistory[];
  user?: { id?: string; name: string; email: string; phone?: string | null };
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string;
  comment: string;
  imageUrl?: string | null;
  isVerifiedPurchase: boolean;
  status: 'PENDING' | 'APPROVED' | 'HIDDEN';
  createdAt: string;
  user?: { id?: string; name: string; email?: string };
  product?: { id: string; name: string; slug: string };
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number | null;
  expiryDate?: string | null;
  usageLimit?: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface Banner {
  id: string;
  key: string;
  title: string;
  subtitle?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
  imageUrl?: string | null;
  tag?: string | null;
  order: number;
  isActive: boolean;
}

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: 'UNREAD' | 'READ' | 'RESOLVED';
  createdAt: string;
}

export interface InquiryStats {
  total: number;
  unread: number;
  read: number;
  resolved: number;
}

