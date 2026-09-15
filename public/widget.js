(function () {
  var currentScript = document.currentScript;
  var chatbotId = currentScript.getAttribute("data-chatbot-id");
  if (!chatbotId) {
    console.error("[chat-widget] Missing data-chatbot-id attribute on script tag");
    return;
  }

  var apiBase = currentScript.getAttribute("data-api-url") || currentScript.src.replace(/\/widget\.js.*$/, "");
  var POLL_INTERVAL_MS = 3000;

  var VISITOR_ID_KEY = "cw_visitor_id_" + chatbotId;
  var visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }

  var isOpen = false;
  var cursor = null; // ISO timestamp of the last message we've rendered
  var pollTimer = null;
  var config = { name: "Chat with us", welcomeMessage: "Hi! How can we help you today?", widgetColor: "#2563eb" };

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "style") e.style.cssText = attrs[k];
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }

  var root = el("div", { id: "cw-root", style: "position:fixed;bottom:20px;right:20px;z-index:2147483000;font-family:system-ui,-apple-system,sans-serif;" });
  function mount() {
    document.body.appendChild(root);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  var bubble = el(
    "button",
    {
      "aria-label": "Open chat",
      style:
        "width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);color:#fff;font-size:26px;",
      onclick: toggleOpen,
    },
    ["💬"]
  );

  var panel = el("div", {
    style:
      "display:none;flex-direction:column;width:340px;max-width:calc(100vw - 40px);height:480px;max-height:calc(100vh - 100px);background:#fff;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.2);overflow:hidden;position:absolute;bottom:74px;right:0;",
  });

  var header = el("div", { style: "padding:16px;color:#fff;font-weight:600;font-size:15px;" });
  var messagesEl = el("div", { style: "flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f7f7f8;" });
  var statusEl = el("div", { style: "padding:6px 12px;font-size:12px;color:#888;text-align:center;display:none;" });

  var input = el("input", {
    type: "text",
    placeholder: "Type your message...",
    style: "flex:1;border:1px solid #ddd;border-radius:20px;padding:10px 14px;font-size:14px;outline:none;",
  });
  var sendBtn = el("button", { style: "border:none;color:#fff;border-radius:20px;padding:10px 16px;font-size:14px;cursor:pointer;" }, ["Send"]);
  var inputRow = el("div", { style: "display:flex;gap:8px;padding:10px;border-top:1px solid #eee;background:#fff;" }, [input, sendBtn]);

  panel.appendChild(header);
  panel.appendChild(messagesEl);
  panel.appendChild(statusEl);
  panel.appendChild(inputRow);
  root.appendChild(panel);
  root.appendChild(bubble);

  function applyColor(color) {
    bubble.style.background = color;
    header.style.background = color;
    sendBtn.style.background = color;
  }

  function setStatus(text) {
    statusEl.textContent = text;
    statusEl.style.display = text ? "block" : "none";
  }

  function addMessage(sender, text) {
    var mine = sender === "VISITOR";
    var bubbleEl = el(
      "div",
      {
        style:
          "max-width:80%;padding:8px 12px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-break:break-word;" +
          (mine
            ? "align-self:flex-end;background:" + config.widgetColor + ";color:#fff;border-bottom-right-radius:4px;"
            : "align-self:flex-start;background:#fff;color:#222;border:1px solid #eee;border-bottom-left-radius:4px;"),
      },
      [text]
    );
    messagesEl.appendChild(bubbleEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function toggleOpen() {
    isOpen = !isOpen;
    panel.style.display = isOpen ? "flex" : "none";
    if (isOpen) {
      if (cursor === null) loadHistory();
      startPolling();
    } else {
      stopPolling();
    }
  }

  function apiUrl(path) {
    return apiBase + "/api/widget/" + chatbotId + path;
  }

  function loadHistory() {
    setStatus("Loading...");
    fetch(apiUrl("/messages?visitorId=" + encodeURIComponent(visitorId)))
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
        setStatus("Couldn't load the conversation. It will retry shortly.");
      });
  }

  function pollForReplies() {
    if (!cursor) return;
    fetch(apiUrl("/messages?visitorId=" + encodeURIComponent(visitorId) + "&after=" + encodeURIComponent(cursor)))
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
        // silently retry on the next poll tick
      });
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(pollForReplies, POLL_INTERVAL_MS);
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

    fetch(apiUrl("/messages"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: visitorId, text: text }),
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (e) { throw new Error(e.error || "Failed to send"); });
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

  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") send();
  });

  fetch(apiUrl("/config"))
    .then(function (r) {
      if (!r.ok) throw new Error("bad config");
      return r.json();
    })
    .then(function (cfg) {
      config = cfg;
      header.textContent = cfg.name;
      applyColor(cfg.widgetColor || "#2563eb");
    })
    .catch(function () {
      applyColor(config.widgetColor);
      header.textContent = config.name;
    });
})();
