import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const PublicLayout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:px-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};