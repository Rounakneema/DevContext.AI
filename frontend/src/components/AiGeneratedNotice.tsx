import React from "react";
import { Link } from "react-router-dom";

type Tone = "neutral" | "warn";

export default function AiGeneratedNotice(props: {
  tone?: Tone;
  note?: string;
  meta?: React.ReactNode;
  linkToFramework?: boolean;
}) {
  const tone = props.tone || "warn";
  const note =
    props.note ||
    "AI-generated content may be incomplete or incorrect. Verify against your codebase, logs, and requirements.";

  const border =
    tone === "warn" ? "rgba(230,126,34,0.35)" : "var(--border)";
  const bg = tone === "warn" ? "rgba(230,126,34,0.06)" : "var(--surface2)";
  const text = tone === "warn" ? "var(--text2)" : "var(--text3)";

  return (
    <div
      role="note"
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 12,
        background: bg,
        border: `1px solid ${border}`,
        marginTop: 10,
      }}
    >
      <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 6,
            background: "rgba(230,126,34,0.16)",
            border: "1px solid rgba(230,126,34,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            color: "#E67E22",
            flexShrink: 0,
            fontSize: 13,
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          *
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: text, lineHeight: 1.5 }}>
            {note}{" "}
            {props.linkToFramework !== false && (
              <Link
                to="/app/dashboard/framework"
                style={{
                  color: "var(--accent)",
                  textDecoration: "none",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                How we score
              </Link>
            )}
          </div>
        </div>
      </div>
      {props.meta && (
        <div
          style={{
            flexShrink: 0,
            fontSize: 12,
            color: "var(--text3)",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {props.meta}
        </div>
      )}
    </div>
  );
}

