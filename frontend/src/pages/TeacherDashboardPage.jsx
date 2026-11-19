import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teacherService, teamsService, formatApiError } from '../services/api';
import { formatDate } from '../utils/formatters';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';
import RubricAssessmentModal from '../components/teacher/RubricAssessmentModal';
import TeacherVisualAnalytics from '../components/teacher/TeacherVisualAnalytics';
import AcademicReportModal from '../components/teacher/AcademicReportModal';
import SubmissionsDocumentsViewer from '../components/teacher/SubmissionsDocumentsViewer';
import {
  GraduationCap,
  Users,
  Clock,
  AlertTriangle,
  Plus,
  Calendar,
  FileSpreadsheet,
  Award,
  Download,
  ChevronDown,
  Edit3,
  Printer,
  FileText,
  BarChart3,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function TeacherDashboardPage({ initialView = 'overview' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') || initialView;

  const [projects, setProjects] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Modals state
  const [createTopicOpen, setCreateTopicOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Rubric Assessment state
  const [selectedProjectForAssessment, setSelectedProjectForAssessment] = useState('');
  const [contributionsData, setContributionsData] = useState(null);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [studentToAssess, setStudentToAssess] = useState(null);

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
      const [projList, teamList, subList] = await Promise.all([
        teacherService.listProjects(),
        teamsService.list().catch(() => []),
        teacherService.listSubmissions().catch(() => []),
      ]);
      setProjects(projList || []);
      setAllTeams(teamList || []);
      setSubmissions(subList || []);

      const firstAssigned = (projList || []).find((p) => Boolean(p.team_id));
      if (firstAssigned && !selectedProjectForAssessment) {
        setSelectedProjectForAssessment(firstAssigned.id);
      }
    } catch (err) {
      setError(formatApiError(err, 'Failed to load teacher supervision portal.'));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectForAssessment]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load contribution & assessment dossier for selected project
  const loadContributions = useCallback(async (projId) => {
    if (!projId) {
      setContributionsData(null);
      return;
    }
    setLoadingContributions(true);
    try {
      const data = await teacherService.getContributions(projId);
      setContributionsData(data);
    } catch {
      setContributionsData(null);
    } finally {
      setLoadingContributions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectForAssessment) {
      loadContributions(selectedProjectForAssessment);
    }
  }, [selectedProjectForAssessment, loadContributions]);

  function triggerFeedback(msg) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  }

  function setView(viewName) {
    setSearchParams({ view: viewName });
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

  // Handle open student rubric assessment
  function handleOpenAssessment(student) {
    if (!student) {
      setError('Student information is unavailable for assessment.');
      return;
    }

    const studentId =
      student.user_id ||
      student.student_id ||
      student.studentId ||
      student.id;

    if (!studentId) {
      setError('Cannot assess student: student ID is missing or invalid.');
      return;
    }

    const targetProjId =
      student.project_id ||
      student.projectId ||
      selectedProjectForAssessment;

    if (targetProjId && targetProjId !== selectedProjectForAssessment) {
      setSelectedProjectForAssessment(targetProjId);
    }

    // Enrich with telemetry from contributionsData if available
    let enriched = { ...student };
    if (contributionsData?.students) {
      const found = contributionsData.students.find((s) => s.user_id === studentId);
      if (found) {
        enriched = {
          ...found,
          ...student,
          assessment: found.assessment || student.assessment,
        };
      }
    }

    enriched.user_id = studentId;
    enriched.student_id = studentId;
    enriched.full_name =
      enriched.full_name ||
      student.student_name ||
      student.studentName ||
      student.name ||
      'Student';
    enriched.email =
      enriched.email ||
      student.student_email ||
      student.studentEmail ||
      '';
    enriched.project_id = targetProjId;

    setStudentToAssess(enriched);
    setAssessmentModalOpen(true);
  }

  // Handle assessment saved callback
  function handleAssessmentSaved(savedAssessment, studentId) {
    if (contributionsData) {
      setContributionsData((prev) => {
        if (!prev) return prev;
        const updatedStudents = prev.students.map((st) => {
          if (st.user_id === studentId || st.student_id === studentId) {
            return {
              ...st,
              assessment: savedAssessment,
            };
          }
          return st;
        });
        return {
          ...prev,
          students: updatedStudents,
        };
      });
    }

    // Refresh contributions to update team score distributions and class analytics
    if (selectedProjectForAssessment) {
      loadContributions(selectedProjectForAssessment);
    }

    triggerFeedback('Student rubric assessment saved successfully.');
  }

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" message="Loading Teacher Supervision Portal..." />;
  }

  const totalProjects = projects.length;
  const assignedProjects = projects.filter((p) => Boolean(p.team_id));
  const assignedTeamsCount = new Set(assignedProjects.map((p) => p.team_id)).size;
  const totalInReview = projects.reduce((acc, p) => acc + (p.in_review_tasks || 0), 0);
  const totalOverdue = projects.reduce((acc, p) => acc + (p.overdue_tasks || 0), 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: GraduationCap },
    { id: 'projects', label: 'Assigned Projects', icon: Layers },
    { id: 'submissions', label: 'Submissions & Documents', icon: FileText, badge: submissions.length },
    { id: 'contributions', label: 'Student Contributions & Rubrics', icon: Award },
    { id: 'analytics', label: 'Class & Team Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Academic Reports', icon: Printer },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-crew-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/40">
              Instructor Supervision Portal
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-crew-text-primary tracking-tight">
            Academic Assessment & Deliverables Console
          </h1>
          <p className="text-xs sm:text-sm text-crew-text-secondary mt-1 max-w-2xl">
            Supervise team assignment milestones, examine verified deliverable documents, and evaluate rubric performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button
            onClick={() => setReportModalOpen(true)}
            variant="outline"
            size="sm"
            icon={Printer}
            disabled={!selectedProjectForAssessment}
          >
            Academic Report
          </Button>
          <Button onClick={() => setCreateTopicOpen(true)} size="sm" icon={Plus}>
            New Topic
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 text-xs font-medium animate-in fade-in flex items-center justify-between">
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* 2. Primary Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-crew-border/60">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id || (tab.id === 'contributions' && currentView === 'assessments') || (tab.id === 'projects' && currentView === 'teams');
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? 'bg-[#181B20] text-white dark:bg-white dark:text-gray-900 shadow-sm'
                  : 'text-crew-text-secondary hover:text-crew-text-primary hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white dark:bg-black/20 dark:text-gray-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* VIEW: OVERVIEW                                                      */}
      {/* =================================================================== */}
      {currentView === 'overview' && (
        <div className="space-y-6">
          {/* Key Supervision Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-1">
              <div className="flex items-center justify-between text-crew-text-secondary mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-secondary font-heading">
                  Supervised Topics
                </span>
                <GraduationCap className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-crew-text-primary">{totalProjects}</span>
              <p className="text-[11px] text-crew-text-tertiary">{assignedProjects.length} assigned to teams</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-1">
              <div className="flex items-center justify-between text-crew-text-secondary mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-secondary font-heading">
                  Active Teams
                </span>
                <Users className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-crew-text-primary">{assignedTeamsCount}</span>
              <p className="text-[11px] text-crew-text-tertiary">Shared group assignments</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-1">
              <div className="flex items-center justify-between text-crew-text-secondary mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-secondary font-heading">
                  Pending Reviews
                </span>
                <Clock className="w-4 h-4 text-sky-500" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-crew-text-primary">{totalInReview}</span>
              <p className="text-[11px] text-crew-text-tertiary">Deliverables submitted</p>
            </div>

            <div
              className={`p-5 rounded-2xl border shadow-subtle space-y-1 ${
                totalOverdue > 0
                  ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                  : 'bg-white dark:bg-[#14171E] border-crew-border/90'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider font-heading ${
                    totalOverdue > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-crew-text-secondary'
                  }`}
                >
                  Overdue Milestones
                </span>
                <AlertTriangle
                  className={`w-4 h-4 ${totalOverdue > 0 ? 'text-rose-600 animate-pulse' : 'text-crew-text-tertiary'}`}
                />
              </div>
              <span
                className={`text-2xl sm:text-3xl font-bold ${
                  totalOverdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-crew-text-primary'
                }`}
              >
                {totalOverdue}
              </span>
              <p className="text-[11px] text-crew-text-tertiary">
                {totalOverdue > 0 ? 'Requires deadline review' : 'All milestones on schedule'}
              </p>
            </div>
          </div>

          {/* Quick Workflow Action Banners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setView('submissions')}
              className="p-5 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white cursor-pointer hover:shadow-card hover:-translate-y-0.5 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <FileText className="w-6 h-6 text-purple-200" />
                <ArrowRight className="w-4 h-4 text-purple-200" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base">Submissions & Documents</h3>
                <p className="text-xs text-purple-100 mt-0.5">
                  Inspect student files, PDFs, images, and revision versions ({submissions.length} total).
                </p>
              </div>
            </div>

            <div
              onClick={() => setView('contributions')}
              className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white cursor-pointer hover:shadow-card hover:-translate-y-0.5 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <Award className="w-6 h-6 text-emerald-200" />
                <ArrowRight className="w-4 h-4 text-emerald-200" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base">Rubric Assessment Console</h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Evaluate individual student contributions with 3-dimension rubric criteria.
                </p>
              </div>
            </div>

            <div
              onClick={() => setView('analytics')}
              className="p-5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white cursor-pointer hover:shadow-card hover:-translate-y-0.5 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <BarChart3 className="w-6 h-6 text-blue-200" />
                <ArrowRight className="w-4 h-4 text-blue-200" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base">Class Visual Analytics</h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Cross-team progress charts, deadline risk indicators, and rubric distributions.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Team Comparison Snapshot */}
          <div className="bg-white dark:bg-[#14171E] border border-crew-border/90 rounded-2xl p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-crew-border/60">
              <div>
                <h2 className="font-heading text-base font-bold text-crew-text-primary tracking-tight">
                  Team Progress Snapshot
                </h2>
                <p className="text-xs text-crew-text-secondary">
                  Cross-team milestone progress and deliverables completion rate
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView('projects')}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                View All Projects →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignedProjects.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-crew-border bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-crew-text-primary truncate block">{p.team_name}</span>
                    <span className="text-[11px] text-crew-text-secondary truncate block">{p.name}</span>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${p.completion_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 font-mono">
                    <span className="font-bold text-crew-text-primary block">{p.completion_percentage || 0}%</span>
                    <span className="text-[10px] text-crew-text-tertiary">{p.completed_tasks}/{p.total_tasks} done</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW: SUBMISSIONS & DOCUMENTS                                       */}
      {/* =================================================================== */}
      {currentView === 'submissions' && (
        <SubmissionsDocumentsViewer
          submissions={submissions}
          projects={projects}
          selectedProjectId={selectedProjectForAssessment}
          onSelectProject={setSelectedProjectForAssessment}
          onOpenRubricModal={handleOpenAssessment}
        />
      )}

      {/* =================================================================== */}
      {/* VIEW: VISUAL ANALYTICS                                              */}
      {/* =================================================================== */}
      {currentView === 'analytics' && (
        <TeacherVisualAnalytics
          projects={projects}
          selectedProjectId={selectedProjectForAssessment}
          onSelectProject={(projId) => setSelectedProjectForAssessment(projId)}
          contributionsData={contributionsData}
          submissions={submissions}
        />
      )}

      {/* =================================================================== */}
      {/* VIEW: CONTRIBUTIONS & RUBRIC ASSESSMENTS                            */}
      {/* =================================================================== */}
      {(currentView === 'contributions' || currentView === 'assessments') && (
        <div className="bg-white dark:bg-[#14171E] border border-crew-border/90 rounded-2xl p-6 shadow-subtle space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-crew-border/60">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h2 className="font-heading text-base sm:text-lg font-bold text-crew-text-primary tracking-tight">
                  Individual Contribution & Rubric Assessment Console
                </h2>
              </div>
              <p className="text-xs text-crew-text-secondary mt-0.5">
                Evaluate each individual student within their assigned team using verified deliverables, revision history, and rubric criteria.
              </p>
            </div>

            {/* Project / Team Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-crew-text-secondary">Project:</span>
              <div className="relative">
                <select
                  value={selectedProjectForAssessment}
                  onChange={(e) => setSelectedProjectForAssessment(e.target.value)}
                  className="text-xs rounded-xl border border-crew-border bg-slate-50 dark:bg-slate-900 px-3 py-1.5 pr-8 text-crew-text-primary font-semibold focus:outline-none appearance-none"
                >
                  <option value="">-- Choose Team Assignment --</option>
                  {assignedProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.team_name} — {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-crew-text-tertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {loadingContributions ? (
            <div className="py-12 text-center text-xs text-crew-text-secondary">
              Loading verified contribution evidence and rubric assessments...
            </div>
          ) : !contributionsData || contributionsData.students.length === 0 ? (
            <div className="py-10 text-center text-xs text-crew-text-secondary space-y-1.5 italic">
              <Users className="w-8 h-8 text-crew-text-tertiary mx-auto mb-1 opacity-60" />
              <p className="font-semibold text-crew-text-primary not-italic">
                Select an assigned team project to evaluate student contributions
              </p>
              <p>Individual task execution, uploaded files, and rubric scores will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-crew-text-secondary">
                <span>
                  Team: <strong className="text-crew-text-primary">{contributionsData.team_name}</strong> · Project: <strong className="text-crew-text-primary">{contributionsData.project_name}</strong>
                </span>
                <span className="text-[11px] font-mono">
                  {contributionsData.students.filter((s) => s.assessment).length} / {contributionsData.students.length} Evaluated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-crew-border/60 text-crew-text-secondary uppercase text-[10px] tracking-wider font-heading">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Tasks Done</th>
                      <th className="py-2.5 px-3">Files Uploaded</th>
                      <th className="py-2.5 px-3">Revisions</th>
                      <th className="py-2.5 px-3">Peer Reviews</th>
                      <th className="py-2.5 px-3">Teacher Assessment</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-crew-border/40">
                    {contributionsData.students.map((student) => {
                      const hasAssessment = Boolean(student.assessment);

                      return (
                        <tr
                          key={student.user_id}
                          className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3 px-3">
                            <div className="font-semibold text-crew-text-primary">
                              {student.full_name}
                            </div>
                            <div className="text-[11px] text-crew-text-tertiary">
                              {student.email}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                                student.role === 'owner' || student.role === 'leader'
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200'
                                  : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 text-crew-text-secondary'
                              }`}
                            >
                              {student.role}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono">
                            <strong className="text-crew-text-primary">
                              {student.completed_tasks_count}
                            </strong>{' '}
                            / {student.assigned_tasks_count}
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {student.submitted_files_count} files
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {student.revision_cycles_count > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                {student.revision_cycles_count} cycles
                              </span>
                            ) : (
                              <span className="text-crew-text-tertiary">0</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {student.peer_reviews_conducted}
                          </td>
                          <td className="py-3 px-3">
                            {hasAssessment ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                                  <Award className="w-3 h-3 text-emerald-500" />
                                  <span>{student.assessment.total_rubric_score} / 15</span>
                                </span>
                                {student.assessment.feedback && (
                                  <p className="text-[10px] text-crew-text-tertiary truncate max-w-xs italic">
                                    "{student.assessment.feedback}"
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200">
                                Pending Evaluation
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenAssessment(student)}
                              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold shadow-xs transition-colors"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{hasAssessment ? 'Update Rubric' : 'Grade Student'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW: ASSIGNED PROJECTS & PORTFOLIO                                 */}
      {/* =================================================================== */}
      {(currentView === 'projects' || currentView === 'teams') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-crew-text-primary">
              Supervised Projects Portfolio & Team Assignments
            </h2>
            <Button onClick={() => setCreateTopicOpen(true)} size="sm" icon={Plus}>
              New Academic Topic
            </Button>
          </div>

          {projects.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#14171E] border border-crew-border/90 rounded-2xl shadow-subtle">
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
                  className="p-5 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-crew-text-secondary">
                          Team: {proj.team_name}
                        </span>
                        {proj.team_members_count > 0 && (
                          <span className="text-[11px] font-semibold text-crew-text-secondary">
                            ({proj.team_members_count} Students)
                          </span>
                        )}
                        {proj.in_review_tasks > 0 && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80">
                            {proj.in_review_tasks} In Review
                          </span>
                        )}
                        {proj.overdue_tasks > 0 && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
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
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
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
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-crew-text-primary border border-crew-border transition-colors flex items-center gap-1.5 shadow-subtle"
                      >
                        <Calendar className="w-3.5 h-3.5 text-crew-text-tertiary" />
                        <span>Extend Deadline</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportReport(proj.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-crew-text-primary border border-crew-border transition-colors flex items-center gap-1.5 shadow-subtle"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-crew-text-tertiary" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-crew-border/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4 text-crew-text-secondary font-mono">
                      <span>Tasks: <strong>{proj.completed_tasks}</strong>/{proj.total_tasks} Done</span>
                      <span>Progress: <strong>{proj.completion_percentage}%</strong></span>
                    </div>
                    {proj.deadline && (
                      <span className="text-[11px] text-crew-text-tertiary font-mono">
                        Deadline: {formatDate(proj.deadline)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW: ACADEMIC REPORTS                                              */}
      {/* =================================================================== */}
      {currentView === 'reports' && (
        <div className="bg-white dark:bg-[#14171E] border border-crew-border/90 rounded-2xl p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-crew-border/60">
            <div>
              <h2 className="font-heading text-lg font-bold text-crew-text-primary">
                Academic Progress & Assessment Reports
              </h2>
              <p className="text-xs text-crew-text-secondary">
                Generate printable academic PDF reports and structured CSV data exports for official records
              </p>
            </div>
            <Button
              onClick={() => setReportModalOpen(true)}
              size="sm"
              icon={Printer}
              disabled={!selectedProjectForAssessment}
            >
              Generate Printable PDF
            </Button>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-semibold text-crew-text-primary block">
              Available Supervised Reports:
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignedProjects.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-crew-border bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-crew-text-primary truncate block">{p.team_name}</span>
                    <span className="text-[11px] text-crew-text-secondary truncate block">{p.name}</span>
                    <span className="text-[10px] text-crew-text-tertiary font-mono block mt-1">
                      {p.completed_tasks}/{p.total_tasks} deliverables completed ({p.completion_percentage}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProjectForAssessment(p.id);
                        setReportModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-xs"
                    >
                      Print PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportReport(p.id)}
                      className="p-1.5 rounded-lg border border-crew-border bg-white dark:bg-slate-800 text-slate-600 hover:text-slate-900"
                      title="Download CSV"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {/* 1. Create Academic Topic Modal */}
      <Modal
        isOpen={createTopicOpen}
        onClose={() => setCreateTopicOpen(false)}
        title="Create Academic Project Topic"
      >
        <form onSubmit={handleCreateTopic} className="space-y-4">
          <Input
            label="Project Topic Name"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="e.g. Distributed Database Capstone"
            required
          />
          <div>
            <label className="block text-xs font-medium text-crew-text-primary mb-1">
              Topic Description & Rubric Objectives
            </label>
            <textarea
              value={topicDesc}
              onChange={(e) => setTopicDesc(e.target.value)}
              placeholder="Outline project deliverables, architecture requirements, and milestone expectations..."
              rows={3}
              className="w-full text-xs rounded-xl border border-crew-border bg-crew-bg p-3 text-crew-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
          <Input
            label="Target Project Deadline"
            type="date"
            value={topicDeadline}
            onChange={(e) => setTopicDeadline(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreateTopicOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Topic
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Assign to Team Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign "${selectedProject?.name}" to Student Team`}
      >
        <form onSubmit={handleAssignTeam} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-crew-text-primary mb-1">
              Select Student Team
            </label>
            <select
              value={assignTeamId}
              onChange={(e) => setAssignTeamId(e.target.value)}
              className="w-full text-xs rounded-xl border border-crew-border bg-crew-bg p-2.5 text-crew-text-primary focus:outline-none"
              required
            >
              <option value="">-- Choose Team --</option>
              {allTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.members_count || 0} members)
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={assigning} disabled={!assignTeamId}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Extend Deadline Modal */}
      <Modal
        isOpen={extendModalOpen}
        onClose={() => setExtendModalOpen(false)}
        title={`Extend Deadline: "${selectedProject?.name}"`}
      >
        <form onSubmit={handleExtendDeadline} className="space-y-4">
          <Input
            label="New Target Deadline"
            type="date"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-medium text-crew-text-primary mb-1">
              Reason for Academic Extension
            </label>
            <textarea
              value={extendReason}
              onChange={(e) => setExtendReason(e.target.value)}
              placeholder="e.g. Scope adjustment approved due to midterm exams..."
              rows={2}
              className="w-full text-xs rounded-xl border border-crew-border bg-crew-bg p-3 text-crew-text-primary focus:outline-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setExtendModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={extending} disabled={!newDeadline || !extendReason.trim()}>
              Save Extension
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Student Rubric Assessment Modal */}
      {studentToAssess && (
        <RubricAssessmentModal
          isOpen={assessmentModalOpen}
          onClose={() => {
            setAssessmentModalOpen(false);
            setStudentToAssess(null);
          }}
          student={studentToAssess}
          projectId={selectedProjectForAssessment || studentToAssess.project_id}
          existingAssessment={studentToAssess.assessment}
          onSaved={(saved, sId) => handleAssessmentSaved(saved, sId || studentToAssess.user_id)}
          onSuccess={(saved, sId) => handleAssessmentSaved(saved, sId || studentToAssess.user_id)}
        />
      )}

      {/* 5. Academic Report Modal */}
      {selectedProjectForAssessment && (
        <AcademicReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          project={projects.find((p) => p.id === selectedProjectForAssessment)}
          contributionsData={contributionsData}
          onExportCsv={() => handleExportReport(selectedProjectForAssessment)}
        />
      )}
    </div>
  );
}
