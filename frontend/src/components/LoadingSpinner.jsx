import { useEffect, useState } from "react";

const messages = [
  "Extracting card details via OCR...",
  "Searching Athena package catalog...",
  "Scoring and ranking candidates...",
];

export default function LoadingSpinner({ visible }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setMessageIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
      <div className="mx-4 flex max-w-sm flex-col items-center rounded-2xl bg-white px-8 py-10 shadow-2xl">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
        <p className="mt-6 text-center text-sm font-medium text-slate-700">{messages[messageIndex]}</p>
      </div>
    </div>
  );
}
