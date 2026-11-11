"use client";

import { useEffect, useState } from "react";

type AssistantPanelProps = {
  onClose: () => void;
};

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export const AssistantPanel = ({
  onClose,
}: AssistantPanelProps) => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi! I’m your air-quality assistant. Ask me about this application, the current page, air quality concepts, or available air-quality data.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const sendQuestion = async () => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isLoading) {
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            question: trimmedQuestion,
            currentPage: window.location.pathname,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Unable to get a response from the assistant.",
        );
      }

      if (
        typeof data !== "object" ||
        data === null ||
        typeof data.answer !== "string"
      ) {
        throw new Error("Invalid response from the assistant.");
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.answer,
        },
      ]);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to get a response from the assistant.";

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendQuestion();
  };

  return (
    <section
      aria-label="AI assistant"
      className="fixed bottom-24 right-6 z-50 flex h-[min(650px,calc(100vh-8rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-4 text-white">
        <div>
          <h2 className="text-base font-semibold">Air Quality Assistant</h2>
          <p className="mt-1 text-xs text-slate-300">
            Ask about the app or air quality
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI assistant"
          className="rounded-md px-2 py-1 text-xl leading-none text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          ×
        </button>
      </header>

      <div
        className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4"
        aria-live="polite"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "rounded-br-md bg-slate-900 text-white"
                  : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 bg-white p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();
                void sendQuestion();
              }
            }}
            placeholder="Ask a question..."
            rows={2}
            maxLength={1000}
            disabled={isLoading}
            className="min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <p className="mt-2 px-1 text-[11px] text-slate-400">
          Enter to send · Shift+Enter for a new line
        </p>
      </form>
    </section>
  );
};