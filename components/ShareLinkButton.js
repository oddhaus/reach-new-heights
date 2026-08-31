"use client";

import { useState } from "react";

export default function ShareLinkButton({ eventId, eventSlug, title }) {
  const [copied, setCopied] = useState(false);

  function getUrl() {
    return `${window.location.origin}/events/${eventSlug || eventId}`;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(getUrl());
    }
  }

  function handleWhatsAppShare() {
    const text = `${title} — book your spot: ${getUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        type="button"
        className="btn btn-copy"
        onClick={handleCopy}
        title={copied ? "Link copied" : "Copy booking link"}
        aria-label={copied ? "Link copied" : "Copy booking link"}
        style={{
          width: 42,
          height: 42,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {copied ? "✓" : (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        )}
      </button>

      <button
        type="button"
        className="btn"
        onClick={handleWhatsAppShare}
        title="Share on WhatsApp"
        aria-label="Share on WhatsApp"
        style={{
          width: 42,
          height: 42,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#25D366",
          borderColor: "#25D366",
          color: "#fff",
          boxShadow: "0 8px 18px rgba(37, 211, 102, 0.25)",
        }}
      >
        <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
          <path d="M16.2 4.1c-6.7 0-12.1 5.1-12.1 11.4 0 2.1.6 4.2 1.7 6l-1.8 6.2 6.4-1.8c1.8 1 3.8 1.6 6 1.6 6.7 0 12.1-5.1 12.1-11.4s-5.4-11.4-12.1-11.4zm6.9 15.8c-.3.8-1.8 1.6-2.6 1.7-.7.1-1.6.1-2.6-.1-1.1-.2-2.4-.8-4.1-1.9-1.5-1.2-2.7-2.9-3.1-3.4-.4-.5-1.6-2.1-1.6-3.9 0-1.8 1-2.8 1.5-3.3.4-.4.8-.5 1.1-.5h.8c.3 0 .7.1.9.6l1.2 2.8c.1.3.2.6.1.9-.2.4-.4.8-.7 1.1-.2.2-.4.5-.6.7-.2.3-.4.5-.2 1 .2.5 1 1.7 2.2 2.8 1.5 1.4 2.8 1.9 3.3 2.1.5.2.8.2 1-.1.3-.3.7-.9.9-1.3.2-.4.6-.4.9-.2l2-.9c.3-.2.7-.1.9.1l1.6 1.1c.2.2.3.5.2.8-.4.3-2 1.1-2.8 1.4z"/>
        </svg>
      </button>
    </div>
  );
}
