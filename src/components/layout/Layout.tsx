import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5 text-gray-300" />
          ) : (
            <Menu className="h-5 w-5 text-gray-300" />
          )}
        </button>

        {/* Sidebar */}
        <div className={`
          fixed lg:relative inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <Sidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-gray-900 lg:ml-0">
          <div className="p-4 sm:p-6 pt-16 lg:pt-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};