import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CreateDeckModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, description?: string) => void;
  loading?: boolean;
}

/**
 * T032 — Standalone Create Deck modal.
 * Uses plain React state (no external form library).
 */
export function CreateDeckModal({ open, onClose, onSubmit, loading }: CreateDeckModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim(), description.trim() || undefined);
    setName('');
    setDescription('');
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create New Deck"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!name.trim()}>
            Create
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Deck name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Spanish Vocabulary"
          autoFocus
          required
        />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What will you learn?"
        />
      </div>
    </Modal>
  );
}
