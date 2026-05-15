import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, MessageCircle } from 'lucide-react';
import { onAppEvent } from '../shared/events/appEventBus';

const MOBILE_COMMENT_COMPOSER_HEIGHT_PX = 88;
const MOBILE_FAB_GAP_PX = 12;

/**
 * Nút chat + Chat AI góc phải dưới — kích thước thống nhất mọi trang (đồng bộ với trang chủ).
 */
export function FixedChatActionButtons({ unreadMessagesCount = 0 }) {
  const [isChatAIOpen, setIsChatAIOpen] = useState(false);
  const [isChatUsersOpen, setIsChatUsersOpen] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [commentComposerActive, setCommentComposerActive] = useState(false);
  const [fabBottomPx, setFabBottomPx] = useState(16);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 900px)');
    const syncViewport = () => setIsNarrowViewport(media.matches);
    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    return onAppEvent('commentComposerActive', (event) => {
      setCommentComposerActive(Boolean(event.detail?.active));
    });
  }, []);

  useEffect(() => {
    if (!isNarrowViewport || !commentComposerActive) {
      setFabBottomPx(16);
      return undefined;
    }
    const updateBottom = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setFabBottomPx(MOBILE_COMMENT_COMPOSER_HEIGHT_PX + MOBILE_FAB_GAP_PX);
        return;
      }
      const keyboardLift = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setFabBottomPx(keyboardLift + MOBILE_COMMENT_COMPOSER_HEIGHT_PX + MOBILE_FAB_GAP_PX);
    };
    updateBottom();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', updateBottom);
    vv?.addEventListener('scroll', updateBottom);
    window.addEventListener('resize', updateBottom);
    return () => {
      vv?.removeEventListener('resize', updateBottom);
      vv?.removeEventListener('scroll', updateBottom);
      window.removeEventListener('resize', updateBottom);
    };
  }, [isNarrowViewport, commentComposerActive]);

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
        bottom: `${fabBottomPx}px`,
        right: commentComposerActive && isNarrowViewport ? undefined : '1rem',
        left: commentComposerActive && isNarrowViewport ? '1rem' : undefined,
        zIndex: 9999,
        transform: 'none',
        pointerEvents: 'none',
        transition: 'bottom 0.2s ease, left 0.2s ease, right 0.2s ease',
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
