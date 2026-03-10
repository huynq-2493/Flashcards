import { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { decksService } from '@/services/decks';
import { toast } from '@/components/ui/Toast';
import { getApiError } from '@/lib/api';
import type { ImportResult } from '@/types/api';

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  deckId: string;
  onImported: () => void;
}

export function CsvImportModal({ open, onClose, deckId, onImported }: CsvImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await decksService.importCsv(deckId, file);
      setResult(res);
      onImported();
      toast('success', `Imported ${res.imported} cards`);
    } catch (err) {
      toast('error', getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Cards from CSV"
      footer={
        result ? (
          <Button onClick={handleClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleImport} loading={loading} disabled={!file}>
              Import
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm font-medium text-green-700">
              ✓ Import complete: {result.imported} cards imported
            </p>
            {result.skipped > 0 && (
              <p className="text-xs text-green-600 mt-1">{result.skipped} rows skipped</p>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-1">
              <p className="text-sm font-medium text-red-700">Errors ({result.errors.length}):</p>
              {result.errors.slice(0, 5).map((e) => (
                <p key={e.row} className="text-xs text-red-600">
                  Row {e.row}: {e.message}
                </p>
              ))}
              {result.errors.length > 5 && (
                <p className="text-xs text-red-400">…and {result.errors.length - 5} more</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">CSV format requirements:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Two columns: <code>front</code> and <code>back</code></li>
              <li>First row must be headers</li>
              <li>Maximum 500 rows per import</li>
              <li>Max 1000 characters per field</li>
            </ul>
          </div>

          <div
            className={[
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              file ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-gray-400',
            ].join(' ')}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <p className="text-sm font-medium text-indigo-700">✓ {file.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB — Click to change
                </p>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">📂</div>
                <p className="text-sm text-gray-600 font-medium">Click to select CSV file</p>
                <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
