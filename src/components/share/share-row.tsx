"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Social share buttons for an entry's public result URL. */
export function ShareRow({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const shareText = `${text} ${url}`;

  const targets = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${enc(shareText)}`,
      cls: "hover:border-[#25D366]/60 hover:text-[#25D366]",
    },
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
      cls: "hover:border-paper/60",
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      cls: "hover:border-[#1877F2]/60 hover:text-[#1877F2]",
    },
    {
      name: "Telegram",
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
      cls: "hover:border-[#229ED9]/60 hover:text-[#229ED9]",
    },
  ];

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Worldie", text, url });
      } catch {
        /* cancelled */
      }
    } else {
      copy();
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {targets.map((t) => (
          <a
            key={t.name}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 whitespace-nowrap rounded-full border border-white/15 px-4 py-3 text-center text-sm font-semibold transition-colors ${t.cls}`}
          >
            {t.name}
          </a>
        ))}
      </div>
      <div className="flex gap-2">
        <Button onClick={nativeShare} className="flex-1">
          Share
        </Button>
        <Button onClick={copy} variant="secondary" className="flex-1">
          {copied ? "Copied!" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}
