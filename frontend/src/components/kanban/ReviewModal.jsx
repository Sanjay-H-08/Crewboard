import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { tasksService, filesService, formatApiError } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import { CheckCircle2, RotateCcw, Download, FileText, AlertCircle, Clock } from 'lucide-react';

export default function ReviewModal({ isOpen, onClose, task, onReviewed, onSuccess }) {
  const [feedback, setFeedback] = useState('');
  const [loadingDecision, setLoadingDecision] = useState(null); // 'approved' | 'changes_requested' | null
  const [error, setError] = useState(null);

  if (!task) return null;

  const notifyReviewed = onReviewed || onSuccess;

  const submission = task.latest_submission;

  async function handleDecision(decision) {
    if (!feedback.trim()) {
      setError('Evaluation feedback is required to record a formal review decision.');
      return;
    }

    setLoadingDecision(decision);
    setError(null);

    try {
      const updatedTask = await tasksService.review(task.id, {
        decision,
        feedback: feedback.trim(),
      });
      setFeedback('');
      onClose();
      if (notifyReviewed) {
        notifyReviewed(updatedTask);
      }
    } catch (err) {
      setError(formatApiError(err, 'Failed to record review decision.'));
    } finally {
      setLoadingDecision(null);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Deliverable Submission"
      description={`Task: "${task.title}" (Version ${submission?.version || 1})`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded bg-crew-danger/10 border border-crew-danger/20 text-crew-danger text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submission Metadata */}
        <div className="p-3 rounded-md bg-crew-bg border border-crew-border/60 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-crew-text-primary">
              Submitted by: {submission?.submitter_name || task.assignee_name || 'Team Member'}
            </span>
            <span className="text-[11px] text-crew-text-secondary flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {submission?.created_at ? formatDate(submission.created_at) : 'Recently'}
            </span>
          </div>
          {submission?.notes && (
            <div className="pt-2 border-t border-crew-border/40">
              <span className="text-[10px] font-semibold text-crew-text-secondary uppercase tracking-wider block mb-0.5">
                Student Notes:
              </span>
              <p className="text-xs text-crew-text-primary leading-relaxed bg-crew-surface p-2 rounded border border-crew-border/40">
                {submission.notes}
              </p>
            </div>
          )}
        </div>

        {/* Deliverable File Attachments */}
        <div>
          <label className="block text-xs font-semibold text-crew-text-secondary uppercase tracking-wider mb-1.5">
            Submitted Deliverables ({submission?.files?.length || 0})
          </label>
          {!submission?.files || submission.files.length === 0 ? (
            <p className="text-xs text-crew-text-secondary italic">
              No digital files attached to this submission.
            </p>
          ) : (
            <div className="space-y-1.5">
              {submission.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2.5 rounded bg-crew-surface border border-crew-border text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-crew-action flex-shrink-0" />
                    <span className="truncate font-medium text-crew-text-primary">
                      {file.original_filename}
                    </span>
                    <span className="text-[10px] text-crew-text-secondary">
                      ({(file.file_size_bytes / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => filesService.downloadFile(file.id, file.original_filename)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-crew-bg hover:bg-crew-sand/20 text-crew-action font-semibold border border-crew-border transition-colors flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review Feedback Form */}
        <div>
          <label className="block text-xs font-semibold text-crew-text-secondary uppercase tracking-wider mb-1.5">
            Reviewer Feedback <span className="text-crew-danger">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Specify verification results, required adjustments, or approval comments..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full text-xs rounded border border-crew-border bg-crew-bg/40 p-2.5 text-crew-text-primary focus:outline-none focus:ring-2 focus:ring-crew-action/20 focus:border-crew-action"
          />
        </div>

        {/* Decision Actions */}
        <div className="pt-3 border-t border-crew-border flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={Boolean(loadingDecision)}
              onClick={() => handleDecision('changes_requested')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-crew-warning/10 text-crew-warning hover:bg-crew-warning/20 border border-crew-warning/30 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {loadingDecision === 'changes_requested' ? 'Recording...' : 'Request Changes'}
            </button>
            <button
              type="button"
              disabled={Boolean(loadingDecision)}
              onClick={() => handleDecision('approved')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-crew-success text-white hover:bg-crew-success/90 shadow-subtle transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {loadingDecision === 'approved' ? 'Approving...' : 'Approve & Complete'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

