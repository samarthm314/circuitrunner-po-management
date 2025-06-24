import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  linkWithPopup,
  AuthError
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { AlertModal } from '../ui/Modal';
import { Mail, Lock, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../hooks/useModal';

export const Login: React.FC = () => {
  const { loginAsGuest } = useAuth();
  const { alertModal, showAlert, closeAlert } = useModal();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.endsWith('@circuitrunners.com')) {
      setError('Please use your @circuitrunners.com email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setError(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        hd: 'circuitrunners.com' // Restrict to CircuitRunners domain
      });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if email is from the correct domain
      if (!user.email?.endsWith('@circuitrunners.com')) {
        await user.delete(); // Remove the user if wrong domain
        await showAlert({
          title: 'Invalid Domain',
          message: 'Please use your @circuitrunners.com Google account.',
          variant: 'error'
        });
        return;
      }

      // Check if user profile exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // New Google user - create profile with no roles
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
          role: 'guest', // Default role for new users
          createdAt: new Date(),
          authMethod: 'google'
        });

        await showAlert({
          title: 'Welcome!',
          message: 'Your account has been created. Please contact an administrator to have roles assigned to your account.',
          variant: 'info'
        });
      }

    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      if (error.code === 'auth/account-exists-with-different-credential') {
        // Handle account linking case
        await handleAccountLinking(error);
      } else if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to show error
        setError('');
      } else {
        setError(error.message || 'Failed to sign in with Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAccountLinking = async (error: AuthError) => {
    try {
      // Get the email from the error
      const email = error.customData?.email;
      if (!email) {
        throw new Error('Unable to determine email for account linking');
      }

      await showAlert({
        title: 'Account Linking Required',
        message: `An account with ${email} already exists. Please sign in with your email and password first, then link your Google account from your profile settings.`,
        variant: 'warning'
      });

    } catch (linkError) {
      console.error('Account linking error:', linkError);
      setError('Account linking failed. Please try signing in with email and password.');
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-green-900 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-900/50 p-3 rounded-full border border-green-700">
              <img 
                src="/5226055 (1).png" 
                alt="CircuitRunners Logo" 
                className="h-8 w-8"
              />
            </div>
          </div>
          <CardTitle className="text-2xl text-gray-100">CircuitRunners Finances System</CardTitle>
          <p className="text-gray-400 mt-2">Sign in to manage finances</p>
        </CardHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100 placeholder-gray-400"
                placeholder="your.name@circuitrunners.com"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-100 placeholder-gray-400"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            className="w-full"
            size="lg"
          >
            Sign In
          </Button>
        </form>

        {/* Google Sign-In */}
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            loading={googleLoading}
            disabled={loading}
            className="w-full mt-4"
            size="lg"
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>
        </div>

        {/* Guest Access */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-400">
              Want to explore the system?
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleGuestLogin}
            className="w-full"
            size="lg"
          >
            <Eye className="h-4 w-4 mr-2" />
            Continue as Guest
          </Button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Read-only access to budget and purchase order data
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Contact your administrator for account setup
          </p>
        </div>
      </Card>

      {/* Made by footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Made with ❤️ by Samarth Mahapatra
        </p>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.options.title}
        message={alertModal.options.message}
        variant={alertModal.options.variant}
      />
    </div>
  );
};