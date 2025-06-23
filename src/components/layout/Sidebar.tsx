import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  Settings, 
  CreditCard,
  Archive
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: BarChart3, roles: ['director', 'admin', 'purchaser'] },
  { name: 'Create PO', href: '/create-po', icon: FileText, roles: ['director', 'admin'] },
  { name: 'My POs', href: '/my-pos', icon: Clock, roles: ['director', 'admin'] },
  { name: 'Pending Approval', href: '/pending-approval', icon: CheckCircle, roles: ['admin'] },
  { name: 'Pending Purchase', href: '/pending-purchase', icon: CreditCard, roles: ['purchaser'] },
  { name: 'All POs', href: '/all-pos', icon: Archive, roles: ['admin', 'purchaser'] },
  { name: 'Transactions', href: '/transactions', icon: CreditCard, roles: ['admin', 'purchaser'] },
  { name: 'Budget Management', href: '/budget-management', icon: Settings, roles: ['admin'] },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { userProfile } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    userProfile?.role && item.roles.includes(userProfile.role)
  );

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 h-full">
      <nav className="mt-8 px-4">
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
    </div>
  );
};