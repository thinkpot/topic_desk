(function () {
  var currentScript = document.currentScript;
  var apiKey = currentScript.getAttribute("data-api-key");
  if (!apiKey) {
    console.error("[topicdesk] Missing data-api-key attribute on the script tag");
    return;
  }

  var apiBase = currentScript.getAttribute("data-api-url") || currentScript.src.replace(/\/widget\.js.*$/, "");
  var POLL_INTERVAL_MS = 3000;

  var VISITOR_KEY = "td_visitor_" + apiKey.slice(-8);
  var SESSION_KEY = "td_seen_" + apiKey.slice(-8);
  var visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(VISITOR_KEY, visitorId);
  }

  var isOpen = false;
  var openedOnce = false;
  var cursor = null;
  var pollTimer = null;
  var pollInFlight = false;
  var renderedIds = Object.create(null);
  var activeButtonsEl = null; // the one currently-clickable flow button row, if any

  // Matches the "Daylight" theme in lib/widget-appearance.ts — shown until
  // /config resolves the chatbot's actual theme, and if that call fails.
  var DEFAULT_COLORS = {
    accent: "#0a0a0a",
    accentText: "#ffffff",
    surface: "#ffffff",
    messageArea: "#f7f7f5",
    agentBubbleBg: "#ffffff",
    agentBubbleBorder: "#e6e4e0",
    agentBubbleText: "#0a0a0a",
    inputBg: "#ffffff",
    inputBorder: "#d4d2cd",
    inputText: "#0a0a0a",
    mutedText: "#8a8a8a",
  };
  var DEFAULT_FONT_STACK = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

  var config = { name: "Chat with us", welcomeMessage: "Hi! How can we help you today?" };
  var colors = DEFAULT_COLORS;

  // ISO 8601 timestamps (always UTC "Z" from the server) sort correctly as
  // plain strings, so this avoids Date parsing just to pick the later one.
  function newerTimestamp(a, b) {
    if (!a) return b;
    if (!b) return a;
    return b > a ? b : a;
  }

  function api(path) {
    return apiBase + "/api/widget/" + encodeURIComponent(apiKey) + path;
  }

  function track(event) {
    try {
      fetch(api("/track"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: event }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {
      /* tracking must never break the host page */
    }
  }

  var HEARTBEAT_MS = 10000;
  var SEEN_MSG_KEY = "td_seenmsg_" + apiKey.slice(-8);
  var seenMessageId = null;
  try {
    seenMessageId = localStorage.getItem(SEEN_MSG_KEY);
  } catch (e) {
    /* private-browsing localStorage can throw */
  }

  function scrollPercent() {
    var doc = document.documentElement;
    var scrollable = (doc.scrollHeight || 0) - (doc.clientHeight || 0);
    if (scrollable <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((window.scrollY || 0) / scrollable) * 100)));
  }

  function heartbeatPayload() {
    return {
      visitorId: visitorId,
      url: location.href.slice(0, 500),
      scrollPercent: scrollPercent(),
      referrer: document.referrer ? document.referrer.slice(0, 500) : undefined,
    };
  }

  // Browsers won't play audio until the page has had some user gesture; a
  // click/keypress anywhere on the host page (not necessarily on the widget)
  // unlocks it, so a later background-tab notification can actually play.
  var audioCtx = null;
  function unlockAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      /* Web Audio unsupported: notification sound just stays silent */
    }
  }
  document.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
  document.addEventListener("keydown", unlockAudio, { once: true });

  function playNotificationSound() {
    if (!audioCtx) return;
    try {
      var now = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.12);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    } catch (e) {
      /* never let a notification chime break the host page */
    }
  }

  function tabIsHidden() {
    return document.hidden || !document.hasFocus();
  }

  // Dedupes across both delivery paths (the socket push below and the HTTP
  // heartbeat's repeating poll) so a still-unopened message doesn't re-chime
  // or re-bump the count on every subsequent tick.
  var notifiedIds = Object.create(null);
  function notifyIfNew(id) {
    if (notifiedIds[id]) return;
    notifiedIds[id] = true;
    if (!isOpen) bumpBadge();
    if (tabIsHidden()) playNotificationSound();
  }

  function handleIncomingMessage(m) {
    renderMessage(m.id, m.sender, m.text, m.buttons);
    cursor = newerTimestamp(cursor, m.createdAt);
    if (m.sender !== "VISITOR") notifyIfNew(m.id);
  }

  // Real-time transport for presence + message delivery. Loaded from the
  // socket.io CDN (widget.js itself ships with no bundler/build step) and
  // degrades to the HTTP heartbeat below if it can't load or connect — a
  // strict host-page CSP blocking the CDN script or the WS upgrade must never
  // break the widget, only make it a few seconds less real-time.
  var socket = null;
  function connectSocket() {
    if (typeof window.io !== "function") return;
    try {
      socket = window.io(apiBase, {
        path: "/socket.io",
        auth: { role: "widget", apiKey: apiKey, visitorId: visitorId },
        transports: ["websocket", "polling"],
      });
      socket.on("connect", function () {
        socket.emit("widget:heartbeat", heartbeatPayload());
      });
      socket.on("chat:message", handleIncomingMessage);
    } catch (e) {
      socket = null;
    }
  }
  function loadSocketIO(cb) {
    try {
      var s = document.createElement("script");
      s.src = "https://cdn.socket.io/4.8.1/socket.io.min.js";
      s.async = true;
      s.onload = cb;
      s.onerror = function () {};
      document.head.appendChild(s);
    } catch (e) {
      /* CDN blocked or unavailable: HTTP heartbeat below still works */
    }
  }

  // Powers the dashboard's Live tab (who's on the site right now, what page,
  // how far they've scrolled) and, piggybacked on the same round trip, lets a
  // closed widget notice a proactive dashboard message without a second poll.
  function sendHeartbeat() {
    if (socket && socket.connected) {
      socket.emit("widget:heartbeat", heartbeatPayload());
      return;
    }
    try {
      fetch(api("/presence"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(heartbeatPayload()),
        keepalive: true,
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          var latest = data && data.latestMessage;
          if (latest && latest.id !== seenMessageId) notifyIfNew(latest.id);
        })
        .catch(function () {
          /* heartbeat must never break the host page */
        });
    } catch (e) {
      /* heartbeat must never break the host page */
    }
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "style") e.style.cssText = attrs[k];
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), attrs[k]);
      else if (k === "html") e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }

  // The widget lives in a shadow root so the host page's CSS (its `p {}`,
  // `button {}`, resets, etc.) can't reach in and restyle it.
  var host = el("div", { id: "td-host" });
  var shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var root = el("div", {
    id: "td-root",
    style:
      "position:fixed;bottom:20px;right:20px;z-index:2147483000;font-family:" +
      DEFAULT_FONT_STACK +
      ";line-height:1.45;color:#0a0a0a;font-size:14px;box-sizing:border-box;",
  });
  shadow.appendChild(root);

  var CHAT_ICON =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-4.9A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>';
  var CLOSE_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var SEND_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>';

  var bubbleIcon = el("span", { style: "display:flex;", html: CHAT_ICON });
  var badge = el(
    "span",
    {
      style:
        "display:none;position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;padding:0 4px;" +
        "border-radius:9px;background:#e0402c;color:#fff;font-size:11px;font-weight:600;line-height:18px;" +
        "text-align:center;box-shadow:0 0 0 2px #fff;",
    },
    ["1"]
  );
  var bubble = el(
    "button",
    {
      "aria-label": "Open chat",
      style:
        "position:relative;display:flex;align-items:center;justify-content:center;width:56px;height:56px;" +
        "border-radius:50%;border:none;cursor:pointer;color:#fff;box-shadow:0 6px 24px rgba(10,10,10,.24);" +
        "transition:transform .15s ease;",
      onclick: toggleOpen,
    },
    [bubbleIcon, badge]
  );
  bubble.addEventListener("mouseenter", function () {
    bubble.style.transform = "scale(1.05)";
  });
  bubble.addEventListener("mouseleave", function () {
    bubble.style.transform = "scale(1)";
  });

  var panel = el("div", {
    role: "dialog",
    "aria-label": "Chat",
    style:
      "display:none;flex-direction:column;position:absolute;bottom:70px;right:0;width:360px;max-width:calc(100vw - 32px);" +
      "height:520px;max-height:calc(100vh - 120px);background:#fff;border:1px solid #e6e4e0;border-radius:14px;" +
      "overflow:hidden;box-shadow:0 12px 44px rgba(10,10,10,.18);",
  });

  var headerTitle = el("p", { style: "margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em;" });
  var headerSub = el("p", { style: "margin:2px 0 0;font-size:12px;opacity:.7;" }, ["Replies land in your chat here"]);
  var closeBtn = el("button", {
    "aria-label": "Close chat",
    html: CLOSE_ICON,
    style:
      "display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:none;border-radius:8px;" +
      "background:rgba(255,255,255,.14);color:inherit;cursor:pointer;",
    onclick: toggleOpen,
  });
  var header = el(
    "div",
    { style: "display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;color:#fff;" },
    [el("div", {}, [headerTitle, headerSub]), closeBtn]
  );

  var messagesEl = el("div", {
    style: "flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;background:#f7f7f5;",
  });

  var statusEl = el("div", {
    style: "display:none;padding:8px 16px;font-size:12px;color:#8a8a8a;text-align:center;background:#f7f7f5;",
  });

  var input = el("input", {
    type: "text",
    "aria-label": "Message",
    placeholder: "Write a message…",
    style:
      "flex:1;border:1px solid #d4d2cd;border-radius:8px;padding:10px 12px;font-size:14px;font-family:inherit;" +
      "outline:none;color:#0a0a0a;background:#fff;",
  });
  input.addEventListener("focus", function () {
    input.style.borderColor = colors.accent;
  });
  input.addEventListener("blur", function () {
    input.style.borderColor = colors.inputBorder;
  });

  var sendBtn = el("button", {
    "aria-label": "Send message",
    html: SEND_ICON,
    style:
      "display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:none;border-radius:8px;" +
      "color:#fff;cursor:pointer;flex-shrink:0;",
  });

  var inputRow = el(
    "form",
    { style: "display:flex;gap:8px;padding:12px;border-top:1px solid #e6e4e0;background:#fff;" },
    [input, sendBtn]
  );
  inputRow.addEventListener("submit", function (e) {
    e.preventDefault();
    send();
  });

  var footer = el(
    "p",
    { style: "margin:0;padding:0 12px 10px;font-size:11px;color:#8a8a8a;text-align:center;background:#fff;" },
    ["We usually reply within a few minutes"]
  );

  panel.appendChild(header);
  panel.appendChild(messagesEl);
  panel.appendChild(statusEl);
  panel.appendChild(inputRow);
  panel.appendChild(footer);
  root.appendChild(panel);
  root.appendChild(bubble);

  function mount() {
    document.body.appendChild(host);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  function applyTheme(c) {
    colors = c;
    bubble.style.background = c.accent;
    bubble.style.color = c.accentText;
    header.style.background = c.accent;
    headerTitle.style.color = c.accentText;
    headerSub.style.color = c.accentText;
    closeBtn.style.color = c.accentText;
    // A few themes pair a light accent with dark accentText (e.g. Obsidian) —
    // a white overlay would nearly vanish on that light a header.
    closeBtn.style.background = c.accentText === "#0a0a0a" ? "rgba(10,10,10,.08)" : "rgba(255,255,255,.14)";
    messagesEl.style.background = c.messageArea;
    statusEl.style.background = c.messageArea;
    statusEl.style.color = c.mutedText;
    input.style.background = c.inputBg;
    input.style.borderColor = c.inputBorder;
    input.style.color = c.inputText;
    sendBtn.style.background = c.accent;
    sendBtn.style.color = c.accentText;
    inputRow.style.background = c.surface;
    inputRow.style.borderTopColor = c.agentBubbleBorder;
    footer.style.background = c.surface;
    footer.style.color = c.mutedText;
    panel.style.borderColor = c.agentBubbleBorder;
    panel.style.background = c.surface;
  }

  function applyFont(stack, url) {
    root.style.fontFamily = stack;
    if (url) shadow.appendChild(el("link", { rel: "stylesheet", href: url }));
  }

  function setStatus(text) {
    statusEl.textContent = text || "";
    statusEl.style.display = text ? "block" : "none";
  }

  function clearActiveButtons() {
    if (activeButtonsEl) {
      activeButtonsEl.remove();
      activeButtonsEl = null;
    }
  }

  // `id` dedupes across overlapping polls and the poll vs. the sender's own
  // request racing each other — both can otherwise deliver the same row.
  // `buttons`, when present, renders a row of tappable flow choices below the
  // bubble; only ever one such row is live — any later message (bot or the
  // visitor's own reply) supersedes and removes it.
  function renderMessage(id, sender, text, buttons) {
    if (id && renderedIds[id]) return;
    if (id) renderedIds[id] = true;
    if (id) {
      seenMessageId = id;
      try {
        localStorage.setItem(SEEN_MSG_KEY, id);
      } catch (e) {
        /* private-browsing localStorage can throw */
      }
    }

    var mine = sender === "VISITOR";
    clearActiveButtons();

    var bubbleEl = el(
      "div",
      {
        style:
          "max-width:82%;padding:9px 12px;font-size:14px;white-space:pre-wrap;word-break:break-word;border-radius:12px;" +
          (mine
            ? "align-self:flex-end;border-bottom-right-radius:4px;color:" + colors.accentText + ";background:" + colors.accent + ";"
            : "align-self:flex-start;border-bottom-left-radius:4px;color:" +
              colors.agentBubbleText +
              ";background:" +
              colors.agentBubbleBg +
              ";border:1px solid " +
              colors.agentBubbleBorder +
              ";"),
      },
      [text]
    );
    messagesEl.appendChild(bubbleEl);

    if (buttons && buttons.length && !mine) {
      var row = el("div", {
        style: "display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;max-width:82%;",
      });
      buttons.forEach(function (opt) {
        row.appendChild(
          el(
            "button",
            {
              type: "button",
              style:
                "padding:7px 13px;border-radius:999px;border:1px solid " +
                colors.accent +
                ";background:transparent;color:" +
                colors.accent +
                ";font-size:13px;font-family:inherit;cursor:pointer;",
              onclick: function () {
                sendChoice(opt);
              },
            },
            [opt.label]
          )
        );
      });
      messagesEl.appendChild(row);
      activeButtonsEl = row;
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function toggleOpen() {
    isOpen = !isOpen;
    panel.style.display = isOpen ? "flex" : "none";
    bubbleIcon.innerHTML = isOpen ? CLOSE_ICON : CHAT_ICON;
    bubble.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");

    if (isOpen) {
      if (!openedOnce) {
        openedOnce = true;
        track("open");
      }
      if (cursor === null) loadHistory();
      startPolling();
      input.focus();
      clearBadge();
    } else {
      stopPolling();
    }
  }

  var unreadCount = 0;
  function bumpBadge() {
    unreadCount++;
    badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
    badge.style.display = "block";
  }

  function clearBadge() {
    unreadCount = 0;
    badge.style.display = "none";
  }

  function loadHistory() {
    setStatus("Loading…");
    fetch(api("/messages?visitorId=" + encodeURIComponent(visitorId)))
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        setStatus("");
        if (data.messages && data.messages.length) {
          data.messages.forEach(function (m) {
            renderMessage(m.id, m.sender, m.text, m.buttons);
            cursor = newerTimestamp(cursor, m.createdAt);
          });
        } else {
          renderMessage("welcome", "AGENT", data.welcomeMessage || config.welcomeMessage);
          cursor = new Date(0).toISOString();
        }
      })
      .catch(function () {
        setStatus("Couldn't load the conversation. Retrying…");
      });
  }

  function pollForReplies() {
    if (!cursor || pollInFlight) return;
    pollInFlight = true;
    fetch(api("/messages?visitorId=" + encodeURIComponent(visitorId) + "&after=" + encodeURIComponent(cursor)))
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.messages && data.messages.length) {
          data.messages.forEach(function (m) {
            renderMessage(m.id, m.sender, m.text, m.buttons);
            cursor = newerTimestamp(cursor, m.createdAt);
          });
        }
      })
      .catch(function () {
        /* retry on the next tick */
      })
      .finally(function () {
        pollInFlight = false;
      });
  }

  function startPolling() {
    if (!pollTimer) pollTimer = setInterval(pollForReplies, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // Shared by typed messages and button taps. Rendering happens only once the
  // server confirms and hands back real ids — an optimistic render here would
  // race the next poll tick and could show the same message twice (nothing to
  // dedupe against until this resolves). The response includes the visitor's
  // own saved message plus anything the flow says next, all in one round trip.
  function sendPayload(extra) {
    sendBtn.disabled = true;
    var payload = { visitorId: visitorId };
    for (var k in extra) payload[k] = extra[k];

    return fetch(api("/messages"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        if (!r.ok) {
          return r.json().then(function (e) {
            throw new Error(e.error || "Message failed to send");
          });
        }
        return r.json();
      })
      .then(function (data) {
        (data.messages || []).forEach(function (m) {
          renderMessage(m.id, m.sender, m.text, m.buttons);
          cursor = newerTimestamp(cursor, m.createdAt);
        });
        setStatus("");
      })
      .catch(function (err) {
        setStatus(err.message || "Message failed to send. Please try again.");
      })
      .finally(function () {
        sendBtn.disabled = false;
      });
  }

  function send() {
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendPayload({ text: text, pageUrl: location.href.slice(0, 500) });
  }

  function sendChoice(option) {
    clearActiveButtons();
    sendPayload({ text: option.label, choiceId: option.id });
  }

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  fetch(api("/config"))
    .then(function (r) {
      if (!r.ok) throw new Error("unavailable");
      return r.json();
    })
    .then(function (cfg) {
      config = cfg;
      headerTitle.textContent = cfg.name;
      applyTheme(cfg.colors || DEFAULT_COLORS);
      applyFont(cfg.fontStack || DEFAULT_FONT_STACK, cfg.fontUrl);

      try {
        if (!sessionStorage.getItem(SESSION_KEY)) {
          sessionStorage.setItem(SESSION_KEY, "1");
          track("view");
        }
      } catch (e) {
        track("view");
      }

      loadSocketIO(connectSocket);
      sendHeartbeat();
      setInterval(sendHeartbeat, HEARTBEAT_MS);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") sendHeartbeat();
      });
      var scrollTimer = null;
      window.addEventListener(
        "scroll",
        function () {
          if (scrollTimer) return;
          scrollTimer = setTimeout(function () {
            scrollTimer = null;
            sendHeartbeat();
          }, 4000);
        },
        { passive: true }
      );
    })
    .catch(function () {
      // Inactive chatbot, unpaid account, or a domain that isn't allowed: stay hidden.
      host.remove();
    });
})();
