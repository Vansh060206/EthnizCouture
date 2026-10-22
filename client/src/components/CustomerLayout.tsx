import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';
import { AtelierConcierge } from './AtelierConcierge';
import { AuthModal } from './AuthModal';
import { MobileBottomNav } from './MobileBottomNav';

export const CustomerLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1F040A]">
      <Navbar />
      <CartDrawer />
      <AtelierConcierge />
      <AuthModal />
      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};
