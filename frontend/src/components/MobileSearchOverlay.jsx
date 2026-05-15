import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, History, X, ChevronLeft } from 'lucide-react';
import { resolveMediaUrl } from '../utils/mediaUrl';

/**
 * Màn tìm kiếm full-screen trên mobile (sau khi bấm icon kính lúp) — kiểu Facebook.
 */
export default function MobileSearchOverlay({
  open,
  onClose,
  searchQuery,
  onSearchChange,
  searchInputRef,
  searchLoading,
  searchHistory,
  searchResults,
  onClearHistory,
  onRemoveHistoryItem,
  onApplyHistoryQuery,
  onResultClick,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = window.setTimeout(() => searchInputRef?.current?.focus(), 0);
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(id);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, searchInputRef]);

  if (!open || typeof document === 'undefined') return null;

  const q = searchQuery.trim();

  const body = (() => {
    if (searchLoading) {
      return (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-3 text-sm text-[var(--fb-text-secondary)]">Đang tìm kiếm...</p>
        </div>
      );
    }

    if (q.length < 2) {
      if (searchHistory.length === 0) {
        return (
          <div className="px-4 py-8 text-center text-[var(--fb-text-secondary)]">
            <Search className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p className="text-[15px] font-medium text-[var(--fb-text-primary)]">Tìm kiếm trên DNU</p>
            <p className="mt-1 text-sm">Gõ ít nhất 2 ký tự để tìm người dùng, nhóm hoặc bài viết.</p>
          </div>
        );
      }

      return (
        <div className="px-2 pb-6">
          <div className="flex items-center justify-between px-2 py-2">
            <h2 className="text-[17px] font-bold text-[var(--fb-text-primary)]">Mới đây</h2>
            <button
              type="button"
              onClick={onClearHistory}
              className="text-[15px] font-semibold text-[#1877F2] hover:underline"
            >
              Xóa tất cả
            </button>
          </div>
          <ul>
            {searchHistory.map((term) => (
              <li key={term}>
                <div className="flex items-center gap-2 rounded-lg px-1 active:bg-[var(--fb-hover)]">
                  <button
                    type="button"
                    onClick={() => onApplyHistoryQuery(term)}
                    className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-1 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--fb-input)]">
                      <History className="h-5 w-5 text-[var(--fb-icon)]" />
                    </span>
                    <span className="truncate text-[15px] font-medium text-[var(--fb-text-primary)]">{term}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onRemoveHistoryItem(term, e)}
                    className="shrink-0 px-2 py-2.5 text-[15px] font-semibold text-[#1877F2] hover:underline"
                    aria-label={`Xóa ${term}`}
                  >
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="px-4 py-16 text-center text-[var(--fb-text-secondary)]">
          <Search className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <p className="text-[15px] font-medium text-[var(--fb-text-primary)]">Không tìm thấy kết quả</p>
          <p className="mt-1 text-sm">Thử tìm kiếm với từ khóa khác</p>
        </div>
      );
    }

    const users = searchResults.filter((r) => r.type === 'user');
    const others = searchResults.filter((r) => r.type !== 'user');

    return (
      <div className="pb-6">
        {users.length > 0 && (
          <section>
            <h2 className="px-4 py-2 text-[17px] font-bold text-[var(--fb-text-primary)]">Người dùng</h2>
            <div className="flex flex-col">
              {users.map((result, index) => (
                <div
                  key={`msearch-user-${result._id || result.id || index}`}
                  onClick={(e) => onResultClick(result, e)}
                  className="cursor-pointer px-3 py-2.5 active:bg-[var(--fb-hover)]"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        result.avatar
                          ? resolveMediaUrl(result.avatar)
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(result.name)}&background=1877f2&color=fff`
                      }
                      alt={result.name}
                      className="h-10 w-10 shrink-0 rounded-full border border-[var(--fb-divider)] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-[var(--fb-text-primary)]">{result.name}</p>
                      <p className="truncate text-[13px] text-[var(--fb-text-secondary)]">
                        {result.studentRole} • {result.major}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {others.length > 0 && (
          <section className={users.length > 0 ? 'mt-2 border-t border-[var(--fb-divider)]' : ''}>
            <h2 className="px-4 py-2 text-[17px] font-bold text-[var(--fb-text-primary)]">Khác</h2>
            <div className="divide-y divide-[var(--fb-divider)]">
              {others.map((result, index) => (
                <div
                  key={`msearch-other-${index}`}
                  onClick={(e) => onResultClick(result, e)}
                  className="cursor-pointer px-3 py-3 active:bg-[var(--fb-hover)]"
                >
                  <p className="truncate text-[15px] font-medium text-[var(--fb-text-primary)]">
                    {result.type === 'group' ? result.name : `${result.content?.substring(0, 80)}...`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  })();

  return createPortal(
    <div
      className="mobile-search-overlay fixed inset-0 z-[200] flex flex-col bg-[var(--fb-surface)] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--fb-divider)] px-2 py-2">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
          aria-label="Quay lại"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fb-icon)] opacity-65"
          />
          <input
            ref={searchInputRef}
            type="search"
            enterKeyHint="search"
            placeholder="Tìm kiếm trên DNU"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 w-full rounded-full border-0 bg-[var(--fb-input)] pl-10 pr-10 text-[16px] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] placeholder:opacity-80 focus:bg-[var(--fb-input-focus)] focus:outline-none focus:ring-0"
            aria-label="Tìm kiếm"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--fb-icon)] hover:bg-[var(--fb-hover)]"
              aria-label="Xóa từ khóa"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{body}</div>
    </div>,
    document.body
  );
}
