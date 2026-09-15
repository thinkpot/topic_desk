"use client";

import { useState } from "react";

export default function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
        <code>{code}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute right-2 top-2 rounded-md bg-gray-700 px-2 py-1 text-xs font-medium text-white hover:bg-gray-600"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
