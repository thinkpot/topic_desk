import { describe, expect, it } from "vitest";
import { flowsReferencing, gotoProblems } from "@/lib/flow-store";

const goto = (flowId: string, mode?: string) => ({ type: "goto_flow", data: { flowId, ...(mode && { mode }) } });

describe("gotoProblems", () => {
  const existing = new Set(["main", "details"]);

  it("accepts a Go to flow step pointing at another existing flow", () => {
    expect(gotoProblems([goto("details", "return")], "main", existing)).toBeNull();
  });

  it("rejects a step with no flow picked", () => {
    expect(gotoProblems([goto("")], "main", existing)).toMatch(/doesn't have a flow picked/);
  });

  it("rejects a step pointing at its own flow", () => {
    expect(gotoProblems([goto("main")], "main", existing)).toMatch(/can't point at the flow it's in/);
  });

  it("rejects a step pointing at a flow that doesn't exist", () => {
    expect(gotoProblems([goto("gone")], "main", existing)).toMatch(/no longer exists/);
  });

  it("ignores other node types", () => {
    expect(gotoProblems([{ type: "message", data: { text: "hi" } }], "main", existing)).toBeNull();
  });
});

describe("flowsReferencing", () => {
  const flows = [
    { id: "main", name: "Main", nodes: [goto("details")], edges: [] },
    { id: "sales", name: "Sales", nodes: [goto("details", "jump")], edges: [] },
    { id: "details", name: "Collect details", nodes: [], edges: [] },
  ];

  it("names every other flow that jumps to the given one", () => {
    expect(flowsReferencing(flows, "details")).toEqual(["Main", "Sales"]);
  });

  it("returns nothing for a flow nobody points at", () => {
    expect(flowsReferencing(flows, "sales")).toEqual([]);
  });
});
