import React, { useEffect, useRef, useState } from "react";
import styles from "./ConfirmationModal.module.css";

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
  showPasswordInput = false,
  passwordPlaceholder = "Enter admin password"
}) => {
  const modalRef = useRef(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPassword(""); 
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onCancel();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleConfirmClick = () => {
    if (showPasswordInput) {
      onConfirm(password);
    } else {
      onConfirm();
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-message"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.content}>
          <h2 id="modal-title" className={styles.title}>
            {title}
          </h2>
          <p id="modal-message" className={styles.message}>
            {message}
          </p>

          {showPasswordInput && (
            <div style={{ marginTop: "16px" }}>
              <input
                type="password"
                placeholder={passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  outline: "none",
                  backgroundColor: "var(--bg-input)",
                  transition: "border-color var(--transition-fast)"
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirmClick();
                  }
                }}
                autoFocus
              />
            </div>
          )}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnCancel}`}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${isDanger ? styles.btnDanger : styles.btnConfirm}`}
            onClick={handleConfirmClick}
            disabled={showPasswordInput && !password.trim()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
