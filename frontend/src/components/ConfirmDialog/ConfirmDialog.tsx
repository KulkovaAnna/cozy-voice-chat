import { useEffect, useState } from "react";

import { Button, type ButtonVariant } from "../Button";
import * as Styles from "./ConfirmDialog.styles";

export interface ConfirmDialogAction {
  label: string;
  variant?: ButtonVariant;
  proportion?: 1 | 2;
  onClick: () => void | Promise<void>;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  /** Кнопки в порядке слева направо. */
  actions: ConfirmDialogAction[];
  /** Закрыть диалог: Escape или клик по затемнению. */
  onDismiss?: () => void;
}

/**
 * Подтверждающий диалог с произвольным набором кнопок.
 *
 * Асинхронное действие блокирует кнопки до своего завершения, а Escape и клик
 * по затемнению отдают решение наружу через `onDismiss`.
 */
export const ConfirmDialog = (props: ConfirmDialogProps) => {
  const { isOpen, title, description, actions, onDismiss } = props;
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !onDismiss) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  const runAction = async (action: ConfirmDialogAction) => {
    setPendingLabel(action.label);

    try {
      await action.onClick();
    } finally {
      setPendingLabel(null);
    }
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onDismiss?.();
  };

  return (
    <Styles.Overlay role="presentation" onClick={handleOverlayClick}>
      <Styles.Dialog role="dialog" aria-modal="true" aria-label={title}>
        <Styles.Title>{title}</Styles.Title>
        {description && <Styles.Description>{description}</Styles.Description>}
        <Styles.Buttons>
          {actions.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant={action.variant}
              disabled={pendingLabel !== null}
              onClick={() => runAction(action)}
              style={{
                gridColumn: `span ${action.proportion ?? 1}`,
                maxWidth: "unset",
              }}
            >
              {action.label}
            </Button>
          ))}
        </Styles.Buttons>
      </Styles.Dialog>
    </Styles.Overlay>
  );
};
