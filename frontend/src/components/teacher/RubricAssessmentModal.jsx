import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { teacherService, formatApiError } from '../../services/api';
import {
  FileCheck,
  RotateCcw,
  Clock,
  AlertCircle,
  Award,
} from 'lucide-react';

export default function RubricAssessmentModal({
  isOpen,
  onClose,
  projectId,
  student,
  existingAssessment,
  onSaved,
  onSuccess,
}) {
  const notifySaved = onSaved || onSuccess;

  const [techScore, setTechScore] = useState(3);
  const [docScore, setDocScore] = useState(3);
  const [collabScore, setCollabScore] = useState(3);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Safely resolve student identification across different prop formats
  const resolvedStudentId =
    student?.user_id ||
    student?.student_id ||
    student?.id ||
    student?.studentId;

  const resolvedName =
    student?.full_name ||
    student?.student_name ||
    student?.name ||
    student?.studentName ||
    'Student';

  const resolvedEmail =
    student?.email ||
    student?.student_email ||
    student?.studentEmail ||
    '';

  const resolvedProjectId =
    projectId ||
    student?.project_id ||
    student?.projectId;

  // Load existing assessment values if student already has one
  useEffect(() => {
    const current = student?.assessment || existingAssessment;
    if (current) {
      setTechScore(current.technical_score ?? 3);
      setDocScore(current.documentation_score ?? 3);
      setCollabScore(current.collaboration_score ?? 3);
      setFeedback(current.feedback || '');
    } else {
      setTechScore(3);
      setDocScore(3);
      setCollabScore(3);
      setFeedback('');
    }
    setError(null);
  }, [student, existingAssessment, isOpen]);

  if (!student) return null;

  const totalScore = techScore + docScore + collabScore;

  function isValidUUID(val) {
    if (!val || typeof val !== 'string') return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val.trim());
  }

  async function handleSaveAssessment(e) {
    e.preventDefault();
    if (saving) return;

    if (!resolvedStudentId || !isValidUUID(resolvedStudentId)) {
      setError(`Cannot save assessment: Invalid or missing student UUID ("${resolvedStudentId || 'undefined'}").`);
      return;
    }

    if (!resolvedProjectId || !isValidUUID(resolvedProjectId)) {
      setError(`Cannot save assessment: Invalid or missing project UUID ("${resolvedProjectId || 'undefined'}").`);
      return;
    }

    if (techScore < 1 || techScore > 5 || docScore < 1 || docScore > 5 || collabScore < 1 || collabScore > 5) {
      setError('All rubric criteria scores must be between 1 and 5.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const cleanStudentId = resolvedStudentId.trim();
      const cleanProjectId = resolvedProjectId.trim();

      const saved = await teacherService.saveAssessment(cleanProjectId, cleanStudentId, {
        technical_score: techScore,
        documentation_score: docScore,
        collaboration_score: collabScore,
        feedback: feedback.trim() || null,
      });

      if (notifySaved) {
        notifySaved(saved, cleanStudentId);
      }
      onClose();
    } catch (err) {
      setError(formatApiError(err, 'Failed to save student assessment.'));
    } finally {
      setSaving(false);
    }
  }

  function renderScoreButtons(currentScore, setScore) {
    return (
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => setScore(val)}
            className={`w-9 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center border ${
              currentScore === val
                ? 'bg-[#181B20] text-white dark:bg-white dark:text-gray-900 border-[#181B20] shadow-sm'
                : 'bg-crew-bg hover:bg-black/5 dark:hover:bg-white/5 text-crew-text-secondary border-crew-border'
            }`}
          >
            {val}
          </button>
        ))}
      </div>
    );
  }

  const completedTasks = student?.completed_tasks_count ?? student?.completedTasks ?? 0;
  const assignedTasks = student?.assigned_tasks_count ?? student?.assignedTasks ?? 0;
  const filesCount = student?.submitted_files_count ?? student?.filesUploaded ?? 0;
  const revisionCount = student?.revision_cycles_count ?? student?.revisionLoops ?? 0;
  const reviewsCount = student?.peer_reviews_conducted ?? student?.peerReviewsDone ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Individual Rubric Assessment"
      description={`Student: ${resolvedName} (${resolvedEmail || 'No email registered'})`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSaveAssessment} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium border border-rose-200 dark:border-rose-800/40 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Verified Contribution Dossier Summary */}
        <div className="p-3.5 rounded-xl bg-crew-bg border border-crew-border space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-crew-text-tertiary block font-heading">
            Verified Contribution Evidence
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-crew-surface border border-crew-border/60">
              <span className="text-[10px] text-crew-text-secondary block">Completed</span>
              <span className="font-bold text-crew-text-primary">
                {completedTasks}/{assignedTasks}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-crew-surface border border-crew-border/60">
              <span className="text-[10px] text-crew-text-secondary block">Files Uploaded</span>
              <span className="font-bold text-crew-text-primary">
                {filesCount} {filesCount === 1 ? 'file' : 'files'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-crew-surface border border-crew-border/60">
              <span className="text-[10px] text-crew-text-secondary block">Revision Loops</span>
              <span className="font-bold text-crew-text-primary">
                {revisionCount} {revisionCount === 1 ? 'cycle' : 'cycles'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-crew-surface border border-crew-border/60">
              <span className="text-[10px] text-crew-text-secondary block">Peer Reviews</span>
              <span className="font-bold text-crew-text-primary">
                {reviewsCount} done
              </span>
            </div>
          </div>
        </div>

        {/* Total Score Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="font-heading font-bold text-xs text-amber-900 dark:text-amber-200">
              Combined Rubric Score
            </span>
          </div>
          <div className="font-mono font-extrabold text-base text-amber-700 dark:text-amber-300">
            {totalScore} / 15
          </div>
        </div>

        {/* Criterion 1: Technical Execution */}
        <div className="space-y-1.5 p-3 rounded-xl border border-crew-border bg-crew-surface">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-heading font-bold text-xs text-crew-text-primary flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-crew-action" />
                <span>1. Technical Execution & Deliverable Depth</span>
              </span>
              <p className="text-[11px] text-crew-text-secondary">
                Accuracy, rigor, completeness of submitted artifacts (1-5)
              </p>
            </div>
            {renderScoreButtons(techScore, setTechScore)}
          </div>
        </div>

        {/* Criterion 2: Documentation & Deliverable Clarity */}
        <div className="space-y-1.5 p-3 rounded-xl border border-crew-border bg-crew-surface">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-heading font-bold text-xs text-crew-text-primary flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
                <span>2. Documentation Quality & Revision Economy</span>
              </span>
              <p className="text-[11px] text-crew-text-secondary">
                Clarity of notes, minimal rejection cycles, presentation (1-5)
              </p>
            </div>
            {renderScoreButtons(docScore, setDocScore)}
          </div>
        </div>

        {/* Criterion 3: Collaboration & Timeliness */}
        <div className="space-y-1.5 p-3 rounded-xl border border-crew-border bg-crew-surface">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-heading font-bold text-xs text-crew-text-primary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. Collaboration, Punctuality & Peer Review</span>
              </span>
              <p className="text-[11px] text-crew-text-secondary">
                On-time milestones, constructive peer reviewing (1-5)
              </p>
            </div>
            {renderScoreButtons(collabScore, setCollabScore)}
          </div>
        </div>

        {/* Qualitative Feedback Textarea */}
        <div>
          <label className="block text-xs font-semibold text-crew-text-secondary uppercase tracking-wider mb-1.5">
            Teacher Written Feedback & Assessment Commentary
          </label>
          <textarea
            rows={3}
            placeholder="Provide specific, actionable feedback on this student's individual output, technical rigor, and team collaboration..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full text-xs rounded-xl border border-crew-border bg-crew-bg/40 p-2.5 text-crew-text-primary focus:outline-none focus:ring-2 focus:ring-crew-action/20 focus:border-crew-action leading-relaxed"
          />
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-crew-border flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            Save Rubric Assessment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
