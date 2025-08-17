import React from 'react';
import HeaderSimple from './HeaderSimple';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-dark">
      <HeaderSimple />
      <main className="min-h-screen pt-24">{children}</main>
    </div>
  );
}