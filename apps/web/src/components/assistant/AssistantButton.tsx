"use client";

type AssistantButtonProps = {
  isOpen: boolean;
  onClick: () => void;
};

export const AssistantButton = ({
  isOpen,
  onClick,
}: AssistantButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
      aria-expanded={isOpen}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:scale-105 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
    >
      {isOpen ? (
        <span className="text-2xl leading-none" aria-hidden="true">
          ×
        </span>
      ) : (
        <span className="text-xl font-semibold" aria-hidden="true">
          AI
        </span>
      )}
    </button>
  );
};