import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Cookie, X, Check, Info } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

const COOKIE_CONSENT_KEY = 'circuitrunners_cookie_consent';
const COOKIE_TEST_KEY = 'circuitrunners_cookie_test';

// Helper functions that can be used throughout the app
export const getCookieConsent = (): 'accepted' | 'declined' | null => {
  try {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted' || consent === 'declined') {
      return consent as 'accepted' | 'declined';
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const hasCookieConsent = (): boolean => {
  const consent = getCookieConsent();
  return consent !== null;
};

export const areCookiesAccepted = (): boolean => {
  return getCookieConsent() === 'accepted';
};
export const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Test if localStorage/cookies are working
  const testCookieSupport = (): boolean => {
    try {
      localStorage.setItem(COOKIE_TEST_KEY, 'test');
      const testValue = localStorage.getItem(COOKIE_TEST_KEY);
      localStorage.removeItem(COOKIE_TEST_KEY);
      return testValue === 'test';
    } catch (error) {
      return false;
    }
  };
  useEffect(() => {
    // Test if cookies/localStorage are working
    const cookiesWork = testCookieSupport();
    
    if (cookiesWork) {
      // Check if user has already given consent (accepted or declined)
      try {
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (!consent || (consent !== 'accepted' && consent !== 'declined')) {
          // Show banner after a short delay to ensure page is loaded
          const timer = setTimeout(() => {
            setShowBanner(true);
          }, 1000);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        // If we can't read localStorage, show the banner
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    } else {
      // If cookies don't work, show the banner
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
      setShowBanner(false);
    } catch (error) {
      // If we can't save the preference, at least hide the banner for this session
      console.warn('Could not save cookie consent preference');
      setShowBanner(false);
    }
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
      setShowBanner(false);
    } catch (error) {
      // If we can't save the preference, at least hide the banner for this session
      console.warn('Could not save cookie consent preference');
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  const bannerContent = (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[99999] p-4"
      style={{ zIndex: 99999 }}
    >
      <Card className="max-w-4xl mx-auto border-blue-600 bg-gray-800/95 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <div className="flex items-start space-x-3 flex-1">
            <div className="p-2 bg-blue-900/50 rounded-lg border border-blue-700 flex-shrink-0">
              <Cookie className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-blue-300 font-medium mb-1">Cookie & Site Functionality Notice</h3>
              <p className="text-blue-200 text-sm leading-relaxed">
                This site requires cookies and local storage for essential functionality including user authentication, 
                session management, and preference storage. Without these, the site cannot function properly.
              </p>
              {showDetails && (
                <div className="mt-3 p-3 bg-blue-900/30 border border-blue-700 rounded text-xs text-blue-200">
                  <p className="font-medium mb-2">What we store:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Authentication tokens:</strong> To keep you logged in securely</li>
                    <li><strong>User preferences:</strong> Dashboard filters, display settings</li>
                    <li><strong>Session data:</strong> Temporary data for form submissions and navigation</li>
                    <li><strong>Firebase data:</strong> Required for database connectivity and real-time updates</li>
                  </ul>
                  <p className="mt-2 font-medium">
                    <strong>Important:</strong> No tracking cookies or analytics are used. All data is essential for site functionality.
                    Declining will limit your ability to use the application.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-center"
            >
              <Info className="h-4 w-4 mr-2" />
              {showDetails ? 'Hide Details' : 'Learn More'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="flex items-center justify-center"
            >
              <X className="h-4 w-4 mr-2" />
              Decline (Limited Functionality)
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex items-center justify-center bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Accept & Continue
            </Button>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-400 text-center">
            These cookies and local storage are essential for the application to work. Declining may prevent login and other features.
            <span className="block mt-1">
              Contact your administrator if you have questions about data usage.
            </span>
          </p>
        </div>
      </Card>
    </div>
  );

  return createPortal(bannerContent, document.body);
};