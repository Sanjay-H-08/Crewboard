import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-1 rounded-full hover:bg-crew-bg focus:outline-none focus:ring-2 focus:ring-crew-action/20"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5 text-crew-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-crew-danger text-xs text-crew-surface">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-crew-surface rounded-md border border-crew-border shadow-card z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-3 py-2 border-b border-crew-border/60">
            <span className="font-medium text-crew-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-crew-action hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-crew-text-secondary">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markAsRead(n.id)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2 ${n.read ? 'bg-crew-bg' : 'bg-crew-sand/10'} transition-colors`}
                >
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1 ${n.read ? 'bg-crew-border' : 'bg-crew-action'}`} />
                  <div className="flex-1">
                    <div className="font-medium text-crew-text-primary">{n.title}</div>
                    <div className="text-crew-text-secondary">{n.description}</div>
                    <div className="text-crew-text-tertiary mt-0.5">
                      {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-crew-border/60 px-3 py-2 text-center">
            <a href="#" className="text-xs text-crew-action hover:underline">
              View all
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
