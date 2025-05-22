"use client";

import { useState, useCallback } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

interface N8nNode {
  id: string;
  type: string;
  position: [number, number];
  name: string;
  parameters?: Record<string, any>;
}

interface N8nWorkflow {
  nodes: N8nNode[];
  connections: Record<
    string,
    { main: Array<Array<{ node: string; index: number }>> }
  >;
}

interface NodeData {
  label: string;
  [key: string]: any;
}

interface Condition {
  id: string;
  leftValue: string;
  rightValue: string | number;
  operator: {
    type: string;
    operation: string;
    singleValue?: boolean;
  };
}

const getNodeTypeColor = (nodeType: string) => {
  if (nodeType.includes("if")) return "#e6f3ff";
  if (nodeType.includes("googleSheets")) return "#e6ffe6";
  if (nodeType.includes("gmail")) return "#ffe6e6";
  return "#fff";
};

const convertN8nToReactFlow = (
  workflow: N8nWorkflow
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = workflow.nodes.map((node) => ({
    id: node.id,
    type: "custom",
    position: { x: node.position[0], y: node.position[1] },
    data: {
      label: node.name,
      nodeType: node.type,
      ...(node.type.includes("if")
        ? {
            conditions: node.parameters?.conditions?.conditions || [],
            combinator: node.parameters?.conditions?.combinator || "and",
          }
        : node.type.includes("googleSheets")
        ? {
            documentId: node.parameters?.documentId?.cachedResultName || "N/A",
            sheetName: node.parameters?.sheetName?.cachedResultName || "N/A",
          }
        : node.type.includes("gmail")
        ? { subject: node.parameters?.subject || "N/A" }
        : { parameters: node.parameters || {} }),
    },
  }));

  const nodeIdMap: Record<string, N8nNode> = {};
  workflow.nodes.forEach((node) => {
    nodeIdMap[node.id] = node;
  });

  const nameToIdMap: Record<string, string> = {};
  workflow.nodes.forEach((node) => {
    nameToIdMap[node.name] = node.id;
  });

  const edges: Edge[] = [];
  Object.entries(workflow.connections).forEach(
    ([sourceName, connectionData]) => {
      const sourceId = nameToIdMap[sourceName];
      if (!sourceId) {
        console.warn(
          `Source node with name "${sourceName}" not found in nodes.`
        );
        return;
      }

      if (connectionData.main && Array.isArray(connectionData.main)) {
        connectionData.main.forEach((outputGroup, outputIndex) => {
          if (Array.isArray(outputGroup) && outputGroup.length > 0) {
            outputGroup.forEach((connection) => {
              const targetName = connection.node;
              const targetId = nameToIdMap[targetName];
              if (!targetId) {
                console.warn(
                  `Target node with name "${targetName}" not found in nodes.`
                );
                return;
              }

              const edgeId = `e-${sourceId}-${targetId}-${outputIndex}-${
                connection.index || 0
              }`;
              edges.push({
                id: edgeId,
                source: sourceId,
                target: targetId,
                sourceHandle: `output-${outputIndex}`,
                targetHandle: `input-${connection.index || 0}`,
                type: "smoothstep",
                animated: true,
                style: { stroke: "#555", strokeWidth: 2 },
                // label: `${outputIndex} → ${connection.index || 0}`,
              });
            });
          }
        });
      }
    }
  );

  return { nodes, edges };
};

const CustomNodeComponent: React.FC<{ data: NodeData }> = ({ data }) => (
  <div
    style={{
      padding: 10,
      borderRadius: 8,
      background: getNodeTypeColor(data.nodeType || ""),
      border: "1px solid #ccc",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      maxWidth: 250,
      fontSize: "14px",
      position: "relative",
    }}
  >
    <Handle
      type="target"
      position={Position.Top}
      id="input"
      style={{ background: "#555", width: 10, height: 10 }}
    />

    <div
      style={{
        fontWeight: "bold",
        marginBottom: "8px",
        borderBottom: "1px solid #ddd",
        paddingBottom: "4px",
      }}
    >
      {data.label}
    </div>

    {data.conditions && data.conditions.length > 0 && (
      <div style={{ fontSize: "12px" }}>
        <div style={{ fontWeight: "bold" }}>
          Conditions ({data.combinator?.toUpperCase()}):
        </div>
        {data.conditions.map((cond: Condition, i: number) => (
          <div
            key={i}
            style={{
              marginTop: "4px",
              padding: "4px",
              background: "rgba(255,255,255,0.5)",
              borderRadius: "4px",
            }}
          >
            {cond.leftValue?.replace(/{{ | }}/g, "")}{" "}
            <strong>{cond.operator?.operation.toUpperCase()}</strong>{" "}
            {cond.rightValue}
          </div>
        ))}
      </div>
    )}

    {data.documentId && (
      <div style={{ fontSize: "12px" }}>
        <div>
          <strong>Sheet:</strong> {data.documentId}
        </div>
        {data.sheetName && (
          <div>
            <strong>Tab:</strong> {data.sheetName}
          </div>
        )}
      </div>
    )}

    {data.subject && (
      <div style={{ fontSize: "12px" }}>
        <strong>Email Subject:</strong> {data.subject}
      </div>
    )}

    {data.parameters &&
      !data.conditions &&
      !data.documentId &&
      !data.subject && (
        <div
          style={{
            fontSize: "11px",
            color: "#555",
            marginTop: "5px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <strong>Parameters:</strong>{" "}
          {typeof data.parameters === "object"
            ? JSON.stringify(data.parameters).substring(0, 50) + "..."
            : data.parameters}
        </div>
      )}

    <div style={{ fontSize: "10px", color: "#777", marginTop: "5px" }}>
      Type: {data.nodeType}
    </div>

    <Handle
      type="source"
      position={Position.Bottom}
      id="output"
      style={{ background: "#555", width: 10, height: 10 }}
    />
  </div>
);

const nodeTypes = { custom: CustomNodeComponent };

const FlowChart: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [error, setError] = useState<string | null>("Tải file JSON");
  const [workflow, setWorkflow] = useState<N8nWorkflow | null>(null);
  const [filename, setFilename] = useState<string>("No file selected");

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        const newEdge: Edge = {
          id: `e-${params.source}-${params.target}`,
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle ?? undefined,
          targetHandle: params.targetHandle ?? undefined,
          type: "smoothstep",
          animated: true,
        };
        setEdges((eds) => [...eds, newEdge]);
      }
    },
    [setEdges]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setError("Chọn file JSON");
      return;
    }

    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflowData: N8nWorkflow = JSON.parse(
          e.target?.result as string
        );
        if (!workflowData.nodes || !workflowData.connections)
          throw new Error("JSON không hợp lệ");

        setWorkflow(workflowData);

        const { nodes: newNodes, edges: newEdges } =
          convertN8nToReactFlow(workflowData);

        setNodes(newNodes);
        setEdges(newEdges);
        setError(null);
      } catch (e) {
        console.error("JSON parsing error:", e);
        setError("Lỗi: File JSON không hợp lệ");
      }
    };
    reader.readAsText(file);
  };

  // const downloadWorkflowAsJson = () => {
  //   if (!workflow) return;

  //   const dataStr = JSON.stringify(workflow, null, 2);
  //   const dataUri =
  //     "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  //   const exportFileDefaultName = filename.replace(".json", "-modified.json");

  //   const linkElement = document.createElement("a");
  //   linkElement.setAttribute("href", dataUri);
  //   linkElement.setAttribute("download", exportFileDefaultName);
  //   linkElement.click();
  // };

  return (
    <ReactFlowProvider>
      <div
        style={{ height: "100vh", display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            padding: "15px",
            borderBottom: "1px solid #ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f5f5f5",
          }}
        >
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ marginRight: "15px" }}
            />
            <span style={{ fontSize: "14px", color: "#555" }}>
              {error ? (
                <span
                  style={{ color: error.startsWith("Tải") ? "#555" : "red" }}
                >
                  {error}
                </span>
              ) : (
                <span>
                  Loaded: <b>{filename}</b> ({nodes.length} nodes,{" "}
                  {edges.length} edges)
                </span>
              )}
            </span>
          </div>

          {/* <div>
            {workflow && (
              <button
                onClick={downloadWorkflowAsJson}
                style={{
                  padding: "6px 12px",
                  background: "#4285f4",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Download JSON
              </button>
            )}
          </div> */}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
};

export default FlowChart;
