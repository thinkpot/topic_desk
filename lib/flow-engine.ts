// Pure execution engine for the drag-and-drop flow builder. Takes a graph plus
// where a conversation currently stands, and returns what to say next. Has no
// knowledge of Prisma, Telegram, or the widget — callers persist the result.

export interface FlowOption {
  id: string;
  label: string;
}

export type FlowNodeType =
  | "start"
  | "message"
  | "question"
  | "buttons"
  | "condition"
  | "handoff"
  | "end"
  | "goto_flow";

/**
 * How a Go to flow node behaves:
 * - "return": run the other flow, then come back and continue from this
 *   node's outgoing connection (reuse — like calling a function).
 * - "jump": continue in the other flow and never come back.
 */
export type GotoFlowMode = "return" | "jump";

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
  flowId?: string; // goto_flow
  mode?: GotoFlowMode; // goto_flow
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

/** Guards against a malformed loop, within one flow or across several. */
const MAX_STEPS = 50;
/** How many "run it, then come back" calls can be nested before it's treated as a loop. */
const MAX_DEPTH = 8;

const LOOP_FALLBACK = "Let me connect you with our team.";

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

const PLACEHOLDER_RE = /\{([a-zA-Z0-9_]+)(?:\|([^{}]*))?\}/g;

/**
 * Fills saved answers into a line of bot text: {name} becomes the answer saved
 * as "name", and {name|there} falls back to "there" when there's no answer yet.
 * A placeholder with no answer and no fallback becomes empty rather than
 * showing the visitor raw braces. Only names a Question can save
 * (letters, digits, underscore) are treated as placeholders.
 */
export function fillVariables(text: string, variables: Record<string, string>): string {
  return text.replace(PLACEHOLDER_RE, (_, name: string, fallback?: string) => {
    const value = variables[name]?.trim();
    return value ? value : (fallback ?? "").trim();
  });
}

/** A point inside a specific flow. */
export interface FlowPosition {
  flowId: string;
  nodeId: string;
}

/** Where to resume after a "return" sub-flow finishes: after this Go to flow node. */
export type FlowFrame = FlowPosition;

export interface MultiFlowStepResult {
  outgoing: FlowOutgoingMessage[];
  /** Node the conversation is now waiting at, or null if not waiting on the visitor. */
  position: FlowPosition | null;
  stack: FlowFrame[];
  variables: Record<string, string>;
  handoff: boolean;
  ended: boolean;
}

function nextIdFrom(graph: FlowGraph, nodeId: string, handle?: string | null): string | null {
  const match = graph.edges.find(
    (e) => e.source === nodeId && (handle === undefined || (e.sourceHandle ?? null) === (handle ?? null))
  );
  return match?.target ?? null;
}

function firstNodeOf(graph: FlowGraph): string | null {
  const start = graph.nodes.find((n) => n.type === "start");
  return start ? nextIdFrom(graph, start.id) : null;
}

/**
 * Runs a chatbot's flows for one visitor turn. Conversations start in the
 * main flow; a Go to flow node moves into another flow, and in "return" mode
 * pushes a frame so that when the other flow finishes — reaches End, or runs
 * out of connections — the walk resumes after the Go to flow node.
 *
 * Collected answers are shared by every flow, so a flow can use an answer
 * another flow asked for. A Hand off ends everything, however deep.
 */
export function runFlows(params: {
  flows: Record<string, FlowGraph>;
  mainFlowId: string;
  /** Where the conversation is waiting, or null to start from the main flow. */
  position: FlowPosition | null;
  stack: FlowFrame[];
  variables: Record<string, string>;
  /** null only when starting a brand-new conversation (chat just opened). */
  input: FlowInput | null;
}): MultiFlowStepResult {
  const { flows, mainFlowId, input } = params;
  const variables: Record<string, string> = { ...params.variables };
  const outgoing: FlowOutgoingMessage[] = [];
  let stack: FlowFrame[] = [...params.stack];

  const nodeMaps = new Map<string, Map<string, FlowNode>>();
  function nodeIn(flowId: string, nodeId: string): FlowNode | undefined {
    const graph = flows[flowId];
    if (!graph) return undefined;
    let map = nodeMaps.get(flowId);
    if (!map) {
      map = new Map(graph.nodes.map((n) => [n.id, n]));
      nodeMaps.set(flowId, map);
    }
    return map.get(nodeId);
  }

  const waitAt = (flowId: string, nodeId: string): MultiFlowStepResult => ({
    outgoing,
    position: { flowId, nodeId },
    stack,
    variables,
    handoff: false,
    ended: false,
  });
  const finish = (kind: "handoff" | "ended"): MultiFlowStepResult => ({
    outgoing,
    position: null,
    stack: [],
    variables,
    handoff: kind === "handoff",
    ended: kind === "ended",
  });

  let flowId = mainFlowId;
  let currentId: string | null = null;

  if (params.position && flows[params.position.flowId]) {
    flowId = params.position.flowId;
    currentId = params.position.nodeId;
    if (input) {
      // Resuming at a node that was waiting on the visitor — consume their reply.
      const node = nodeIn(flowId, currentId);
      if (node?.type === "question") {
        if (node.data.variableName) variables[node.data.variableName] = input.text;
        currentId = nextIdFrom(flows[flowId], node.id);
      } else if (node?.type === "buttons") {
        const options = node.data.options ?? [];
        const matched = options.find((o) => o.id === input.choiceId) ?? options.find((o) => o.label === input.text);
        if (!matched) {
          // Free text instead of a tap, or a stale option id — re-ask rather than guess.
          outgoing.push({ text: fillVariables(node.data.prompt ?? "", variables), buttons: options });
          return waitAt(flowId, node.id);
        }
        currentId = nextIdFrom(flows[flowId], node.id, matched.id);
      }
      // Any other node type shouldn't have been "waiting" — keep walking from
      // it; those types don't consume input anyway.
    }
  } else {
    // A fresh start — or the flow this conversation was in has been deleted,
    // in which case starting over beats leaving the visitor stranded.
    stack = [];
    currentId = flows[mainFlowId] ? firstNodeOf(flows[mainFlowId]) : null;
  }

  let steps = 0;
  while (steps < MAX_STEPS) {
    steps++;

    if (currentId === null) {
      // Ran out of connections in this flow. If another flow is waiting for
      // it to finish, carry on there; otherwise the conversation's flow is done.
      const frame = stack.pop();
      if (!frame) return finish("ended");
      if (!flows[frame.flowId]) continue; // caller since deleted — keep unwinding
      flowId = frame.flowId;
      currentId = nextIdFrom(flows[flowId], frame.nodeId);
      continue;
    }

    const node = nodeIn(flowId, currentId);
    if (!node) {
      // Stale id pointing at something since deleted — treat as the end of this flow.
      currentId = null;
      continue;
    }
    const graph = flows[flowId];

    if (node.type === "message") {
      outgoing.push({ text: fillVariables(node.data.text ?? "", variables) });
      currentId = nextIdFrom(graph, node.id);
    } else if (node.type === "question") {
      outgoing.push({ text: fillVariables(node.data.prompt ?? "", variables) });
      return waitAt(flowId, node.id);
    } else if (node.type === "buttons") {
      outgoing.push({ text: fillVariables(node.data.prompt ?? "", variables), buttons: node.data.options ?? [] });
      return waitAt(flowId, node.id);
    } else if (node.type === "condition") {
      const actual = node.data.variable ? variables[node.data.variable] : undefined;
      const pass = evaluateCondition(actual, node.data.operator, node.data.value);
      currentId = nextIdFrom(graph, node.id, pass ? "true" : "false");
    } else if (node.type === "handoff") {
      if (node.data.message) outgoing.push({ text: fillVariables(node.data.message, variables) });
      return finish("handoff");
    } else if (node.type === "end") {
      if (node.data.message) outgoing.push({ text: fillVariables(node.data.message, variables) });
      // Inside a "return" sub-flow, End means "done here" — go back to the
      // caller rather than ending the whole conversation.
      if (stack.length === 0) return finish("ended");
      currentId = null;
    } else if (node.type === "goto_flow") {
      const targetId = node.data.flowId;
      const target = targetId ? flows[targetId] : undefined;
      if (!targetId || !target) {
        // Target unset or deleted — skip the step rather than strand the visitor.
        currentId = nextIdFrom(graph, node.id);
        continue;
      }
      if ((node.data.mode ?? "return") === "return") {
        if (stack.length >= MAX_DEPTH) break; // flows calling each other in a circle
        stack.push({ flowId, nodeId: node.id });
      }
      flowId = targetId;
      currentId = firstNodeOf(target);
    } else {
      currentId = nextIdFrom(graph, node.id);
    }
  }

  // A malformed loop — never leave a live chat hanging, hand off to a human.
  outgoing.push({ text: LOOP_FALLBACK });
  return finish("handoff");
}

/** Single-flow form, for callers that only have one graph. */
export function runFlow(params: {
  graph: FlowGraph;
  currentNodeId: string | null;
  variables: Record<string, string>;
  input: FlowInput | null;
}): FlowStepResult {
  const result = runFlows({
    flows: { main: params.graph },
    mainFlowId: "main",
    position: params.currentNodeId ? { flowId: "main", nodeId: params.currentNodeId } : null,
    stack: [],
    variables: params.variables,
    input: params.input,
  });
  return {
    outgoing: result.outgoing,
    nextNodeId: result.position?.nodeId ?? null,
    variables: result.variables,
    handoff: result.handoff,
    ended: result.ended,
  };
}

/** Ids of the flows a graph's Go to flow nodes point at. */
export function referencedFlowIds(graph: FlowGraph): string[] {
  return graph.nodes.filter((n) => n.type === "goto_flow" && n.data.flowId).map((n) => n.data.flowId!);
}
