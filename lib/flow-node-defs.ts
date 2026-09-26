import type { FlowNodeType } from "./flow-engine";

export interface FlowPaletteEntry {
  type: FlowNodeType;
  label: string;
  description: string;
  color: string;
  icon: string;
}

// Start isn't in the palette — every flow gets exactly one, already on the canvas.
export const FLOW_PALETTE: FlowPaletteEntry[] = [
  { type: "message", label: "Message", description: "Send a line of text", color: "#2a78d6", icon: "💬" },
  { type: "question", label: "Question", description: "Ask something, save the reply", color: "#0f7a3d", icon: "❓" },
  { type: "buttons", label: "Buttons", description: "Offer tappable choices", color: "#c9407e", icon: "🔘" },
  { type: "condition", label: "Condition", description: "Branch on a saved answer", color: "#8a6a00", icon: "🔀" },
  { type: "handoff", label: "Hand off", description: "Open a Telegram topic for a human", color: "#5b3fc9", icon: "🙋" },
  { type: "end", label: "End", description: "Stop the flow here", color: "#6b6b6b", icon: "🏁" },
];

export function defaultDataFor(type: FlowNodeType): Record<string, unknown> {
  switch (type) {
    case "message":
      return { text: "" };
    case "question":
      return { prompt: "", variableName: "" };
    case "buttons":
      return {
        prompt: "",
        options: [
          { id: `opt_${Math.random().toString(36).slice(2, 8)}`, label: "Option 1" },
          { id: `opt_${Math.random().toString(36).slice(2, 8)}`, label: "Option 2" },
        ],
      };
    case "condition":
      return { variable: "", operator: "equals", value: "" };
    case "handoff":
      return { message: "Connecting you with our team…" };
    case "end":
      return { message: "" };
    default:
      return {};
  }
}
