import type { Post } from "@/lib/blog";

import * as addLiveChat from "./how-to-add-live-chat-to-your-website";
import * as visitorTrackingSoftware from "./website-visitor-tracking-software";
import * as freeVisitorTracking from "./free-website-visitor-tracking";
import * as freeLiveChat from "./free-live-chat-software-for-your-website";
import * as createChatbot from "./how-to-create-a-chatbot-for-your-website";
import * as bestPractices from "./live-chat-best-practices";
import * as telegramBot from "./telegram-bot-for-business";
import * as liveChatVsChatbot from "./live-chat-vs-chatbot";
import * as widgetSafe from "./is-a-live-chat-widget-safe";
import * as trackingLegal from "./is-website-visitor-tracking-legal";

// Each post module exports `meta` plus a default component for its body. Adding
// a post means creating the file and adding it to this list — deliberately
// explicit, so nothing is published by merely existing on disk.
const MODULES = [
  addLiveChat,
  visitorTrackingSoftware,
  freeVisitorTracking,
  freeLiveChat,
  createChatbot,
  bestPractices,
  telegramBot,
  liveChatVsChatbot,
  widgetSafe,
  trackingLegal,
];

export const POSTS: Post[] = MODULES.map((module) => ({ ...module.meta, Body: module.default }));
