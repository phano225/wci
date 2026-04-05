import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { AdminDashboard } from '../pages/AdminDashboard';
import { ArticlePage } from '../pages/ArticlePage';
import { ContactPage } from '../pages/ContactPage';
import { useVersionCheck } from './useVersionCheck';
import { WpRedirectHandler } from '../components/WpRedirectHandler';

function App() {
  useVersionCheck();

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:id" element={<ArticlePage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/contact" element={<ContactPage />} />
          
          {/* Redirection SEO des anciens liens WordPress */}
          <Route path="/:year/:month/:day/:slug" element={<WpRedirectHandler />} />
          <Route path="/category/:slug" element={<Navigate to="/" replace />} />
          <Route path="/tag/:slug" element={<Navigate to="/" replace />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
