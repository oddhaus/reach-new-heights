"use client";

import { useState } from "react";

export default function ShareLinkButton({ eventId, title }) {
  const [copied, setCopied] = useState(false);

  function getUrl() {
    return `${window.location.origin}/events/${eventId}`;
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
    <>
      <button className="btn btn-ghost" onClick={handleCopy}>
        {copied ? "Link copied!" : "Copy booking link"}
      </button>
      <button className="btn btn-amber" onClick={handleWhatsAppShare}>
        Share on WhatsApp
      </button>
    </>
  );
}
