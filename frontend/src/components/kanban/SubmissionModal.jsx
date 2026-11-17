import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { tasksService, formatApiError } from '../../services/api';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';

export default function SubmissionModal({ isOpen, onClose, task, onSubmitted }) {
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!task) return null;

  function handleFileChange(e) {
    const selected = Array.from(e.target.files || []);
    // Validate individual file sizes (25MB limit)
    const oversized = selected.find((f) => f.size > 25 * 1024 * 1024);
    if (oversized) {
      setError(`File "${oversized.name}" exceeds the 25MB limit.`);
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...selected]);
  }

  function handleRemoveFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!notes.trim() && files.length === 0) {
      setError('Please provide submission notes or attach at least one deliverable file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }
      files.forEach((f) => {
        formData.append('files', f);
      });

      const submission = await tasksService.submit(task.id, formData);
      setNotes('');
      setFiles([]);
      onClose();
      if (onSubmitted) {
        onSubmitted(submission);
      }
    } catch (err) {
      setError(formatApiError(err, 'Failed to submit deliverable work.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Work for Review"
      description={`Deliverable: "${task.title}"`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded bg-crew-danger/10 border border-crew-danger/20 text-crew-danger text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-crew-text-secondary uppercase tracking-wider mb-1.5">
            Deliverable Notes & Summary
          </label>
          <textarea
            rows={3}
            placeholder="Describe completed work, methodologies, limitations, or testing results..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs rounded border border-crew-border bg-crew-bg/40 p-2.5 text-crew-text-primary focus:outline-none focus:ring-2 focus:ring-crew-action/20 focus:border-crew-action"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-crew-text-secondary uppercase tracking-wider mb-1.5">
            Attach Deliverable Files (PDF, DOCX, PPTX, Images, ZIP)
          </label>
          <div className="border-2 border-dashed border-crew-border rounded-lg p-4 text-center hover:bg-crew-bg/30 transition-colors cursor-pointer relative">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-6 h-6 text-crew-action mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-crew-text-primary">
              Click or drag files here to upload
            </p>
            <p className="text-[11px] text-crew-text-secondary mt-0.5">
              Maximum 25MB per file. Multi-file upload supported.
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <span className="text-[11px] font-semibold text-crew-text-secondary uppercase tracking-wider">
                Selected Attachments ({files.length})
              </span>
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-crew-bg border border-crew-border/60 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-crew-action flex-shrink-0" />
                    <span className="truncate text-crew-text-primary font-medium">{file.name}</span>
                    <span className="text-[10px] text-crew-text-secondary">
                      ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="text-crew-text-secondary hover:text-crew-danger p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-crew-border flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} icon={Upload}>
            Submit for Review
          </Button>
        </div>
      </form>
    </Modal>
  );
}

