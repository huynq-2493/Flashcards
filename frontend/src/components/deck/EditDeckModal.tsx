import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface EditDeckModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, description?: string) => void;
  loading?: boolean;
  initialName?: string;
  initialDescription?: string;
}

/**
 * T032 — Standalone Edit Deck modal.
 * Syncs local state with initialName/initialDescription whenever the modal opens.
 */
export function EditDeckModal({
  open,
  onClose,
  onSubmit,
  loading,
  initialName = '',
  initialDescription = '',
}: EditDeckModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  // Keep local state in sync when the parent re-opens the modal with fresh data
  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
    }
  }, [open, initialName, initialDescription]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Deck"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(name.trim(), description.trim() || undefined)}
            loading={loading}
            disabled={!name.trim()}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Deck name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </Modal>
  );
}
