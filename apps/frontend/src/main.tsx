import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppRoutes from "./App.tsx"; // App.tsx will now export routes
import "./globals.css";
import "./sentry"; // 👈 Must be before any other code
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { NotificationProvider } from './contexts/NotificationContext.tsx';
import { SearchProvider } from './contexts/SearchContext.tsx';
import { useAuthStore } from './stores/authStore.ts'; // Import useAuthStore

const queryClient = new QueryClient();

// Create the router instance
const router = createBrowserRouter(AppRoutes);

// Main rendering of the application
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <SearchProvider>
          <RouterProvider router={router} />
          <Toaster 
            position="top-right" 
            theme="light"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
              style: {
                background: 'white',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }
            }}
          />
        </SearchProvider>
      </NotificationProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
