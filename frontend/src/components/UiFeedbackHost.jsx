import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUiFeedbackStore } from '../store/uiFeedbackStore';

const toastStyles = {
  success: 'bg-emerald-900/95 text-emerald-50 border-emerald-700/80',
  error: 'bg-red-900/95 text-red-50 border-red-700/80',
  warning: 'bg-amber-900/95 text-amber-50 border-amber-700/80',
  info: 'bg-[var(--fb-surface)] text-[var(--fb-text-primary)] border-[var(--fb-divider)] shadow-lg',
};

function ConfirmModal({ confirm }) {
  if (!confirm) return null;
  return (
    <div
      className="fixed inset-0 z-[100020] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) confirm.onResult(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-5 text-[var(--fb-text-primary)] shadow-2xl"
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{confirm.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--fb-divider)] px-4 py-2 text-sm font-medium hover:bg-[var(--fb-hover)]"
            onClick={() => confirm.onResult(false)}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => confirm.onResult(true)}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptModal({ promptState }) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (promptState) setValue(promptState.defaultValue ?? '');
  }, [promptState]);

  if (!promptState) return null;

  const submit = () => {
    promptState.onResult(value.trim() === '' ? '' : value);
  };

  return (
    <div
      className="fixed inset-0 z-[100020] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) promptState.onResult(null);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-5 text-[var(--fb-text-primary)] shadow-2xl"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
      >
        <p className="text-sm font-medium leading-relaxed">{promptState.message}</p>
        <input
          type="text"
          className="mt-3 w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-2 text-sm text-[var(--fb-text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--fb-divider)] px-4 py-2 text-sm font-medium hover:bg-[var(--fb-hover)]"
            onClick={() => promptState.onResult(null)}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={submit}
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UiFeedbackHost() {
  const toasts = useUiFeedbackStore((s) => s.toasts);
  const removeToast = useUiFeedbackStore((s) => s.removeToast);
  const confirm = useUiFeedbackStore((s) => s.confirm);
  const promptState = useUiFeedbackStore((s) => s.prompt);

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const toastLayer =
    portalTarget && toasts.length > 0 ? (
      createPortal(
        <div
          className="pointer-events-none fixed bottom-4 left-1/2 z-[100010] flex w-[min(100%,420px)] -translate-x-1/2 flex-col gap-2 px-3 sm:bottom-6"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-sm ${toastStyles[t.type] || toastStyles.info}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="flex-1 leading-snug break-words">{t.message}</p>
                <button
                  type="button"
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-xs opacity-70 hover:opacity-100"
                  onClick={() => removeToast(t.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>,
        portalTarget
      )
    ) : null;

  const modalLayer =
    portalTarget &&
    createPortal(
      <>
        <ConfirmModal confirm={confirm} />
        <PromptModal promptState={promptState} />
      </>,
      portalTarget
    );

  return (
    <>
      {toastLayer}
      {modalLayer}
    </>
  );
}
