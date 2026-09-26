// Pure execution engine for the drag-and-drop flow builder. Takes a graph plus
// where a conversation currently stands, and returns what to say next. Has no
// knowledge of Prisma, Telegram, or the widget — callers persist the result.

export interface FlowOption {
  id: string;
  label: string;
}

export type FlowNodeType = "start" | "message" | "question" | "buttons" | "condition" | "handoff" | "end";

export type ConditionOperator = "equals" | "contains" | "not_empty";

export interface FlowNodeData {
  text?: string; // message
  prompt?: string; // question, buttons
  variableName?: string; // question
  options?: FlowOption[]; // buttons
  variable?: string; // condition
  operator?: ConditionOperator; // condition
  value?: string; // condition
  message?: string; // handoff, end (optional closing line)
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowInput {
  text: string;
  /** Set when the visitor tapped a button rather than typing. */
  choiceId?: string;
}

export interface FlowOutgoingMessage {
  text: string;
  buttons?: FlowOption[];
}

export interface FlowStepResult {
  outgoing: FlowOutgoingMessage[];
  /** Node the conversation is now waiting at, or null if not waiting on the visitor. */
  nextNodeId: string | null;
  variables: Record<string, string>;
  handoff: boolean;
  ended: boolean;
}

const MAX_STEPS = 25;

function evaluateCondition(actual: string | undefined, operator: ConditionOperator | undefined, expected: string | undefined): boolean {
  const a = actual ?? "";
  const e = expected ?? "";
  switch (operator) {
    case "equals":
      return a.trim().toLowerCase() === e.trim().toLowerCase();
    case "contains":
      return a.toLowerCase().includes(e.toLowerCase());
    case "not_empty":
      return a.trim().length > 0;
    default:
      return false;
  }
}

export function runFlow(params: {
  graph: FlowGraph;
  currentNodeId: string | null;
  variables: Record<string, string>;
  /** null only when starting a brand-new conversation (chat just opened). */
  input: FlowInput | null;
}): FlowStepResult {
  const { graph, input } = params;
  const variables: Record<string, string> = { ...params.variables };
  const outgoing: FlowOutgoingMessage[] = [];
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));

  function nextIdFrom(nodeId: string, handle?: string | null): string | null {
    const match = graph.edges.find(
      (e) => e.source === nodeId && (handle === undefined || (e.sourceHandle ?? null) === (handle ?? null))
    );
    return match?.target ?? null;
  }

  let currentId = params.currentNodeId;

  if (currentId && input) {
    // Resuming at a node that was waiting on the visitor — consume their reply.
    const node = nodesById.get(currentId);
    if (node?.type === "question") {
      if (node.data.variableName) variables[node.data.variableName] = input.text;
      currentId = nextIdFrom(node.id);
    } else if (node?.type === "buttons") {
      const options = node.data.options ?? [];
      const matched = options.find((o) => o.id === input.choiceId) ?? options.find((o) => o.label === input.text);
      if (matched) {
        currentId = nextIdFrom(node.id, matched.id);
      } else {
        // Free text instead of a tap, or a stale option id — re-ask rather than guess.
        outgoing.push({ text: node.data.prompt ?? "", buttons: options });
        return { outgoing, nextNodeId: node.id, variables, handoff: false, ended: false };
      }
    }
    // Any other node type shouldn't have been "waiting" — fall through and
    // keep walking from wherever currentId points; harmless since those node
    // types don't consume input anyway.
  } else if (!currentId) {
    const start = graph.nodes.find((n) => n.type === "start");
    currentId = start ? nextIdFrom(start.id) : null;
  }

  let steps = 0;
  while (currentId && steps < MAX_STEPS) {
    steps++;
    const node = nodesById.get(currentId);
    if (!node) break;

    if (node.type === "message") {
      outgoing.push({ text: node.data.text ?? "" });
      currentId = nextIdFrom(node.id);
    } else if (node.type === "question") {
      outgoing.push({ text: node.data.prompt ?? "" });
      return { outgoing, nextNodeId: node.id, variables, handoff: false, ended: false };
    } else if (node.type === "buttons") {
      outgoing.push({ text: node.data.prompt ?? "", buttons: node.data.options ?? [] });
      return { outgoing, nextNodeId: node.id, variables, handoff: false, ended: false };
    } else if (node.type === "condition") {
      const actual = node.data.variable ? variables[node.data.variable] : undefined;
      const pass = evaluateCondition(actual, node.data.operator, node.data.value);
      currentId = nextIdFrom(node.id, pass ? "true" : "false");
    } else if (node.type === "handoff") {
      if (node.data.message) outgoing.push({ text: node.data.message });
      return { outgoing, nextNodeId: null, variables, handoff: true, ended: false };
    } else if (node.type === "end") {
      if (node.data.message) outgoing.push({ text: node.data.message });
      return { outgoing, nextNodeId: null, variables, handoff: false, ended: true };
    } else {
      currentId = nextIdFrom(node.id);
    }
  }

  if (steps >= MAX_STEPS) {
    // A malformed loop (e.g. two conditions pointing at each other) — never
    // leave a live chat hanging, hand off to a human instead.
    outgoing.push({ text: "Let me connect you with our team." });
    return { outgoing, nextNodeId: null, variables, handoff: true, ended: false };
  }

  // Ran off the end of the graph (a dangling node with no outgoing edge, or a
  // stale currentNodeId pointing at something that no longer exists).
  return { outgoing, nextNodeId: null, variables, handoff: false, ended: true };
}
