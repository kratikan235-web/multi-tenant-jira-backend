import React from "react";

export function Toast({
  kind,
  children
}: {
  kind: "error" | "ok" | "info";
  children: React.ReactNode;
}) {
  const style: React.CSSProperties =
    kind === "error"
      ? { borderColor: "rgba(255, 91, 107, 0.4)", background: "rgba(255, 91, 107, 0.10)" }
      : kind === "ok"
        ? { borderColor: "rgba(34, 197, 94, 0.35)", background: "rgba(34, 197, 94, 0.10)" }
        : { borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" };

  return (
    <div className="card" style={{ ...style, boxShadow: "none" }}>
      <div className="cardBody" style={{ padding: 12 }}>
        {children}
      </div>
    </div>
  );
}

