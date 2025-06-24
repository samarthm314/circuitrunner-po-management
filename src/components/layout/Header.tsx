import React, { useState } from 'react';
import { LogOut, User, Eye, Menu, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AlertModal } from '../ui/Modal';
import { NotificationDropdown } from './NotificationDropdown';
import { signOut, linkWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useModal } from '../../hooks/useModal';

export const Header: React.FC = () => {
  const { userProfile, isGuest, logout, getAllRoles, currentUser } = useAuth();
  const { alertModal, showAlert, closeAlert } = useModal();
  const [linkingGoogle, setLinkingGoogle] = useState(false);

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

  const handleLinkGoogleAccount = async () => {
    if (!currentUser || isGuest) return;

    setLinkingGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        hd: 'circuitrunners.com'
      });

      await linkWithPopup(currentUser, provider);
      
      await showAlert({
        title: 'Success!',
        message: 'Your Google account has been successfully linked. You can now sign in using either method.',
        variant: 'success'
      });

    } catch (error: any) {
      console.error('Error linking Google account:', error);
      
      let errorMessage = 'Failed to link Google account. Please try again.';
      
      if (error.code === 'auth/credential-already-in-use') {
        errorMessage = 'This Google account is already linked to another user.';
      } else if (error.code === 'auth/provider-already-linked') {
        errorMessage = 'A Google account is already linked to your profile.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = '';
      }

      if (errorMessage) {
        await showAlert({
          title: 'Linking Failed',
          message: errorMessage,
          variant: 'error'
        });
      }
    } finally {
      setLinkingGoogle(false);
    }
  };

  const userRoles = getAllRoles();
  const displayRoles = userRoles.length > 1 
    ? `${userRoles.length} roles` 
    : userRoles[0]?.charAt(0).toUpperCase() + userRoles[0]?.slice(1);

  // Check if user has Google provider linked
  const hasGoogleLinked = currentUser?.providerData.some(provider => provider.providerId === 'google.com');
  const hasPasswordProvider = currentUser?.providerData.some(provider => provider.providerId === 'password');

  // Determine if this is a signed-in user with guest-level access
  const isSignedInGuest = currentUser && isGuest;

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
                  <span className="hidden sm:inline">
                    {isSignedInGuest ? 'Limited Access' : 'Guest Mode'}
                  </span>
                  <span className="sm:hidden">
                    {isSignedInGuest ? 'Limited' : 'Guest'}
                  </span>
                </Badge>
              </div>
            )}
          </div>
          
          {/* Right side - User controls */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Only show notifications for users with actual roles */}
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
                      {isSignedInGuest ? 'No Roles Assigned' : displayRoles}
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

              {/* Show role assignment notice for signed-in guests */}
              {isSignedInGuest && (
                <div className="hidden sm:block">
                  <Badge variant="warning" size="sm">
                    Contact Admin for Roles
                  </Badge>
                </div>
              )}

              {/* Google Account Linking Button - only for users with password auth and no Google link */}
              {!isGuest && hasPasswordProvider && !hasGoogleLinked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLinkGoogleAccount}
                  loading={linkingGoogle}
                  disabled={linkingGoogle}
                  className="hidden sm:flex items-center px-2 sm:px-3"
                  title="Link Google Account"
                >
                  <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Link Google</span>
                </Button>
              )}
              
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

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.options.title}
        message={alertModal.options.message}
        variant={alertModal.options.variant}
      />
    </header>
  );
};