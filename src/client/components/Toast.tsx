export const Toast = ({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) => {
  if (!message) {
    return null;
  }

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__text">{message}</span>
      <button type="button" className="toast__close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
};
