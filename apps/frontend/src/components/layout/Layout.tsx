import React, { useState } from "react";
import HeaderSimple from "./HeaderSimple";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-dark">
      <HeaderSimple onHeaderVisibilityChange={setIsHeaderVisible} />
      <main
        className={`min-h-screen transition-all duration-300 ${isHeaderVisible ? "pt-32" : "pt-0"}`}
      >
        {children}
      </main>
    </div>
  );
}
