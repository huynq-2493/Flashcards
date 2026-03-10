import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { decksService } from '@/services/decks';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { CreateDeckModal } from '@/components/deck/CreateDeckModal';
import { toast } from '@/components/ui/Toast';
import { getApiError } from '@/lib/api';
import type { Deck } from '@/types/api';

function DeckCard({ deck, onDelete }: { deck: Deck; onDelete: (id: string) => void }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/decks/${deck.id}`} className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate hover:text-indigo-600 transition-colors">
            {deck.name}
          </h3>
          {deck.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{deck.description}</p>
          )}
        </Link>
        <button
          onClick={() => onDelete(deck.id)}
          className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
          title="Delete deck"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="flex gap-3 text-xs text-gray-500">
        <span>{deck.cardCount} cards</span>
        {(deck.dueCount ?? 0) > 0 && (
          <span className="text-indigo-600 font-medium">{deck.dueCount} due</span>
        )}
      </div>

      <div className="flex gap-2 mt-auto">
        <Link
          to={`/decks/${deck.id}/study`}
          className="flex-1 inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-2 hover:bg-indigo-700 transition-colors"
        >
          Study
        </Link>
        <Link
          to={`/decks/${deck.id}`}
          className="flex-1 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 text-sm font-medium px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}

export default function DeckListPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: decks = [], isLoading } = useQuery({
    queryKey: ['decks'],
    queryFn: () => decksService.listDecks(),
  });

  const createMutation = useMutation({
    mutationFn: (args: { name: string; description?: string }) =>
      decksService.createDeck(args.name, args.description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decks'] });
      setShowCreate(false);
      toast('success', 'Deck created!');
    },
    onError: (err) => toast('error', getApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => decksService.deleteDeck(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decks'] });
      setDeletingId(null);
      toast('success', 'Deck deleted');
    },
    onError: (err) => toast('error', getApiError(err)),
  });

  const deletingDeck = decks.find((d) => d.id === deletingId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Decks</h1>
          <p className="text-gray-500 text-sm mt-1">{decks.length} deck{decks.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New Deck</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-gray-100 animate-pulse h-40" />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="font-semibold text-gray-700 mb-1">No decks yet</h3>
          <p className="text-gray-400 text-sm mb-6">Create your first deck to start learning</p>
          <Button onClick={() => setShowCreate(true)}>Create a deck</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} onDelete={setDeletingId} />
          ))}
        </div>
      )}

      {/* Create modal */}
      <CreateDeckModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(name, description) => {
          createMutation.mutate({ name, description });
        }}
        loading={createMutation.isPending}
      />

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        loading={deleteMutation.isPending}
        title="Delete Deck"
        message={`Are you sure you want to delete "${deletingDeck?.name}"? This will permanently delete all cards and progress.`}
      />
    </div>
  );
}
