import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { formatRelativeTime } from '../../utils/formatters';

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
        className="relative p-1.5 rounded-lg text-crew-text-secondary hover:text-crew-text-primary hover:bg-crew-bg focus:outline-none focus:ring-2 focus:ring-crew-action/20 transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-crew-danger text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-crew-surface rounded-xl border border-crew-border shadow-elevated z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-crew-border/60 bg-crew-surface">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-crew-text-primary font-heading">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-crew-action/10 text-crew-action">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-medium text-crew-action hover:underline flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-crew-border/40">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-crew-text-secondary">
                <Bell className="w-6 h-6 mx-auto mb-2 text-crew-text-tertiary/50" />
                No notifications right now
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markAsRead(n.id)}
                  className={`w-full text-left px-3.5 py-2.5 text-xs flex items-start gap-2.5 transition-colors ${
                    n.read
                      ? 'bg-crew-surface hover:bg-crew-bg/60 opacity-80'
                      : 'bg-crew-action/5 hover:bg-crew-action/10'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                      n.read ? 'bg-crew-border' : 'bg-crew-action'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-crew-text-primary text-[12px] truncate">{n.title}</div>
                    <div className="text-crew-text-secondary text-[11px] mt-0.5 leading-relaxed break-words">{n.description}</div>
                    <div className="text-crew-text-tertiary text-[10px] mt-1 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatRelativeTime(n.timestamp)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
