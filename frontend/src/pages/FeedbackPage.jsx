import React, { useState, useEffect } from 'react';
import { projectsService, tasksService, formatApiError } from '../services/api';
import { formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  Award,
  MessageSquare,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

export default function FeedbackPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      projectsService.list().catch(() => []),
      tasksService.getMySubmissions().catch(() => []),
    ])
      .then(([projs, subs]) => {
        if (!active) return;
        setProjects(projs || []);
        setSubmissions(subs || []);
        if (projs && projs.length > 0) {
          setSelectedProjectId(projs[0].id);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(formatApiError(err, 'Failed to load feedback records.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setAssessment(null);
      return;
    }
    projectsService
      .getMyAssessment(selectedProjectId)
      .then((data) => setAssessment(data))
      .catch(() => setAssessment(null));
  }, [selectedProjectId]);

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" message="Loading your evaluations and feedback..." />;
  }

  const reviewedSubmissions = submissions.filter((s) => Boolean(s.review_feedback));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-crew-border/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
            My Learning
          </span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-crew-text-primary tracking-tight">
          Feedback & Reviews
        </h1>
        <p className="text-xs sm:text-sm text-crew-text-secondary mt-1">
          Teacher rubric assessments and peer review audit feedback
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
          {error}
        </div>
      )}

      {/* Project Selector if multiple */}
      {projects.length > 0 && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle text-xs">
          <span className="font-semibold text-crew-text-primary">Project Scope:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-xl border border-crew-border bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-crew-text-primary font-medium"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 1. Official Faculty Rubric Assessment Card */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600" />
          <h2 className="font-heading font-bold text-sm text-crew-text-primary uppercase tracking-wider">
            Official Teacher Rubric Assessment
          </h2>
        </div>

        {assessment ? (
          <div className="p-6 rounded-2xl bg-gradient-to-b from-white to-emerald-50/20 dark:from-[#14171E] dark:to-[#162620] border border-emerald-200/90 dark:border-emerald-800/60 shadow-subtle space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-100 dark:border-emerald-900/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-crew-text-primary">
                    Evaluated by {assessment.teacher_name || 'Faculty Supervisor'}
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Evaluation
                  </span>
                </div>
                <div className="text-xs text-crew-text-tertiary font-mono">
                  Assessment recorded on {formatDate(assessment.updated_at || assessment.created_at)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-center">
                  <div className="font-heading font-extrabold text-xl leading-none">
                    {assessment.total_rubric_score} <span className="text-xs font-normal">/ 15</span>
                  </div>
                  <span className="text-[10px] font-semibold tracking-wider uppercase block mt-1">
                    Total Rubric Score
                  </span>
                </div>
              </div>
            </div>

            {/* Rubric Dimension Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-crew-border space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-crew-text-primary">Technical Execution</span>
                  <span className="font-mono font-bold text-indigo-600 text-sm">{assessment.technical_score}/5</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(assessment.technical_score / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-crew-text-tertiary block">
                  Completeness, code quality, and technical deliverables
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-crew-border space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-crew-text-primary">Documentation</span>
                  <span className="font-mono font-bold text-teal-600 text-sm">{assessment.documentation_score}/5</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${(assessment.documentation_score / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-crew-text-tertiary block">
                  Architecture writeup, clarity, and structural rigor
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-crew-border space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-crew-text-primary">Collaboration & Punctuality</span>
                  <span className="font-mono font-bold text-purple-600 text-sm">{assessment.collaboration_score}/5</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{ width: `${(assessment.collaboration_score / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-crew-text-tertiary block">
                  Punctual delivery, teamwork, and peer review audits
                </span>
              </div>
            </div>

            {/* Written Feedback Callout */}
            {assessment.feedback && (
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/40 space-y-1.5 text-xs">
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                  Faculty Qualitative Assessment & Recommendations
                </span>
                <p className="text-crew-text-primary leading-relaxed whitespace-pre-wrap italic text-sm">
                  "{assessment.feedback}"
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 text-xs text-crew-text-secondary space-y-2">
            <UserCheck className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="font-semibold text-crew-text-primary">No Rubric Assessment Recorded Yet</div>
            <p className="text-[11px] text-crew-text-tertiary max-w-sm mx-auto">
              Your instructor has not submitted a formal rubric evaluation for this project topic yet. As your group completes deliverables, your score will appear here.
            </p>
          </div>
        )}
      </div>

      {/* 2. Peer Review Audit Comments */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-600" />
          <h2 className="font-heading font-bold text-sm text-crew-text-primary uppercase tracking-wider">
            Teammate Peer Review Comments ({reviewedSubmissions.length})
          </h2>
        </div>

        {reviewedSubmissions.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 text-xs text-crew-text-secondary italic">
            No peer review comments recorded on your submitted deliverables yet.
          </div>
        ) : (
          <div className="space-y-3">
            {reviewedSubmissions.map((sub) => (
              <div
                key={sub.submission_id}
                className="p-4 rounded-2xl bg-white dark:bg-[#14171E] border border-purple-200/70 dark:border-purple-800/40 shadow-subtle space-y-2 text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-purple-100 dark:border-purple-900/40">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-crew-text-primary">{sub.task_title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                      v{sub.version}
                    </span>
                  </div>
                  <span className="text-[11px] text-crew-text-tertiary font-mono">
                    {sub.reviewer_name ? `Audited by ${sub.reviewer_name}` : 'Peer Review'} · {formatDate(sub.reviewed_at || sub.created_at)}
                  </span>
                </div>
                <p className="text-crew-text-primary italic leading-relaxed">
                  "{sub.review_feedback}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
