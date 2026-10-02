"use client";

/**
 * Browser side of Supabase Broadcast.
 *
 * The SDK is loaded from a CDN on demand rather than bundled, for the same
 * reason the widget loads socket.io that way: a deployment with no realtime
 * configured should pay nothing for it, and a blocked CDN must degrade to
 * polling rather than break the page.
 */

const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";

export interface RealtimeConfig {
  url: string;
  key: string;
  channel: string;
}

type SupabaseGlobal = {
  createClient: (
    url: string,
    key: string,
    options?: unknown
  ) => {
    channel: (name: string) => {
      on: (type: string, filter: { event: string }, cb: (msg: { payload: unknown }) => void) => unknown;
      subscribe: (cb?: (status: string) => void) => unknown;
    };
    removeChannel: (channel: unknown) => void;
  };
};

let sdkPromise: Promise<SupabaseGlobal | null> | null = null;

function loadSdk(): Promise<SupabaseGlobal | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const existing = (window as unknown as { supabase?: SupabaseGlobal }).supabase;
  if (existing) return Promise.resolve(existing);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve((window as unknown as { supabase?: SupabaseGlobal }).supabase ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/**
 * Subscribes to one channel. Returns a cleanup function that is safe to call
 * even if the SDK never loaded, so callers can use it directly in an effect.
 */
export function subscribeToChannel(
  config: RealtimeConfig,
  handlers: Record<string, (payload: unknown) => void>
): () => void {
  let disposed = false;
  let cleanup: (() => void) | null = null;

  loadSdk().then((sdk) => {
    if (!sdk || disposed) return;
    try {
      const client = sdk.createClient(config.url, config.key, {
        auth: { persistSession: false },
      });
      const channel = client.channel(config.channel);
      for (const [event, handler] of Object.entries(handlers)) {
        channel.on("broadcast", { event }, (message) => handler(message.payload));
      }
      channel.subscribe();
      cleanup = () => client.removeChannel(channel);
    } catch {
      // Realtime is an enhancement; the dashboard still refetches on its own.
    }
  });

  return () => {
    disposed = true;
    cleanup?.();
  };
}
