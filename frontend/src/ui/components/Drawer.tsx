import React, { useEffect } from "react";
import "./Drawer.css";

export function Drawer({
  open,
  title,
  onClose,
  children,
  footer
}: {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="drawerOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div />
      <div className="drawerPanel" role="dialog" aria-modal="true">
        <div className="drawerHeader">
          <div className="drawerTitle">{title}</div>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="drawerBody">{children}</div>
        {footer ? <div className="drawerFooter">{footer}</div> : null}
      </div>
    </div>
  );
}

