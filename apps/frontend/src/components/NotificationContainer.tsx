import React from 'react';
import { useNotifications } from './NotificationSystem';
import NotificationItem from './NotificationItem';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 inset-x-0 mx-auto md:inset-auto md:left-auto md:right-4 z-50 space-y-3 w-[calc(100%-2rem)] max-w-sm">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
