import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Loader2 } from 'lucide-react';
import { employeeNotesService } from '../../services/employeeNotesService';
import type { EmployeeNote } from '../../types/employee';

interface EmployeeNotesProps {
  employeeId: string;
  currentAdminName: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function EmployeeNotes({ employeeId, currentAdminName }: EmployeeNotesProps) {
  const [notes, setNotes] = useState<EmployeeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await employeeNotesService.getNotes(employeeId);
      setNotes(data);
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError('Failed to load notes.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  async function handleAddNote() {
    const text = noteText.trim();
    if (!text) return;
    setAdding(true);
    setAddError(null);
    try {
      const created = await employeeNotesService.addNote({
        employee_id: employeeId,
        note_text: text,
        created_by_name: currentAdminName,
      });
      setNotes(prev => [created, ...prev]);
      setNoteText('');
    } catch (err) {
      console.error('Failed to add note:', err);
      setAddError('Failed to add note. Please try again.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(noteId: string) {
    setDeletingId(noteId);
    setConfirmDeleteId(null);
    try {
      await employeeNotesService.deleteNote(noteId, employeeId, currentAdminName);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h3 className="text-base font-semibold text-gray-800">Notes</h3>
      </div>

      <div className="mb-5">
        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 placeholder-gray-400"
          rows={3}
          placeholder="Add a note..."
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          disabled={adding}
        />
        {addError && (
          <p className="text-xs text-red-500 mt-1">{addError}</p>
        )}
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAddNote}
            disabled={adding || !noteText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add Note
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading notes...</span>
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 text-center py-4">{error}</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No notes yet.</p>
      ) : (
        <ul className="space-y-4">
          {notes.map(note => (
            <li
              key={note.id}
              className="border-l-2 border-blue-200 pl-4 relative group"
              onMouseEnter={() => setHoveredId(note.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note_text}</p>
              <p className="text-xs text-gray-400 mt-1">
                {note.created_by_name} • {formatDateTime(note.created_at)}
              </p>
              {hoveredId === note.id && confirmDeleteId !== note.id && (
                <button
                  onClick={() => setConfirmDeleteId(note.id)}
                  disabled={deletingId === note.id}
                  className="absolute top-0 right-0 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                  title="Delete note"
                >
                  {deletingId === note.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
              {confirmDeleteId === note.id && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Delete this note?</span>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-xs px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
