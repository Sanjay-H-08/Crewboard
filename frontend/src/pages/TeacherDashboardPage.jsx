import React, { useState, useEffect, useCallback } from 'react';
import { teacherService, teamsService, formatApiError } from '../services/api';
import { formatDate } from '../utils/formatters';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  GraduationCap,
  Users,
  Clock,
  AlertTriangle,
  Plus,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';

export default function TeacherDashboardPage() {
  const [projects, setProjects] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Modals state
  const [createTopicOpen, setCreateTopicOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Create topic form state
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicDeadline, setTopicDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  // Assign team form state
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Extend deadline form state
  const [newDeadline, setNewDeadline] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [extending, setExtending] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projList, teamList] = await Promise.all([
        teacherService.listProjects(),
        teamsService.list().catch(() => []),
      ]);
      setProjects(projList || []);
      setAllTeams(teamList || []);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load teacher supervision portal.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function triggerFeedback(msg) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  }

  // Handle Create Topic
  async function handleCreateTopic(e) {
    e.preventDefault();
    if (!topicName.trim()) return;
    setCreating(true);
    try {
      await teacherService.createProject({
        name: topicName.trim(),
        description: topicDesc.trim() || null,
        deadline: topicDeadline || null,
      });
      setTopicName('');
      setTopicDesc('');
      setTopicDeadline('');
      setCreateTopicOpen(false);
      triggerFeedback('Academic project topic created successfully.');
      loadData();
    } catch (err) {
      setError(formatApiError(err, 'Failed to create academic topic.'));
    } finally {
      setCreating(false);
    }
  }

  // Handle Assign to Team
  async function handleAssignTeam(e) {
    e.preventDefault();
    if (!selectedProject || !assignTeamId) return;
    setAssigning(true);
    try {
      await teacherService.assignProject(selectedProject.id, assignTeamId);
      setAssignModalOpen(false);
      setSelectedProject(null);
      triggerFeedback('Project assigned to student team.');
      loadData();
    } catch (err) {
      setError(formatApiError(err, 'Failed to assign project.'));
    } finally {
      setAssigning(false);
    }
  }

  // Handle Extend Deadline
  async function handleExtendDeadline(e) {
    e.preventDefault();
    if (!selectedProject || !newDeadline || !extendReason.trim()) return;
    setExtending(true);
    try {
      await teacherService.extendDeadline(selectedProject.id, {
        new_deadline: newDeadline,
        reason: extendReason.trim(),
      });
      setExtendModalOpen(false);
      setSelectedProject(null);
      setNewDeadline('');
      setExtendReason('');
      triggerFeedback('Project deadline extended and logged to audit trail.');
      loadData();
    } catch (err) {
      setError(formatApiError(err, 'Failed to extend deadline.'));
    } finally {
      setExtending(false);
    }
  }

  // Handle Export CSV
  async function handleExportReport(projectId) {
    try {
      await teacherService.exportReport(projectId, 'csv');
      triggerFeedback('Report CSV exported successfully.');
    } catch (err) {
      setError(formatApiError(err, 'Failed to export CSV report.'));
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" message="Loading Teacher Supervision Portal..." />;
  }

  const totalProjects = projects.length;
  const assignedTeamsCount = new Set(projects.map((p) => p.team_id).filter(Boolean)).size;
  const totalInReview = projects.reduce((acc, p) => acc + (p.in_review_tasks || 0), 0);
  const totalOverdue = projects.reduce((acc, p) => acc + (p.overdue_tasks || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-crew-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/40">
              Teacher Supervision Command
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-crew-text-primary tracking-tight">
            Academic Project Overview
          </h1>
          <p className="text-xs sm:text-sm text-crew-text-secondary mt-1">
            Curriculum milestone assignment, team execution monitoring, deliverable reviews, and audit exports.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setCreateTopicOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#181B20] text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Academic Topic</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 text-xs font-medium animate-in fade-in">
          {feedback}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-5 rounded-2xl bg-crew-surface border border-crew-border shadow-subtle">
          <div className="flex items-center justify-between text-crew-text-secondary mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-secondary">Supervised Topics</span>
            <GraduationCap className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-crew-text-primary">{totalProjects}</span>
        </div>

        <div className="p-5 rounded-2xl bg-crew-surface border border-crew-border shadow-subtle">
          <div className="flex items-center justify-between text-crew-text-secondary mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-secondary">Assigned Teams</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-crew-text-primary">{assignedTeamsCount}</span>
        </div>

        <div className="p-5 rounded-2xl bg-crew-surface border border-crew-border shadow-subtle">
          <div className="flex items-center justify-between text-crew-text-secondary mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-secondary">Pending Reviews</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-crew-text-primary">{totalInReview}</span>
        </div>

        <div className="p-5 rounded-2xl bg-crew-surface border border-crew-border shadow-subtle">
          <div className="flex items-center justify-between text-crew-text-secondary mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-secondary">Overdue Items</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-crew-text-primary">{totalOverdue}</span>
        </div>
      </div>

      {/* Supervised Project List */}
      <div className="space-y-4">
        <h2 className="font-heading text-lg font-bold text-crew-text-primary">
          Academic Project Portfolio
        </h2>

        {projects.length === 0 ? (
          <div className="p-12 text-center bg-crew-surface border border-crew-border rounded-2xl shadow-subtle">
            <GraduationCap className="w-10 h-10 text-crew-text-tertiary mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-semibold text-crew-text-primary">No academic topics created yet</h3>
            <p className="text-xs text-crew-text-secondary mt-1">
              Create your first academic project topic and assign it to student teams.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-5 rounded-2xl bg-crew-surface border border-crew-border shadow-subtle space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-crew-bg border border-crew-border text-crew-text-secondary">
                        Team: {proj.team_name}
                      </span>
                      {proj.team_members_count > 0 && (
                        <span className="text-[11px] font-semibold text-crew-text-secondary">
                          ({proj.team_members_count} Students)
                        </span>
                      )}
                      {proj.in_review_tasks > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/40">
                          {proj.in_review_tasks} In Review
                        </span>
                      )}
                      {proj.overdue_tasks > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {proj.overdue_tasks} Overdue
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading text-lg font-bold text-crew-text-primary">
                      {proj.name}
                    </h3>
                    {proj.description && (
                      <p className="text-xs text-crew-text-secondary leading-relaxed max-w-3xl">
                        {proj.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {!proj.team_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProject(proj);
                          setAssignModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#181B20] text-white hover:bg-black dark:bg-white dark:text-gray-900 shadow-sm"
                      >
                        Assign to Team
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProject(proj);
                        setNewDeadline(proj.deadline || '');
                        setExtendModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-crew-bg hover:bg-black/5 dark:hover:bg-white/5 text-crew-text-primary border border-crew-border transition-colors flex items-center gap-1.5 shadow-subtle"
                    >
                      <Calendar className="w-3.5 h-3.5 text-crew-text-tertiary" />
                      <span>Extend Deadline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportReport(proj.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-crew-bg hover:bg-black/5 dark:hover:bg-white/5 text-crew-text-primary border border-crew-border transition-colors flex items-center gap-1.5 shadow-subtle"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-crew-text-tertiary" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Progress & Deadlines */}
                <div className="pt-3 border-t border-crew-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-4 text-crew-text-secondary flex-wrap">
                    <span>
                      Target Deadline:{' '}
                      <strong className="text-crew-text-primary">
                        {proj.deadline ? formatDate(proj.deadline) : 'None'}
                      </strong>
                    </span>
                    {proj.original_deadline && proj.original_deadline !== proj.deadline && (
                      <span className="text-[11px] text-crew-terracotta">
                        (Extended from {formatDate(proj.original_deadline)})
                      </span>
                    )}
                    <span>
                      Subtasks: <strong className="text-crew-text-primary">{proj.completed_tasks}/{proj.total_tasks}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-heading font-semibold text-crew-text-primary">
                      {proj.completion_percentage}% Completed
                    </span>
                    <div className="w-32 h-2 rounded-full bg-crew-bg overflow-hidden border border-crew-border/40">
                      <div
                        className="h-full bg-crew-action transition-all duration-300"
                        style={{ width: `${proj.completion_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Academic Topic */}
      <Modal
        isOpen={createTopicOpen}
        onClose={() => setCreateTopicOpen(false)}
        title="Create Academic Project Topic"
        description="Define an academic curriculum deliverable for student teams."
      >
        <form onSubmit={handleCreateTopic} className="space-y-4">
          <Input
            id="topic-name"
            label="Project Topic Name"
            placeholder="e.g. Battery Pack Thermal Management"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-crew-text-secondary uppercase tracking-wider mb-1.5">
              Topic Description & Learning Objectives
            </label>
            <textarea
              rows={3}
              placeholder="Outline project requirements, evaluation criteria, and expected deliverables..."
              value={topicDesc}
              onChange={(e) => setTopicDesc(e.target.value)}
              className="w-full text-xs rounded border border-crew-border bg-crew-bg/40 p-2.5 text-crew-text-primary focus:outline-none focus:ring-2 focus:ring-crew-action/20 focus:border-crew-action"
            />
          </div>
          <Input
            id="topic-deadline"
            label="Baseline Target Deadline"
            type="date"
            value={topicDeadline}
            onChange={(e) => setTopicDeadline(e.target.value)}
          />
          <div className="pt-3 border-t border-crew-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateTopicOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Topic
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assign Topic to Team */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Project to Student Team"
        description={`Topic: "${selectedProject?.name}"`}
      >
        <form onSubmit={handleAssignTeam} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-crew-text-secondary uppercase tracking-wider mb-1.5">
              Select Student Team
            </label>
            <select
              value={assignTeamId}
              onChange={(e) => setAssignTeamId(e.target.value)}
              required
              className="w-full text-xs rounded border border-crew-border bg-crew-surface p-2.5 text-crew-text-primary focus:outline-none focus:ring-2 focus:ring-crew-action/20 focus:border-crew-action"
            >
              <option value="">-- Choose Team --</option>
              {allTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Code: {t.join_code})
                </option>
              ))}
            </select>
          </div>
          <div className="pt-3 border-t border-crew-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={assigning} disabled={!assignTeamId}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Extend Deadline */}
      <Modal
        isOpen={extendModalOpen}
        onClose={() => setExtendModalOpen(false)}
        title="Extend Academic Project Deadline"
        description={`Project: "${selectedProject?.name}"`}
      >
        <form onSubmit={handleExtendDeadline} className="space-y-4">
          <Input
            id="new-deadline"
            label="New Target Deadline"
            type="date"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-crew-text-secondary uppercase tracking-wider mb-1.5">
              Justification & Academic Reason <span className="text-crew-danger">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Lab equipment calibration delayed wind tunnel testing by 10 days..."
              value={extendReason}
              onChange={(e) => setExtendReason(e.target.value)}
              required
              className="w-full text-xs rounded border border-crew-border bg-crew-bg/40 p-2.5 text-crew-text-primary focus:outline-none focus:ring-2 focus:ring-crew-action/20 focus:border-crew-action"
            />
            <span className="text-[10px] text-crew-text-secondary mt-1 block">
              This reason will be recorded in the immutable team activity audit log.
            </span>
          </div>
          <div className="pt-3 border-t border-crew-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setExtendModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={extending} disabled={!newDeadline || !extendReason.trim()}>
              Record Extension
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
