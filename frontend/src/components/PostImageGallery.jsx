import React from 'react';

const GAP = 'gap-0.5';

/**
 * Bố cục gallery kiểu Facebook: không còn ô trống khi có 3 ảnh; nhiều ảnh dùng object-cover đồng đều.
 *
 * @param {string[]} images
 * @param {(raw: string) => string} resolveUrl
 * @param {(raw: string) => boolean} isVideo
 * @param {(url: string) => string} videoPreviewSrc
 * @param {(index: number) => void} onCellClick
 * @param {'preview' | 'controls'} galleryVideoMode — preview: muted; controls: video có điều khiển (feed trang chủ)
 * @param {boolean} skipTheaterForVideo — true: không gọi onCellClick khi ô là video (để xem inline)
 */
export default function PostImageGallery({
  images,
  resolveUrl,
  isVideo,
  videoPreviewSrc,
  onCellClick,
  galleryVideoMode = 'preview',
  skipTheaterForVideo = false,
  cellBgClass = 'bg-[var(--fb-input)]',
}) {
  const list = Array.isArray(images) ? images.filter((x) => typeof x === 'string' && x) : [];
  const n = list.length;
  if (n === 0) return null;

  const interactive = typeof onCellClick === 'function';

  const handleCellPointer = (index) => {
    if (!interactive) return;
    if (skipTheaterForVideo && isVideo(list[index])) return;
    onCellClick(index);
  };

  /** Trong lưới (cover): luôn preview — không dùng controls (controls làm ô bị kéo cao như video dọc). */
  const renderMedia = (item, index, { cover }) => {
    const url = resolveUrl(item);
    const vid = isVideo(item);
    const useControlsInCell = vid && !cover && galleryVideoMode === 'controls';

    if (vid) {
      if (useControlsInCell) {
        return (
          <video
            src={videoPreviewSrc(url)}
            controls
            playsInline
            preload="metadata"
            data-scroll-autoplay="true"
            className="h-auto w-full max-h-[min(72vh,620px)] bg-black object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        );
      }
      return (
        <>
          <video
            src={videoPreviewSrc(url)}
            muted
            playsInline
            preload="metadata"
            data-scroll-autoplay="true"
            className={
              cover
                ? 'pointer-events-none absolute inset-0 h-full w-full object-cover'
                : 'pointer-events-none h-auto w-full max-h-[min(70vh,620px)] object-contain'
            }
          />
          {cover ? (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 shadow-lg ring-2 ring-white/90">
                <svg className="ml-1 h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              </div>
            </div>
          ) : null}
        </>
      );
    }
    return (
      <img
        src={url}
        alt=""
        className={
          cover
            ? 'absolute inset-0 h-full w-full object-cover'
            : 'h-auto w-full max-h-[min(92vh,1200px)] object-contain'
        }
      />
    );
  };

  const cellShell = (index, cover, extraClass = '') => (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      key={index}
      className={`relative flex items-center justify-center overflow-hidden ${cellBgClass} ${extraClass} ${
        interactive ? 'cursor-pointer transition-opacity hover:opacity-90' : ''
      }`}
      onClick={interactive ? () => handleCellPointer(index) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCellPointer(index);
              }
            }
          : undefined
      }
    >
      {renderMedia(list[index], index, { cover })}
    </div>
  );

  /** Một ảnh: giữ object-contain như trước */
  if (n === 1) {
    return <div className="w-full">{cellShell(0, false, 'max-h-[min(72vh,560px)]')}</div>;
  }

  /** Hai ảnh: hai ô vuông cạnh nhau — aspect cố định, không bị video dọc kéo dài */
  if (n === 2) {
    return (
      <div
        className={`grid w-full grid-cols-2 overflow-hidden ${GAP} aspect-[2/1] max-h-[min(70vh,560px)]`}
      >
        {cellShell(0, true, 'min-h-0 h-full')}
        {cellShell(1, true, 'min-h-0 h-full')}
      </div>
    );
  }

  /** Ba ảnh: trái full chiều cao, phải hai ô chồng (không còn ô trống) */
  if (n === 3) {
    return (
      <div
        className={`grid max-h-[min(70vh,560px)] w-full grid-cols-2 grid-rows-2 overflow-hidden ${GAP} aspect-square`}
      >
        {cellShell(0, true, 'row-span-2 min-h-0 h-full')}
        {cellShell(1, true, 'min-h-0 h-full')}
        {cellShell(2, true, 'min-h-0 h-full')}
      </div>
    );
  }

  /** Năm ảnh: 2 ô trên + 3 ô dưới (hiển thị đủ 5 ảnh giống feed phổ biến). */
  if (n === 5) {
    return (
      <div
        className={`grid max-h-[min(70vh,620px)] w-full grid-cols-6 grid-rows-2 overflow-hidden ${GAP} aspect-[3/2]`}
      >
        {cellShell(0, true, 'col-span-3 min-h-0 h-full')}
        {cellShell(1, true, 'col-span-3 min-h-0 h-full')}
        {cellShell(2, true, 'col-span-2 min-h-0 h-full')}
        {cellShell(3, true, 'col-span-2 min-h-0 h-full')}
        {cellShell(4, true, 'col-span-2 min-h-0 h-full')}
      </div>
    );
  }

  /** Sáu ảnh trở lên: giữ lưới 2×2, ô cuối hiển thị +N. */
  const extra = n - 4;
  return (
    <div
      className={`grid max-h-[min(70vh,560px)] w-full grid-cols-2 grid-rows-2 overflow-hidden ${GAP} aspect-square`}
    >
      {cellShell(0, true, 'min-h-0 h-full')}
      {cellShell(1, true, 'min-h-0 h-full')}
      {cellShell(2, true, 'min-h-0 h-full')}
      {extra > 0 ? (
        <div
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          key="more"
          className={`relative flex min-h-0 h-full items-center justify-center overflow-hidden ${cellBgClass} ${
            interactive ? 'cursor-pointer transition-opacity hover:opacity-90' : ''
          }`}
          onClick={interactive ? () => onCellClick(4) : undefined}
          onKeyDown={
            interactive
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCellClick(4);
                  }
                }
              : undefined
          }
        >
          {renderMedia(list[3], 3, { cover: true })}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/60 ${interactive ? 'transition-colors hover:bg-black/70' : ''}`}
            role="presentation"
          >
            <span className="text-xl font-bold text-white">+{extra}</span>
          </div>
        </div>
      ) : (
        cellShell(3, true, 'min-h-0')
      )}
    </div>
  );
}
