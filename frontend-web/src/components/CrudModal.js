import React, { useEffect } from "react";

function CrudModal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="crud-modal-backdrop" onClick={handleBackdropClick}>
      <div className="crud-modal" role="dialog" aria-modal="true">
        <div className="crud-modal__header">
          <h3>{title}</h3>
          <button
            type="button"
            className="crud-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="crud-modal__body">{children}</div>
      </div>
    </div>
  );
}

export default CrudModal;
