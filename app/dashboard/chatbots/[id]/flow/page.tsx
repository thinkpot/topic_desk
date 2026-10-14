"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api, apiErrorMessage } from "@/lib/api";
import { nodeTypes, FlowNamesContext } from "@/components/flow/nodes";
import NodeInspector from "@/components/flow/NodeInspector";
import { FLOW_PALETTE, defaultDataFor } from "@/lib/flow-node-defs";
import type { FlowNodeType } from "@/lib/flow-engine";
import { Field, Modal, Spinner, Toggle } from "@/components/ui/primitives";

type FlowNode = Node<Record<string, unknown>>;

interface FlowSummary {
  id: string;
  name: string;
  isMain: boolean;
  isEnabled: boolean;
  stepCount: number;
}

let counter = 0;
function newNodeId() {
  counter += 1;
  return `node_${Date.now().toString(36)}_${counter}`;
}

const PALETTE_COLOR: Record<string, string> = Object.fromEntries(FLOW_PALETTE.map((p) => [p.type, p.color]));

// Changes that don't alter the saved flow — clicking or measuring a node.
const COSMETIC_CHANGES = new Set(["select", "dimensions"]);

type Dialog = { kind: "create" } | { kind: "rename" } | { kind: "delete" } | null;

function FlowCanvas({ chatbotId }: { chatbotId: string }) {
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [botName, setBotName] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogName, setDialogName] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const active = flows.find((f) => f.id === activeId) ?? null;
  const flowNames = useMemo(() => Object.fromEntries(flows.map((f) => [f.id, f.name])), [flows]);
  const otherFlows = useMemo(
    () => flows.filter((f) => f.id !== activeId).map((f) => ({ id: f.id, name: f.name })),
    [flows, activeId]
  );

  const refreshFlows = useCallback(async () => {
    const res = await api.get(`/chatbots/${chatbotId}/flows`);
    setFlows(res.data.flows);
    return res.data.flows as FlowSummary[];
  }, [chatbotId]);

  const openFlow = useCallback(
    async (flowId: string) => {
      setLoading(true);
      setError(null);
      setSelectedId(null);
      try {
        const res = await api.get(`/chatbots/${chatbotId}/flows/${flowId}`);
        const flow = res.data.flow;
        setNodes(flow.nodes.map((n: FlowNode) => ({ ...n, deletable: n.type !== "start" })));
        setEdges(flow.edges);
        setIsEnabled(flow.isEnabled);
        setActiveId(flow.id);
        setDirty(false);
        // Let React Flow measure the new nodes before framing them.
        requestAnimationFrame(() => fitView({ maxZoom: 1 }));
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [chatbotId, setNodes, setEdges, fitView]
  );

  useEffect(() => {
    Promise.all([api.get(`/chatbots/${chatbotId}`), refreshFlows()])
      .then(([botRes, list]) => {
        setBotName(botRes.data.chatbot.name);
        const requested = new URLSearchParams(window.location.search).get("flow");
        const initial = list.find((f) => f.id === requested) ?? list.find((f) => f.isMain) ?? list[0];
        if (initial) return openFlow(initial.id);
      })
      .catch((err) => {
        setError(apiErrorMessage(err));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatbotId]);

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function confirmDiscard(): boolean {
    return !dirty || window.confirm("You have unsaved changes in this flow. Discard them?");
  }

  async function switchTo(flowId: string) {
    if (flowId === activeId || !confirmDiscard()) return;
    await openFlow(flowId);
  }

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      if (changes.some((c) => !COSMETIC_CHANGES.has(c.type))) setDirty(true);
      onNodesChangeBase(changes);
    },
    [onNodesChangeBase]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      if (changes.some((c) => c.type !== "select")) setDirty(true);
      onEdgesChangeBase(changes);
    },
    [onEdgesChangeBase]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setDirty(true);
      setEdges((eds) => addEdge({ ...connection, id: `edge_${Date.now().toString(36)}` }, eds));
    },
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow") as FlowNodeType | "";
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = newNodeId();
      setDirty(true);
      setNodes((nds) => nds.concat({ id, type, position, data: defaultDataFor(type), deletable: true }));
      // A Go to flow step is useless until a flow is picked — open its settings straight away.
      if (type === "goto_flow") setSelectedId(id);
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  function updateNodeData(id: string, data: Record<string, unknown>) {
    setDirty(true);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data } : n)));
    // A "switch to it" step never continues, so its outgoing connection would
    // be invisible and meaningless — drop it rather than leave it dangling.
    const node = nodes.find((n) => n.id === id);
    if (node?.type === "goto_flow" && data.mode === "jump") {
      setEdges((eds) => eds.filter((e) => e.source !== id));
    }
  }

  function deleteNode(id: string) {
    setDirty(true);
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  }

  async function save() {
    if (!activeId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch(`/chatbots/${chatbotId}/flows/${activeId}`, {
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null })),
        ...(active?.isMain && { isEnabled }),
      });
      setIsEnabled(res.data.flow.isEnabled);
      setDirty(false);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2000);
      refreshFlows().catch(() => {});
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openDialog(next: NonNullable<Dialog>) {
    setDialog(next);
    setDialogName(next.kind === "rename" ? active?.name ?? "" : "");
    setDialogError(null);
  }

  async function submitDialog() {
    if (!dialog || !activeId) return;
    setDialogBusy(true);
    setDialogError(null);
    try {
      if (dialog.kind === "create") {
        if (!confirmDiscard()) return;
        const res = await api.post(`/chatbots/${chatbotId}/flows`, { name: dialogName });
        await refreshFlows();
        setDialog(null);
        await openFlow(res.data.flow.id);
      } else if (dialog.kind === "rename") {
        await api.patch(`/chatbots/${chatbotId}/flows/${activeId}`, { name: dialogName });
        await refreshFlows();
        setDialog(null);
      } else {
        await api.delete(`/chatbots/${chatbotId}/flows/${activeId}`);
        const list = await refreshFlows();
        setDialog(null);
        setDirty(false);
        const main = list.find((f) => f.isMain) ?? list[0];
        if (main) await openFlow(main.id);
      }
    } catch (err) {
      setDialogError(apiErrorMessage(err));
    } finally {
      setDialogBusy(false);
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/dashboard/chatbots/${chatbotId}`} className="text-[13px] text-ink-3 hover:text-ink">
            ← {botName || "Chatbot"}
          </Link>
          <span className="text-[14px] font-semibold">Flow builder</span>
          {flows.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={activeId ?? ""}
                onChange={(e) => switchTo(e.target.value)}
                className="input w-auto py-1 text-[13px]"
                aria-label="Flow"
              >
                {flows.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.isMain ? " (main)" : ""}
                  </option>
                ))}
              </select>
              <button onClick={() => openDialog({ kind: "create" })} className="btn-ghost btn-sm">
                + New flow
              </button>
              {active && (
                <button onClick={() => openDialog({ kind: "rename" })} className="btn-ghost btn-sm">
                  Rename
                </button>
              )}
              {active && !active.isMain && (
                <button onClick={() => openDialog({ kind: "delete" })} className="btn-ghost btn-sm text-critical">
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-[13px] text-critical">{error}</span>}
          {!error && savedAt && <span className="text-[13px] text-ink-3">Saved.</span>}
          {!error && !savedAt && dirty && <span className="text-[13px] text-ink-3">Unsaved changes</span>}
          {active?.isMain ? (
            <label className="flex items-center gap-2 text-[13px] font-medium">
              <Toggle
                checked={isEnabled}
                onChange={(next) => {
                  setDirty(true);
                  setIsEnabled(next);
                }}
                label="Flows are on"
              />
              {isEnabled ? "On" : "Off"}
            </label>
          ) : (
            active && <span className="text-[12.5px] text-ink-3">Runs when a Go to flow step reaches it</span>
          )}
          <button onClick={save} disabled={saving || !activeId} className="btn-primary btn-sm">
            {saving ? "Saving…" : "Save flow"}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-[184px] shrink-0 space-y-2 overflow-y-auto border-r border-line bg-surface p-3">
          <p className="label-eyebrow mb-1">Drag onto canvas</p>
          {FLOW_PALETTE.map((entry) => (
            <div
              key={entry.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/reactflow", entry.type);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="cursor-grab select-none rounded-md border border-line bg-surface p-2.5 transition-colors hover:border-line-strong active:cursor-grabbing"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[13px]">{entry.icon}</span>
                <span className="text-[13px] font-medium">{entry.label}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-3">{entry.description}</p>
            </div>
          ))}
        </div>

        <div className="relative flex-1">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/70">
              <Spinner />
            </div>
          )}
          <FlowNamesContext.Provider value={flowNames}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onNodeDoubleClick={(_, node) => {
                const target = node.type === "goto_flow" ? (node.data.flowId as string | undefined) : undefined;
                if (target && flowNames[target]) switchTo(target);
              }}
              onPaneClick={() => setSelectedId(null)}
              deleteKeyCode={["Backspace", "Delete"]}
              fitView
              fitViewOptions={{ maxZoom: 1 }}
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable nodeColor={(n) => PALETTE_COLOR[n.type ?? ""] ?? "#0a0a0a"} />
            </ReactFlow>
          </FlowNamesContext.Provider>
        </div>

        {selectedNode && (
          <div className="w-[300px] shrink-0 border-l border-line bg-surface">
            <NodeInspector
              node={selectedNode}
              onChange={(data) => updateNodeData(selectedNode.id, data)}
              onDelete={() => deleteNode(selectedNode.id)}
              onClose={() => setSelectedId(null)}
              otherFlows={otherFlows}
              onOpenFlow={switchTo}
              onCreateFlow={() => openDialog({ kind: "create" })}
            />
          </div>
        )}
      </div>

      <Modal
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "create" ? "New flow" : dialog?.kind === "rename" ? "Rename flow" : `Delete "${active?.name}"?`}
        footer={
          <>
            <button onClick={() => setDialog(null)} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={submitDialog}
              disabled={dialogBusy || (dialog?.kind !== "delete" && !dialogName.trim())}
              className={dialog?.kind === "delete" ? "btn-danger btn-sm" : "btn-primary btn-sm"}
            >
              {dialogBusy ? "Working…" : dialog?.kind === "create" ? "Create flow" : dialog?.kind === "rename" ? "Save" : "Delete flow"}
            </button>
          </>
        }
      >
        {dialog?.kind === "delete" ? (
          <p className="text-[14px] text-ink-2">
            This flow and its steps will be removed. Visitors who are part-way through it start over from the main flow
            on their next message.
          </p>
        ) : (
          <Field
            label="Flow name"
            hint={dialog?.kind === "create" ? "e.g. Collect contact details, Sales, Support. Starts empty — add steps after." : undefined}
          >
            <input
              autoFocus
              value={dialogName}
              maxLength={60}
              onChange={(e) => setDialogName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && dialogName.trim() && submitDialog()}
              className="input"
            />
          </Field>
        )}
        {dialogError && <p className="mt-3 text-[13px] text-critical">{dialogError}</p>}
      </Modal>
    </div>
  );
}

export default function FlowPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ReactFlowProvider>
      <FlowCanvas chatbotId={id} />
    </ReactFlowProvider>
  );
}
