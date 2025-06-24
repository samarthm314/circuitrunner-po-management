import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

const STORAGE_TEST_KEY = 'circuitrunners_storage_test';
const STORAGE_NOTICE_DISMISSED_KEY = 'circuitrunners_storage_notice_dismissed';

export const LocalStorageNotice: React.FC = () => {
  const [showNotice, setShowNotice] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    // Test if localStorage is available and working
    const testStorage = () => {
      try {
        localStorage.setItem(STORAGE_TEST_KEY, 'test');
        localStorage.getItem(STORAGE_TEST_KEY);
        localStorage.removeItem(STORAGE_TEST_KEY);
        return true;
      } catch (error) {
        return false;
      }
    };

    const isStorageAvailable = testStorage();
    setStorageAvailable(isStorageAvailable);

    // Show notice if storage is not available and user hasn't dismissed it
    if (!isStorageAvailable) {
      try {
        // Try to check if notice was dismissed (this might fail if storage is completely blocked)
        const dismissed = localStorage.getItem(STORAGE_NOTICE_DISMISSED_KEY);
        if (!dismissed) {
          setShowNotice(true);
        }
      } catch {
        // If we can't even check, definitely show the notice
        setShowNotice(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_NOTICE_DISMISSED_KEY, 'true');
    } catch {
      // If we can't save the dismissal, that's okay
    }
    setShowNotice(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!showNotice || storageAvailable) return null;

  const noticeContent = (
    <div 
      className="fixed top-0 left-0 right-0 z-[99998] p-4"
      style={{ zIndex: 99998 }}
    >
      <Card className="max-w-2xl mx-auto border-red-600 bg-red-900/95 backdrop-blur-sm">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-red-800/50 rounded-lg border border-red-600 flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-red-300 font-medium mb-2">Browser Storage Required</h3>
            <p className="text-red-200 text-sm leading-relaxed mb-3">
              This application requires browser storage (cookies and localStorage) to function properly. 
              It appears that storage is currently disabled or blocked in your browser.
            </p>
            <div className="bg-red-800/30 border border-red-600 rounded p-3 mb-3">
              <p className="text-red-200 text-xs font-medium mb-2">To enable full functionality:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-red-200 ml-2">
                <li>Enable cookies in your browser settings</li>
                <li>Disable "Block all cookies" if enabled</li>
                <li>Allow storage for this site specifically</li>
                <li>Disable private/incognito mode restrictions if applicable</li>
                <li>Check if browser extensions are blocking storage</li>
              </ul>
            </div>
            <p className="text-red-200 text-xs">
              Without storage, you may experience login issues, lost preferences, and limited functionality.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="flex items-center border-red-600 text-red-300 hover:bg-red-800/50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="flex items-center text-red-400 hover:bg-red-800/50"
            >
              <X className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  return createPortal(noticeContent, document.body);
};