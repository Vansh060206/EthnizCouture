import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Customer Layout & Pages
import { CustomerLayout } from './components/CustomerLayout';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { OrderTracking } from './pages/OrderTracking';
import { Account } from './pages/Account';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';

// Admin Layout & Pages
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminInventory } from './pages/admin/AdminInventory';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminInquiries } from './pages/admin/AdminInquiries';
import { AdminCustomers } from './pages/admin/AdminCustomers';
import { AdminReviews } from './pages/admin/AdminReviews';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminCoupons } from './pages/admin/AdminCoupons';
import { AdminContent } from './pages/admin/AdminContent';
import { AdminMedia } from './pages/admin/AdminMedia';
import { AdminSettings } from './pages/admin/AdminSettings';

import { ProtectedRoute } from './components/ProtectedRoute';
import { ScrollToTop } from './components/ScrollToTop';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastProvider>
        <AuthProvider>
          <CurrencyProvider>
            <CartProvider>
              <WishlistProvider>
                <Routes>
                  
                  {/* Storefront Customer Routes */}
                  <Route element={<CustomerLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/product/:slug" element={<ProductDetail />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route
                      path="/checkout"
                      element={
                        <ProtectedRoute redirectMessage="Please sign in to place your order and complete checkout.">
                          <CheckoutPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
                    <Route path="/track-order" element={<OrderTracking />} />
                    <Route
                      path="/account"
                      element={
                        <ProtectedRoute redirectMessage="Please sign in to view your orders and profile.">
                          <Account />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/account/:section"
                      element={
                        <ProtectedRoute redirectMessage="Please sign in to view your orders and profile.">
                          <Account />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                  </Route>

                  {/* Dedicated Executive Atelier Portal Login */}
                  <Route path="/atelier-portal/login" element={<AdminLogin />} />

                  {/* Dedicated Secure Executive Atelier Portal */}
                  <Route
                    path="/atelier-portal"
                    element={
                      <ProtectedRoute adminOnly>
                        <AdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<AdminOverview />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="inventory" element={<AdminInventory />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="inquiries" element={<AdminInquiries />} />
                    <Route path="customers" element={<AdminCustomers />} />
                    <Route path="reviews" element={<AdminReviews />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="collections" element={<AdminCategories />} />
                    <Route path="coupons" element={<AdminCoupons />} />
                    <Route path="content" element={<AdminContent />} />
                    <Route path="media" element={<AdminMedia />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>

                  {/* Public /admin disguised redirect to protect secret url */}
                  <Route path="/admin" element={<Navigate to="/atelier-portal/login" replace />} />
                  <Route path="/admin/*" element={<Navigate to="/atelier-portal/login" replace />} />

                  {/* Catch-all fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />

                </Routes>
              </WishlistProvider>
            </CartProvider>
          </CurrencyProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
