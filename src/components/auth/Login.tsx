import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Mail, Lock, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Login: React.FC = () => {
  const { loginAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
          <CardTitle className="text-2xl text-gray-100">CircuitRunners PO System</CardTitle>
          <p className="text-gray-400 mt-2">Sign in to manage purchase orders</p>
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
    </div>
  );
};