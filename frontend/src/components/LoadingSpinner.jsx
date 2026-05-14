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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-md">
      <div className="mx-4 flex w-full max-w-md flex-col items-center rounded-[2rem] border border-white/70 bg-white/92 px-8 py-10 shadow-[0_30px_100px_rgba(15,23,42,0.22)]">
        <div className="mb-6 h-1.5 w-full rounded-full bg-gradient-to-r from-sky-300 via-indigo-400 to-emerald-300" />
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
        <p className="mt-6 text-center text-sm font-medium leading-6 text-slate-700">{messages[messageIndex]}</p>
        <p className="mt-3 text-center text-xs font-medium uppercase tracking-[0.22em] text-slate-400">Premium Resolution Engine</p>
      </div>
    </div>
  );
}
