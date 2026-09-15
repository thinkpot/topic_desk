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
  var config = { name: "Chat with us", welcomeMessage: "Hi! How can we help you today?", widgetColor: "#0a0a0a" };

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

  var FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

  // The widget lives in a shadow root so the host page's CSS (its `p {}`,
  // `button {}`, resets, etc.) can't reach in and restyle it.
  var host = el("div", { id: "td-host" });
  var shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var root = el("div", {
    id: "td-root",
    style:
      "position:fixed;bottom:20px;right:20px;z-index:2147483000;font-family:" +
      FONT +
      ";line-height:1.45;color:#0a0a0a;font-size:14px;box-sizing:border-box;",
  });
  shadow.appendChild(root);

  var CHAT_ICON =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-4.9A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>';
  var CLOSE_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var SEND_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>';

  var bubble = el("button", {
    "aria-label": "Open chat",
    html: CHAT_ICON,
    style:
      "display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;border:none;" +
      "cursor:pointer;color:#fff;box-shadow:0 6px 24px rgba(10,10,10,.24);transition:transform .15s ease;",
    onclick: toggleOpen,
  });
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
      "flex:1;border:1px solid #d4d2cd;border-radius:8px;padding:10px 12px;font-size:14px;font-family:" +
      FONT +
      ";outline:none;color:#0a0a0a;background:#fff;",
  });
  input.addEventListener("focus", function () {
    input.style.borderColor = "#0a0a0a";
  });
  input.addEventListener("blur", function () {
    input.style.borderColor = "#d4d2cd";
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

  function applyColor(color) {
    bubble.style.background = color;
    header.style.background = color;
    sendBtn.style.background = color;
  }

  function setStatus(text) {
    statusEl.textContent = text || "";
    statusEl.style.display = text ? "block" : "none";
  }

  function addMessage(sender, text) {
    var mine = sender === "VISITOR";
    var bubbleEl = el(
      "div",
      {
        style:
          "max-width:82%;padding:9px 12px;font-size:14px;white-space:pre-wrap;word-break:break-word;border-radius:12px;" +
          (mine
            ? "align-self:flex-end;border-bottom-right-radius:4px;color:#fff;background:" + config.widgetColor + ";"
            : "align-self:flex-start;border-bottom-left-radius:4px;background:#fff;border:1px solid #e6e4e0;"),
      },
      [text]
    );
    messagesEl.appendChild(bubbleEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function toggleOpen() {
    isOpen = !isOpen;
    panel.style.display = isOpen ? "flex" : "none";
    bubble.innerHTML = isOpen ? CLOSE_ICON : CHAT_ICON;
    bubble.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");

    if (isOpen) {
      if (!openedOnce) {
        openedOnce = true;
        track("open");
      }
      if (cursor === null) loadHistory();
      startPolling();
      input.focus();
    } else {
      stopPolling();
    }
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
            addMessage(m.sender, m.text);
          });
          cursor = data.messages[data.messages.length - 1].createdAt;
        } else {
          addMessage("AGENT", data.welcomeMessage || config.welcomeMessage);
          cursor = new Date(0).toISOString();
        }
      })
      .catch(function () {
        setStatus("Couldn't load the conversation. Retrying…");
      });
  }

  function pollForReplies() {
    if (!cursor) return;
    fetch(api("/messages?visitorId=" + encodeURIComponent(visitorId) + "&after=" + encodeURIComponent(cursor)))
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.messages && data.messages.length) {
          data.messages.forEach(function (m) {
            addMessage(m.sender, m.text);
          });
          cursor = data.messages[data.messages.length - 1].createdAt;
        }
      })
      .catch(function () {
        /* retry on the next tick */
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

  function send() {
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMessage("VISITOR", text);
    sendBtn.disabled = true;

    fetch(api("/messages"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: visitorId, text: text, pageUrl: location.href.slice(0, 500) }),
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
        cursor = data.message.createdAt;
        setStatus("");
      })
      .catch(function (err) {
        setStatus(err.message || "Message failed to send. Please try again.");
      })
      .finally(function () {
        sendBtn.disabled = false;
      });
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
      applyColor(cfg.widgetColor || "#0a0a0a");

      try {
        if (!sessionStorage.getItem(SESSION_KEY)) {
          sessionStorage.setItem(SESSION_KEY, "1");
          track("view");
        }
      } catch (e) {
        track("view");
      }
    })
    .catch(function () {
      // Inactive chatbot, unpaid account, or a domain that isn't allowed: stay hidden.
      host.remove();
    });
})();
