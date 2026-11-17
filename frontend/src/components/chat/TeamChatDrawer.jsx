import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatService, formatApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import { Send, X, MessageSquare, AlertCircle } from 'lucide-react';

export default function TeamChatDrawer({ isOpen, onClose, teamId, teamName }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const lastTimestampRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Reset timestamp ref when switching teams or closing
  useEffect(() => {
    lastTimestampRef.current = null;
    setMessages([]);
  }, [teamId, isOpen]);

  // Initial load and periodic incremental delta polling every 4 seconds
  const fetchMessages = useCallback(async () => {
    if (!teamId) return;
    try {
      const since = lastTimestampRef.current;
      const data = await chatService.listMessages(teamId, since);

      if (!since) {
        // Initial full load
        setMessages(data || []);
        if (data && data.length > 0) {
          lastTimestampRef.current = data[data.length - 1].created_at;
        }
      } else if (data && data.length > 0) {
        // Incremental append of new delta messages
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newUnique = data.filter((m) => !existingIds.has(m.id));
          return newUnique.length > 0 ? [...prev, ...newUnique] : prev;
        });
        lastTimestampRef.current = data[data.length - 1].created_at;
      }
    } catch {
      // Quiet fail on polling to avoid disrupting user
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (!isOpen || !teamId) return;
    setLoading(true);
    fetchMessages();

    // 4-second incremental polling interval paused when closed or unmounted
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [isOpen, teamId, fetchMessages]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setSending(true);
    setError(null);

    try {
      const created = await chatService.sendMessage(teamId, content);
      setMessages((prev) => [...prev, created]);
      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      setError(formatApiError(err, 'Failed to send message.'));
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-crew-surface border-l border-crew-border shadow-modal z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-crew-border flex items-center justify-between bg-crew-surface">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-xl bg-crew-bg border border-crew-border flex items-center justify-center text-crew-text-primary flex-shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h3 className="font-heading text-sm font-bold text-crew-text-primary truncate">
              {teamName || 'Team Chat'}
            </h3>
            <span className="text-[10px] text-crew-text-tertiary">Live Room (4s delta polling)</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-crew-text-tertiary hover:text-crew-text-primary p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {loading && messages.length === 0 ? (
          <div className="text-center py-8 text-xs text-crew-text-tertiary italic">
            Connecting to group discussion...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-xs text-crew-text-tertiary italic">
            No messages yet. Start the team conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-crew-text-secondary">
                    {isMe ? 'You' : msg.user_name || 'Teammate'}
                  </span>
                  <span className="text-[10px] text-crew-text-tertiary">
                    {msg.created_at ? formatDate(msg.created_at) : ''}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-[#181B20] text-white dark:bg-white dark:text-gray-900 rounded-br-xs shadow-sm font-normal'
                      : 'bg-crew-bg border border-crew-border text-crew-text-primary rounded-bl-xs'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Footer */}
      <form onSubmit={handleSend} className="p-3.5 border-t border-crew-border bg-crew-surface">
        {error && (
          <div className="mb-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-medium flex items-center gap-1.5 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a team message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            className="flex-1 text-xs rounded-xl border border-crew-border bg-crew-bg px-3.5 py-2 text-crew-text-primary focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-2 rounded-xl bg-[#181B20] text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors disabled:opacity-40 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
