import { describe, expect, it } from "vitest";
import { fillVariables, runFlow, runFlows, type FlowGraph, type FlowNode, type FlowEdge } from "@/lib/flow-engine";

// Tiny builder: a linear chain of nodes after Start, each connected to the next.
function chain(...nodes: Omit<FlowNode, "position">[]): FlowGraph {
  const all: FlowNode[] = [{ id: "start", type: "start", position: { x: 0, y: 0 }, data: {} }, ...nodes.map((n) => ({ ...n, position: { x: 0, y: 0 } }))];
  const edges: FlowEdge[] = all.slice(1).map((n, i) => ({ id: `e${i}`, source: all[i].id, target: n.id }));
  return { nodes: all, edges };
}
const msg = (id: string, text: string) => ({ id, type: "message" as const, data: { text } });
const ask = (id: string, prompt: string, variableName: string) => ({ id, type: "question" as const, data: { prompt, variableName } });
const goto = (id: string, flowId: string, mode: "return" | "jump" = "return") => ({ id, type: "goto_flow" as const, data: { flowId, mode } });
const end = (id: string, message = "") => ({ id, type: "end" as const, data: { message } });
const handoff = (id: string) => ({ id, type: "handoff" as const, data: { message: "Connecting…" } });

const texts = (r: { outgoing: { text: string }[] }) => r.outgoing.map((o) => o.text);
const start = (flows: Record<string, FlowGraph>) =>
  runFlows({ flows, mainFlowId: "main", position: null, stack: [], variables: {}, input: null });

describe("runFlow (single flow)", () => {
  it("still walks a plain flow and waits at a question", () => {
    const r = runFlow({ graph: chain(msg("m", "Hi"), ask("q", "Your email?", "email")), currentNodeId: null, variables: {}, input: null });
    expect(texts(r)).toEqual(["Hi", "Your email?"]);
    expect(r.nextNodeId).toBe("q");
  });
});

describe("runFlows — Go to flow, run and come back", () => {
  const flows = {
    main: chain(msg("a", "A"), goto("g", "details"), msg("c", "C"), end("e", "Bye")),
    details: chain(msg("b", "B")), // runs out of connections → returns to the caller
  };

  it("runs the other flow, then continues after the Go to flow step", () => {
    const r = start(flows);
    expect(texts(r)).toEqual(["A", "B", "C", "Bye"]);
    expect(r.ended).toBe(true);
    expect(r.stack).toEqual([]);
  });

  it("waits inside the other flow and remembers where to come back to", () => {
    const withQuestion = { main: flows.main, details: chain(ask("q", "Your name?", "name")) };
    const first = start(withQuestion);
    expect(texts(first)).toEqual(["A", "Your name?"]);
    expect(first.position).toEqual({ flowId: "details", nodeId: "q" });
    expect(first.stack).toEqual([{ flowId: "main", nodeId: "g" }]);

    const second = runFlows({
      flows: withQuestion,
      mainFlowId: "main",
      position: first.position,
      stack: first.stack,
      variables: first.variables,
      input: { text: "Priya" },
    });
    expect(texts(second)).toEqual(["C", "Bye"]);
    expect(second.variables.name).toBe("Priya"); // answers are shared across flows
    expect(second.ended).toBe(true);
  });

  it("treats End inside the other flow as 'return', not 'end the chat'", () => {
    const r = start({ main: flows.main, details: chain(msg("b", "B"), end("de", "Got it")) });
    expect(texts(r)).toEqual(["A", "B", "Got it", "C", "Bye"]);
  });

  it("nests: a flow can call a flow that calls another", () => {
    const r = start({
      main: chain(goto("g1", "one"), msg("m", "back in main")),
      one: chain(msg("o", "in one"), goto("g2", "two"), msg("o2", "back in one")),
      two: chain(msg("t", "in two")),
    });
    expect(texts(r)).toEqual(["in one", "in two", "back in one", "back in main"]);
  });
});

describe("runFlows — Go to flow, switch for good", () => {
  it("continues in the other flow and never comes back", () => {
    const r = start({
      main: chain(msg("a", "A"), goto("g", "sales", "jump"), msg("never", "should not appear")),
      sales: chain(msg("s", "Sales here"), end("e")),
    });
    expect(texts(r)).toEqual(["A", "Sales here"]);
    expect(r.ended).toBe(true);
  });
});

describe("runFlows — never strands a visitor", () => {
  it("a hand off inside another flow ends everything and clears the stack", () => {
    const r = start({ main: chain(goto("g", "sub"), msg("c", "C")), sub: chain(handoff("h")) });
    expect(r.handoff).toBe(true);
    expect(r.stack).toEqual([]);
    expect(texts(r)).toEqual(["Connecting…"]);
  });

  it("two flows calling each other in a circle hand off instead of looping", () => {
    const r = start({ main: chain(goto("g", "b")), b: chain(goto("g2", "main")) });
    expect(r.handoff).toBe(true);
    expect(texts(r).at(-1)).toBe("Let me connect you with our team.");
  });

  it("two flows switching to each other forever hand off instead of looping", () => {
    const r = start({ main: chain(goto("g", "b", "jump")), b: chain(goto("g2", "main", "jump")) });
    expect(r.handoff).toBe(true);
  });

  it("skips a Go to flow step whose flow no longer exists", () => {
    const r = start({ main: chain(msg("a", "A"), goto("g", "deleted"), msg("c", "C")) });
    expect(texts(r)).toEqual(["A", "C"]);
  });

  it("starts over from the main flow if the visitor was in a flow that's been deleted", () => {
    const r = runFlows({
      flows: { main: chain(msg("a", "Welcome back")) },
      mainFlowId: "main",
      position: { flowId: "deleted", nodeId: "q" },
      stack: [],
      variables: {},
      input: { text: "hello" },
    });
    expect(texts(r)).toEqual(["Welcome back"]);
  });

  it("keeps unwinding if a flow it should return to has been deleted", () => {
    const r = runFlows({
      flows: { main: chain(msg("c", "C")), sub: chain(ask("q", "Name?", "name")) },
      mainFlowId: "main",
      position: { flowId: "sub", nodeId: "q" },
      stack: [{ flowId: "main", nodeId: "c" }, { flowId: "deleted", nodeId: "x" }],
      variables: {},
      input: { text: "Priya" },
    });
    // "deleted" is skipped; main resumes after node "c" (which has no next) → ends.
    expect(r.ended).toBe(true);
  });
});

describe("fillVariables", () => {
  it("fills in a saved answer", () => {
    expect(fillVariables("Thanks, {name}!", { name: "Priya" })).toBe("Thanks, Priya!");
  });

  it("uses the fallback when there's no answer", () => {
    expect(fillVariables("Hi {name|there}", {})).toBe("Hi there");
    expect(fillVariables("Hi {name|there}", { name: "  " })).toBe("Hi there");
  });

  it("drops a placeholder with no answer and no fallback instead of showing braces", () => {
    expect(fillVariables("Your order {order} is noted", {})).toBe("Your order  is noted");
  });

  it("leaves text that isn't a placeholder alone", () => {
    expect(fillVariables("Price: {10 USD} or { name }", { name: "x" })).toBe("Price: {10 USD} or { name }");
  });
});

describe("runFlows — saved answers in bot text", () => {
  it("fills answers collected in an earlier flow into a later message", () => {
    const flows = {
      main: chain(goto("g", "details"), msg("thanks", "Thanks, {name}! We'll email {email|you}.")),
      details: chain(ask("q", "Your name?", "name")),
    };
    const first = start(flows);
    const second = runFlows({
      flows,
      mainFlowId: "main",
      position: first.position,
      stack: first.stack,
      variables: first.variables,
      input: { text: "Priya" },
    });
    expect(texts(second)).toEqual(["Thanks, Priya! We'll email you."]);
  });
});
