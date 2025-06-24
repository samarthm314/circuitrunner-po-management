import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCircle, Clock, ShoppingCart, AlertTriangle, AlertCircle, XCircle, Upload, Receipt, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  getNotificationsForUser, 
  getNotificationCount, 
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Notification 
} from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const NotificationDropdown: React.FC = () => {
  const { userProfile, getAllRoles, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userRoles = getAllRoles();
    if (userRoles.length > 0 && userRoles[0] !== 'guest') {
      fetchNotifications();
      fetchUnreadCount();
      
      // Set up periodic refresh every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
        fetchUnreadCount();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [userProfile, currentUser]);

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
    if (userRoles.length === 0 || userRoles[0] === 'guest' || !currentUser) return;
    
    setLoading(true);
    try {
      const userNotifications = await getNotificationsForUser(userRoles, currentUser.uid);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    const userRoles = getAllRoles();
    if (userRoles.length === 0 || userRoles[0] === 'guest' || !currentUser) return;
    
    try {
      const count = await getNotificationCount(userRoles, currentUser.uid);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!currentUser) return;
    
    // Mark as read if not already read
    if (!notification.isRead) {
      setMarkingAsRead(notification.id);
      try {
        await markNotificationAsRead(currentUser.uid, notification.id);
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      } finally {
        setMarkingAsRead(null);
      }
    }
    
    // Navigate to action URL if provided
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;
    
    setMarkingAllAsRead(true);
    try {
      const unreadIds = unreadNotifications.map(n => n.id);
      await markAllNotificationsAsRead(currentUser.uid, unreadIds);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAllAsRead(false);
    }
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

  const unreadNotifications = notifications.filter(n => !n.isRead);

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
            <h3 className="text-base sm:text-lg font-semibold text-gray-100">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-sm text-red-400">({unreadCount} unread)</span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              {unreadNotifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  loading={markingAllAsRead}
                  disabled={markingAllAsRead}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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
                    className={`p-3 sm:p-4 hover:bg-gray-700/50 cursor-pointer transition-colors relative ${
                      !notification.isRead ? 'bg-gray-700/30' : ''
                    } ${markingAsRead === notification.id ? 'opacity-50' : ''}`}
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
                          {notification.type === 'transaction' && (
                            <Badge variant="success" size="sm">Transaction</Badge>
                          )}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      )}
                      {markingAsRead === notification.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                        </div>
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
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh Notifications'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};