import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { decksService } from '@/services/decks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { getApiError } from '@/lib/api';

export default function CardEditorPage() {
  const { deckId, cardId } = useParams<{ deckId: string; cardId?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEditing = !!cardId;

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [frontError, setFrontError] = useState('');
  const [backError, setBackError] = useState('');

  // Load existing card if editing
  const { data: cards } = useQuery({
    queryKey: ['cards', deckId],
    queryFn: () => decksService.listCards(deckId!),
    enabled: isEditing && !!deckId,
  });

  useEffect(() => {
    if (isEditing && cards) {
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        setFront(card.front);
        setBack(card.back);
        setTagsInput(card.tags.join(', '));
      }
    }
  }, [isEditing, cards, cardId]);

  const createMutation = useMutation({
    mutationFn: () => {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      return decksService.createCard(deckId!, front.trim(), back.trim(), tags);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards', deckId] });
      qc.invalidateQueries({ queryKey: ['deck', deckId] });
      toast('success', 'Card created!');
      navigate(`/decks/${deckId}`);
    },
    onError: (err) => toast('error', getApiError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      return decksService.updateCard(deckId!, cardId!, {
        front: front.trim(),
        back: back.trim(),
        tags,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards', deckId] });
      toast('success', 'Card updated!');
      navigate(`/decks/${deckId}`);
    },
    onError: (err) => toast('error', getApiError(err)),
  });

  const validate = () => {
    let valid = true;
    if (!front.trim()) {
      setFrontError('Front side is required');
      valid = false;
    } else if (front.length > 1000) {
      setFrontError('Max 1000 characters');
      valid = false;
    } else {
      setFrontError('');
    }

    if (!back.trim()) {
      setBackError('Back side is required');
      valid = false;
    } else if (back.length > 1000) {
      setBackError('Max 1000 characters');
      valid = false;
    } else {
      setBackError('');
    }
    return valid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (isEditing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <nav className="text-sm text-gray-400 mb-2">
          <Link to="/decks" className="hover:text-gray-600">
            Decks
          </Link>{' '}
          /{' '}
          <Link to={`/decks/${deckId}`} className="hover:text-gray-600">
            Deck
          </Link>{' '}
          / <span className="text-gray-700">{isEditing ? 'Edit Card' : 'New Card'}</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Card' : 'Add New Card'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Front <span className="text-gray-400 font-normal">(question / prompt)</span>
          </label>
          <textarea
            value={front}
            onChange={(e) => {
              setFront(e.target.value);
              setFrontError('');
            }}
            rows={4}
            maxLength={1000}
            placeholder="e.g. What is the capital of France?"
            className={[
              'w-full rounded-md border px-3 py-2 text-sm shadow-sm resize-none',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'placeholder:text-gray-400',
              frontError ? 'border-red-500' : 'border-gray-300',
            ].join(' ')}
          />
          <div className="flex justify-between mt-1">
            {frontError ? (
              <p className="text-xs text-red-600">{frontError}</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-gray-400">{front.length}/1000</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Back <span className="text-gray-400 font-normal">(answer)</span>
          </label>
          <textarea
            value={back}
            onChange={(e) => {
              setBack(e.target.value);
              setBackError('');
            }}
            rows={4}
            maxLength={1000}
            placeholder="e.g. Paris"
            className={[
              'w-full rounded-md border px-3 py-2 text-sm shadow-sm resize-none',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'placeholder:text-gray-400',
              backError ? 'border-red-500' : 'border-gray-300',
            ].join(' ')}
          />
          <div className="flex justify-between mt-1">
            {backError ? (
              <p className="text-xs text-red-600">{backError}</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-gray-400">{back.length}/1000</p>
          </div>
        </div>

        <Input
          label="Tags (optional)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="vocabulary, chapter-1, important"
          hint="Comma-separated tags"
        />

        {/* Preview */}
        {(front || back) && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Preview</p>
            <div className="bg-white rounded-lg border p-4 text-sm">
              <p className="text-gray-400 text-xs mb-1">Front</p>
              <p className="text-gray-900 whitespace-pre-wrap">{front || '—'}</p>
            </div>
            <div className="bg-white rounded-lg border p-4 text-sm">
              <p className="text-gray-400 text-xs mb-1">Back</p>
              <p className="text-gray-900 whitespace-pre-wrap">{back || '—'}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/decks/${deckId}`)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEditing ? 'Save Changes' : 'Create Card'}
          </Button>
        </div>
      </form>
    </div>
  );
}
