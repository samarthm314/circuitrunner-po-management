import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  Settings, 
  CreditCard,
  Archive,
  Eye,
  Heart,
  Users
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: BarChart3, roles: ['director', 'admin', 'purchaser', 'guest'] },
  { name: 'Create PO', href: '/create-po', icon: FileText, roles: ['director'] },
  { name: 'My POs', href: '/my-pos', icon: Clock, roles: ['director'] },
  { name: 'Pending Approval', href: '/pending-approval', icon: CheckCircle, roles: ['admin'] },
  { name: 'Pending Purchase', href: '/pending-purchase', icon: CreditCard, roles: ['purchaser'] },
  { name: 'All POs', href: '/all-pos', icon: Archive, roles: ['admin', 'purchaser', 'guest'] },
  { name: 'Transactions', href: '/transactions', icon: CreditCard, roles: ['admin', 'purchaser', 'guest'] },
  { name: 'Budget Management', href: '/budget-management', icon: Settings, roles: ['admin'] },
  { name: 'User Management', href: '/user-management', icon: Users, roles: ['admin'] },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { userProfile, isGuest } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    userProfile?.role && item.roles.includes(userProfile.role as string)
  );

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 h-full flex flex-col">
      <nav className="mt-8 px-4 flex-1">
        {isGuest && (
          <div className="mb-6 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
            <div className="flex items-center text-blue-300 mb-2">
              <Eye className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Guest Mode</span>
            </div>
            <p className="text-xs text-blue-200">
              You have read-only access to budget and PO data. No editing allowed.
            </p>
          </div>
        )}
        
        <ul className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-900/50 text-green-300 border border-green-700'
                      : 'text-gray-300 hover:text-gray-100 hover:bg-gray-700'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-6 border-t border-gray-700">
        <div className="flex items-center justify-center text-xs text-gray-500">
          <span>Made with</span>
          <Heart className="h-3 w-3 mx-1 text-red-500 fill-current" />
          <span>by Samarth Mahapatra</span>
        </div>
      </div>
    </div>
  );
};