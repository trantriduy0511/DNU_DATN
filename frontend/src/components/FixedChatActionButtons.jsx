import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, MessageCircle } from 'lucide-react';

/**
 * Nút chat + Chat AI góc phải dưới — kích thước thống nhất mọi trang (đồng bộ với trang chủ).
 */
export function FixedChatActionButtons({ unreadMessagesCount = 0 }) {
  const [isChatAIOpen, setIsChatAIOpen] = useState(false);
  const [isChatUsersOpen, setIsChatUsersOpen] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 900px)');
    const syncViewport = () => setIsNarrowViewport(media.matches);
    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    const handleAIViz = (event) => {
      setIsChatAIOpen(Boolean(event.detail?.isOpen));
    };
    const handleUsersViz = (event) => {
      setIsChatUsersOpen(Boolean(event.detail?.isOpen));
    };

    window.addEventListener('chatAIVisibilityChange', handleAIViz);
    window.addEventListener('chatUsersVisibilityChange', handleUsersViz);
    return () => {
      window.removeEventListener('chatAIVisibilityChange', handleAIViz);
      window.removeEventListener('chatUsersVisibilityChange', handleUsersViz);
    };
  }, []);

  if (typeof document === 'undefined') return null;
  if (isNarrowViewport && (isChatAIOpen || isChatUsersOpen)) return null;

  return createPortal(
    <div
      className="fixed-action-buttons flex flex-col gap-3"
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 9999,
        transform: 'none',
        pointerEvents: 'none',
      }}
    >
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('openChatAI'))}
        className="w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group relative pointer-events-auto"
        aria-label="Chat với AI"
      >
        <Bot className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        <div className="hidden sm:block absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Chat với AI
          <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900" />
        </div>
      </button>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('openChatWindow'))}
        className="w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group relative pointer-events-auto"
        aria-label={`Tin nhắn${unreadMessagesCount > 0 ? ` (${unreadMessagesCount} chưa đọc)` : ''}`}
      >
        <MessageCircle className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" />
        {unreadMessagesCount > 0 ? (
          <span className="absolute -top-1 -right-1 w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
          </span>
        ) : null}
        <div className="hidden sm:block absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Tin nhắn {unreadMessagesCount > 0 ? `(${unreadMessagesCount} chưa đọc)` : ''}
          <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900" />
        </div>
      </button>
    </div>,
    document.body
  );
}
