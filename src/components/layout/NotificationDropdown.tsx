import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCircle, Clock, ShoppingCart, AlertTriangle, AlertCircle, XCircle, Upload, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotificationsForUser, getNotificationCount, Notification } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const NotificationDropdown: React.FC = () => {
  const { userProfile, getAllRoles } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userRoles = getAllRoles();
    if (userRoles.length > 0) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [userProfile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    const userRoles = getAllRoles();
    if (userRoles.length === 0) return;
    
    setLoading(true);
    try {
      const userNotifications = await getNotificationsForUser(userRoles);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    const userRoles = getAllRoles();
    if (userRoles.length === 0) return;
    
    try {
      const count = await getNotificationCount(userRoles);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    setIsOpen(false);
  };

  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      CheckCircle,
      Clock,
      ShoppingCart,
      AlertTriangle,
      AlertCircle,
      XCircle,
      Upload,
      Receipt,
    };
    
    const IconComponent = iconMap[iconName] || Bell;
    return <IconComponent className="h-4 w-4" />;
  };

  const getTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[9999] max-h-80 sm:max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700">
            <h3 className="text-base sm:text-lg font-semibold text-gray-100">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-64 sm:max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Bell className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No notifications</p>
                <p className="text-gray-500 text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 sm:p-4 hover:bg-gray-700/50 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-gray-700/30' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-1 rounded-full ${getPriorityColor(notification.priority)} flex-shrink-0`}>
                        {getIcon(notification.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-100 truncate">
                            {notification.title}
                          </p>
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                            {getTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center mt-2 space-x-2">
                          <Badge
                            variant={
                              notification.priority === 'high' 
                                ? 'danger' 
                                : notification.priority === 'medium' 
                                  ? 'warning' 
                                  : 'info'
                            }
                            size="sm"
                          >
                            {notification.priority}
                          </Badge>
                          {notification.type === 'budget_alert' && (
                            <Badge variant="warning" size="sm">Budget</Badge>
                          )}
                          {notification.type === 'po_status' && (
                            <Badge variant="info" size="sm">PO</Badge>
                          )}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-700 bg-gray-750">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  fetchNotifications();
                  fetchUnreadCount();
                }}
                className="w-full text-gray-300 hover:text-gray-100"
              >
                Refresh Notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};