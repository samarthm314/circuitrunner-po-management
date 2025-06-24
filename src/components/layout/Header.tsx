import React from 'react';
import { LogOut, User, Eye, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NotificationDropdown } from './NotificationDropdown';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';

export const Header: React.FC = () => {
  const { userProfile, isGuest, logout, getAllRoles } = useAuth();

  const handleSignOut = async () => {
    try {
      if (isGuest) {
        logout();
      } else {
        await signOut(auth);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userRoles = getAllRoles();
  const displayRoles = userRoles.length > 1 
    ? `${userRoles.length} roles` 
    : userRoles[0]?.charAt(0).toUpperCase() + userRoles[0]?.slice(1);

  return (
    <header className="bg-gray-800 shadow-sm border-b border-gray-700 relative z-40">
      <div className="w-full px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16 w-full">
          {/* Left side - Logo and title */}
          <div className="flex items-center flex-shrink-0 min-w-0">
            <img 
              src="/5226055 (1).png" 
              alt="CircuitRunners Logo" 
              className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0"
            />
            <h1 className="ml-2 text-sm sm:text-lg lg:text-xl font-bold text-gray-100 truncate">
              <span className="hidden sm:inline">CircuitRunners Finances</span>
              <span className="sm:hidden">CR Finances</span>
            </h1>
            {isGuest && (
              <div className="ml-2 sm:ml-6">
                <Badge variant="info" size="sm">
                  <Eye className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Guest Mode</span>
                  <span className="sm:hidden">Guest</span>
                </Badge>
              </div>
            )}
          </div>
          
          {/* Right side - User controls */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {!isGuest && <NotificationDropdown />}
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                <div className="text-xs sm:text-sm min-w-0">
                  <p className="font-medium text-gray-100 truncate max-w-24 sm:max-w-none">
                    {userProfile?.displayName}
                  </p>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <p className="text-gray-400 capitalize text-xs sm:text-sm truncate">
                      {isGuest ? 'Guest' : displayRoles}
                    </p>
                    {userRoles.length > 1 && !isGuest && (
                      <div className="hidden sm:flex space-x-1">
                        {userRoles.map(role => (
                          <Badge key={role} variant="info" size="sm">
                            {role.charAt(0).toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <Button
                variant="danger"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center px-2 sm:px-3"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Log Out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};