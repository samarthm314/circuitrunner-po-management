import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { NotificationDropdown } from './NotificationDropdown';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';

export const Header: React.FC = () => {
  const { userProfile } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-gray-800 shadow-sm border-b border-gray-700">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 w-full">
          {/* Left side - Logo and title pushed all the way to the left */}
          <div className="flex items-center flex-shrink-0">
            <img 
              src="/5226055 (1).png" 
              alt="CircuitRunners Logo" 
              className="h-8 w-8"
            />
            <h1 className="ml-2 text-xl font-bold text-gray-100 whitespace-nowrap">
              CircuitRunners PO System
            </h1>
          </div>
          
          {/* Right side - User controls pushed all the way to the right */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <NotificationDropdown />
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <div className="text-sm">
                  <p className="font-medium text-gray-100">{userProfile?.displayName}</p>
                  <p className="text-gray-400 capitalize">{userProfile?.role}</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-gray-400 hover:text-gray-200"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};