(function () {
  var currentScript = document.currentScript;
  var chatbotId = currentScript.getAttribute("data-chatbot-id");
  if (!chatbotId) {
    console.error("[chat-widget] Missing data-chatbot-id attribute on script tag");
    return;
  }

  var scriptSrc = currentScript.src;
  var apiBase = currentScript.getAttribute("data-api-url") || scriptSrc.replace(/\/widget\.js.*$/, "");

  var VISITOR_ID_KEY = "cw_visitor_id_" + chatbotId;
  var visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }

  var socket = null;
  var conversationId = null;
  var isOpen = false;
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
  document.addEventListener("DOMContentLoaded", function () {
    document.body.appendChild(root);
  });
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(function () {
      document.body.appendChild(root);
    });
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
  var statusEl = el("div", { style: "padding:6px 12px;font-size:12px;color:#888;text-align:center;" }, ["Connecting..."]);

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
    if (isOpen && !socket) connect();
  }

  function connect() {
    var io = window.io;
    if (!io) {
      var s = document.createElement("script");
      s.src = apiBase + "/socket.io/socket.io.js";
      s.onload = doConnect;
      document.head.appendChild(s);
    } else {
      doConnect();
    }
  }

  function doConnect() {
    socket = window.io(apiBase, { transports: ["websocket", "polling"] });

    socket.on("connect", function () {
      socket.emit("join", { chatbotId: chatbotId, visitorId: visitorId });
    });

    socket.on("joined", function (data) {
      conversationId = data.conversationId;
      statusEl.style.display = "none";
      if (data.history && data.history.length) {
        data.history.forEach(function (m) {
          addMessage(m.sender, m.text);
        });
      } else if (data.welcomeMessage) {
        addMessage("AGENT", data.welcomeMessage);
      }
    });

    socket.on("message", function (m) {
      addMessage(m.sender, m.text);
    });

    socket.on("fatal_error", function (e) {
      statusEl.textContent = e.message || "Chat is unavailable right now.";
      statusEl.style.display = "block";
    });

    socket.on("disconnect", function () {
      statusEl.textContent = "Reconnecting...";
      statusEl.style.display = "block";
    });
  }

  function send() {
    var text = input.value.trim();
    if (!text || !socket || !conversationId) return;
    socket.emit("message", { conversationId: conversationId, text: text });
    addMessage("VISITOR", text);
    input.value = "";
  }

  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") send();
  });

  fetch(apiBase + "/api/widget/" + chatbotId + "/config")
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
