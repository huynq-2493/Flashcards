import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { decksService } from '@/services/decks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmModal } from '@/components/ui/Modal';
import { EditDeckModal } from '@/components/deck/EditDeckModal';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import { getApiError } from '@/lib/api';
import { CsvImportModal } from '@/components/card/CsvImportModal';
import type { Card, CardState } from '@/types/api';

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showImport, setShowImport] = useState(false);
  const [editingDeck, setEditingDeck] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: deck, isLoading: deckLoading } = useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => decksService.getDeck(deckId!),
    enabled: !!deckId,
  });

  const { data: cards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ['cards', deckId],
    queryFn: () => decksService.listCards(deckId!),
    enabled: !!deckId,
  });

  const updateDeckMutation = useMutation({
    mutationFn: (args: { name: string; description?: string }) =>
      decksService.updateDeck(deckId!, { name: args.name, description: args.description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deck', deckId] });
      qc.invalidateQueries({ queryKey: ['decks'] });
      setEditingDeck(false);
      toast('success', 'Deck updated');
    },
    onError: (err) => toast('error', getApiError(err)),
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => decksService.deleteCard(deckId!, cardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards', deckId] });
      qc.invalidateQueries({ queryKey: ['deck', deckId] });
      setDeletingCardId(null);
      toast('success', 'Card deleted');
    },
    onError: (err) => toast('error', getApiError(err)),
  });

  const filteredCards = cards.filter(
    (c) =>
      c.front.toLowerCase().includes(search.toLowerCase()) ||
      c.back.toLowerCase().includes(search.toLowerCase()),
  );

  const deletingCard = cards.find((c) => c.id === deletingCardId);

  if (deckLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Deck not found.</p>
        <Link to="/decks" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
          ← Back to decks
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <nav className="text-sm text-gray-400 mb-2">
          <Link to="/decks" className="hover:text-gray-600">
            Decks
          </Link>{' '}
          / <span className="text-gray-700">{deck.name}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{deck.name}</h1>
            {deck.description && <p className="text-gray-500 text-sm mt-1">{deck.description}</p>}
            <p className="text-xs text-gray-400 mt-1">{deck.cardCount} cards</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditingDeck(true)}>
              Edit Deck
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => decksService.exportDeckAsCsv(deck.id, deck.name)}
            >
              Export CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
              Import CSV
            </Button>
            <Link
              to={`/decks/${deckId}/study`}
              className="inline-flex items-center justify-center gap-1 rounded-md bg-indigo-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-indigo-700 transition-colors"
            >
              Study Now
            </Link>
          </div>
        </div>
      </div>

      {/* Search + Add card */}
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Search cards…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          size="sm"
          onClick={() => navigate(`/decks/${deckId}/cards/new`)}
        >
          + Add Card
        </Button>
      </div>

      {/* Cards table */}
      {cardsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <div className="text-4xl mb-3">🃏</div>
          <h3 className="font-semibold text-gray-700 mb-1">
            {search ? 'No cards match your search' : 'No cards yet'}
          </h3>
          {!search && (
            <p className="text-gray-400 text-sm mb-6">Add cards manually or import a CSV file</p>
          )}
          {!search && (
            <Button onClick={() => navigate(`/decks/${deckId}/cards/new`)}>
              Add first card
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Front</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Back</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">State</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCards.map((card: Card) => (
                <tr key={card.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="truncate">{card.front}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="truncate text-gray-500">{card.back}</p>
                  </td>
                  <td className="px-4 py-3">
                    <CardStateBadge state={'new' as CardState} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/decks/${deckId}/cards/${card.id}/edit`}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeletingCardId(card.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Deck Modal */}
      <EditDeckModal
        open={editingDeck}
        onClose={() => setEditingDeck(false)}
        onSubmit={(name, description) =>
          updateDeckMutation.mutate({ name, description })
        }
        loading={updateDeckMutation.isPending}
        initialName={deck.name}
        initialDescription={deck.description ?? ''}
      />

      {/* Delete card confirm */}
      <ConfirmModal
        open={!!deletingCardId}
        onClose={() => setDeletingCardId(null)}
        onConfirm={() => deletingCardId && deleteCardMutation.mutate(deletingCardId)}
        loading={deleteCardMutation.isPending}
        title="Delete Card"
        message={`Delete card "${deletingCard?.front}"? This cannot be undone.`}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        deckId={deckId!}
        onImported={() => {
          qc.invalidateQueries({ queryKey: ['cards', deckId] });
          qc.invalidateQueries({ queryKey: ['deck', deckId] });
        }}
      />
    </div>
  );
}

function CardStateBadge({ state }: { state: CardState }) {
  return <Badge variant={state}>{state}</Badge>;
}
