import { Handle, Position } from "reactflow";
import { NodeData, Condition } from "../interfaces/n8n";

const getNodeTypeColor = (nodeType: string) => {
  if (nodeType.includes("if")) return "#e6f3ff";
  if (nodeType.includes("googleSheets")) return "#e6ffe6";
  if (nodeType.includes("gmail")) return "#ffe6e6";
  return "#fff";
};

const CustomNode: React.FC<{ data: NodeData }> = ({ data }) => (
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

export default CustomNode;
