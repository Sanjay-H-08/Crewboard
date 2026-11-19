import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Award,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Filter,
  UserCheck,
} from 'lucide-react';

export default function TeacherVisualAnalytics({
  projects = [],
  selectedProjectId = '',
  onSelectProject,
  contributionsData = null,
}) {
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const assignedProjects = useMemo(() => {
    return projects.filter((p) => Boolean(p.team_id));
  }, [projects]);

  // Active project object
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || assignedProjects[0] || projects[0] || null;
  }, [projects, selectedProjectId, assignedProjects]);

  // =========================================================================
  // 1. CLASS-LEVEL ANALYTICS (Across all supervised projects)
  // =========================================================================
  const classStats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let inReviewTasks = 0;
    let overdueTasks = 0;

    projects.forEach((p) => {
      totalTasks += p.total_tasks || 0;
      completedTasks += p.completed_tasks || 0;
      inReviewTasks += p.in_review_tasks || 0;
      overdueTasks += p.overdue_tasks || 0;
    });

    const pendingTasks = Math.max(totalTasks - completedTasks - inReviewTasks, 0);
    const overallCompletionPct =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Deadline risk indicators (projects due within 7 days or overdue)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineRisks = projects.map((p) => {
      let isRisk = false;
      let reason = 'On Track';
      if (p.deadline) {
        const d = new Date(p.deadline);
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 && (p.completed_tasks || 0) < (p.total_tasks || 1)) {
          isRisk = true;
          reason = `Overdue by ${Math.abs(diffDays)}d`;
        } else if (diffDays <= 7 && (p.completed_tasks || 0) < (p.total_tasks || 1)) {
          isRisk = true;
          reason = `Due in ${diffDays}d (${p.completion_percentage || 0}% done)`;
        }
      }
      return {
        ...p,
        isRisk,
        reason,
      };
    });

    const atRiskProjects = deadlineRisks.filter((p) => p.isRisk);

    return {
      totalTasks,
      completedTasks,
      inReviewTasks,
      overdueTasks,
      pendingTasks,
      overallCompletionPct,
      atRiskProjects,
    };
  }, [projects]);

  // =========================================================================
  // 2. TEAM ANALYTICS (Filtered to selected Project / Team)
  // =========================================================================
  const teamAnalytics = useMemo(() => {
    const students = contributionsData?.students || [];
    const totalTeamTasks = contributionsData?.total_tasks || activeProject?.total_tasks || 0;
    const completedTeamTasks = contributionsData?.completed_tasks || activeProject?.completed_tasks || 0;
    const completionPct =
      totalTeamTasks > 0 ? Math.round((completedTeamTasks / totalTeamTasks) * 100) : 0;

    const totalSubmissions = students.reduce((acc, s) => acc + (s.submitted_files_count || 0), 0);
    const totalFirstPass = students.reduce((acc, s) => acc + (s.first_pass_count || 0), 0);
    const totalRevisions = students.reduce((acc, s) => acc + (s.revision_cycles_count || 0), 0);
    const totalPeerReviews = students.reduce((acc, s) => acc + (s.peer_reviews_conducted || 0), 0);

    const firstPassRate =
      totalSubmissions > 0 ? Math.round((totalFirstPass / totalSubmissions) * 100) : 0;

    return {
      totalTeamTasks,
      completedTeamTasks,
      completionPct,
      totalSubmissions,
      totalFirstPass,
      totalRevisions,
      totalPeerReviews,
      firstPassRate,
      students,
    };
  }, [contributionsData, activeProject]);

  // =========================================================================
  // 3. INDIVIDUAL STUDENT ANALYTICS (Selected student in active project)
  // =========================================================================
  const studentList = teamAnalytics.students;
  const activeStudent = useMemo(() => {
    if (selectedStudentId) {
      const found = studentList.find((s) => s.user_id === selectedStudentId);
      if (found) return found;
    }
    return studentList[0] || null;
  }, [selectedStudentId, studentList]);

  // Class Assessment Score Distribution
  const classRubricDistribution = useMemo(() => {
    const assessed = (contributionsData?.students || []).filter((s) => Boolean(s.assessment));
    if (assessed.length === 0) return { avgTech: 0, avgDoc: 0, avgCollab: 0, avgTotal: 0, count: 0 };

    const avgTech = (assessed.reduce((acc, s) => acc + s.assessment.technical_score, 0) / assessed.length).toFixed(1);
    const avgDoc = (assessed.reduce((acc, s) => acc + s.assessment.documentation_score, 0) / assessed.length).toFixed(1);
    const avgCollab = (assessed.reduce((acc, s) => acc + s.assessment.collaboration_score, 0) / assessed.length).toFixed(1);
    const avgTotal = (assessed.reduce((acc, s) => acc + s.assessment.total_rubric_score, 0) / assessed.length).toFixed(1);

    return { avgTech, avgDoc, avgCollab, avgTotal, count: assessed.length };
  }, [contributionsData]);

  return (
    <div className="space-y-6">
      {/* Scope Filtering Controls Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-crew-text-primary">
            <Filter className="w-4 h-4 text-indigo-500" />
            <span>Scope Filter:</span>
          </div>

          {/* Project / Team Selector */}
          <select
            value={selectedProjectId}
            onChange={(e) => onSelectProject(e.target.value)}
            className="text-xs rounded-xl border border-crew-border bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-crew-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.team_name ? `· ${p.team_name}` : '(Unassigned)'}
              </option>
            ))}
          </select>

          {/* Student Selector */}
          {studentList.length > 0 && (
            <select
              value={activeStudent?.user_id || ''}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="text-xs rounded-xl border border-crew-border bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-crew-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            >
              {studentList.map((s) => (
                <option key={s.user_id} value={s.user_id}>
                  Student: {s.full_name} ({s.role})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-crew-text-secondary">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Live Academic Telemetry</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LEVEL 1: CLASS-LEVEL ANALYTICS                                        */}
      {/* ===================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-crew-text-primary">
                1. Class & Portfolio Overview
              </h3>
              <p className="text-[11px] text-crew-text-secondary">
                Aggregate completion velocity across all supervised capstone cohorts
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            {assignedProjects.length} Supervised Teams
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Overall Completion Rate */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-white to-slate-50/60 dark:from-[#14171E] dark:to-[#1A1F29] border border-crew-border/90 shadow-subtle space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-tertiary block">
              Portfolio Deliverables Done
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-extrabold text-3xl text-crew-text-primary">
                {classStats.overallCompletionPct}%
              </span>
              <span className="text-xs text-crew-text-secondary font-mono">
                ({classStats.completedTasks}/{classStats.totalTasks} total)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${classStats.overallCompletionPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-crew-text-tertiary font-mono">
              <span>{classStats.inReviewTasks} in review</span>
              <span className="text-rose-500 font-semibold">{classStats.overdueTasks} overdue</span>
            </div>
          </div>

          {/* Card 2: Class Rubric Score Distribution */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-white to-slate-50/60 dark:from-[#14171E] dark:to-[#1A1F29] border border-crew-border/90 shadow-subtle space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-tertiary block">
              Rubric Score Composite
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-extrabold text-3xl text-crew-text-primary">
                {classRubricDistribution.avgTotal}
              </span>
              <span className="text-xs text-crew-text-secondary font-mono">
                / 15 ({classRubricDistribution.count} graded)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono text-[10px]">
              <div className="p-1 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40">
                <span className="text-indigo-600 dark:text-indigo-400 block font-bold">{classRubricDistribution.avgTech}/5</span>
                <span className="text-crew-text-tertiary block mt-0.5">Tech</span>
              </div>
              <div className="p-1 rounded-lg bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40">
                <span className="text-teal-600 dark:text-teal-400 block font-bold">{classRubricDistribution.avgDoc}/5</span>
                <span className="text-crew-text-tertiary block mt-0.5">Doc</span>
              </div>
              <div className="p-1 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40">
                <span className="text-purple-600 dark:text-purple-400 block font-bold">{classRubricDistribution.avgCollab}/5</span>
                <span className="text-crew-text-tertiary block mt-0.5">Collab</span>
              </div>
            </div>
          </div>

          {/* Card 3: Team Progress Comparison */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-white to-slate-50/60 dark:from-[#14171E] dark:to-[#1A1F29] border border-crew-border/90 shadow-subtle space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-tertiary">
                Team Progress Comparison
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                Click team to scope
              </span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {assignedProjects.map((p) => {
                const isSelected = p.id === selectedProjectId;
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProject(p.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-xs'
                        : 'bg-white/60 dark:bg-slate-900/30 border-slate-200/70 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-crew-text-primary truncate">
                          {p.team_name}
                        </span>
                        <span className="text-[10px] text-crew-text-tertiary truncate">
                          ({p.name})
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            p.completion_percentage >= 75
                              ? 'bg-emerald-500'
                              : p.completion_percentage >= 40
                              ? 'bg-indigo-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(p.completion_percentage || 0, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 font-mono">
                      <span className="text-xs font-bold text-crew-text-primary block">
                        {p.completion_percentage || 0}%
                      </span>
                      <span className="text-[10px] text-crew-text-tertiary">
                        {p.completed_tasks}/{p.total_tasks} done
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* At-Risk Deadlines Banner — Refined Soft Styling */}
        {classStats.atRiskProjects.length > 0 && (
          <div className="px-4 py-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all shadow-subtle">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-amber-100/80 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-semibold text-amber-900 dark:text-amber-200 text-xs flex-shrink-0">
                  {classStats.atRiskProjects.length} {classStats.atRiskProjects.length === 1 ? 'Milestone' : 'Milestones'} Approaching Deadline:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {classStats.atRiskProjects.slice(0, 3).map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 dark:bg-slate-900/70 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 font-medium"
                    >
                      <span className="font-semibold truncate max-w-[130px]">{p.team_name}</span>
                      <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-mono">
                        ({p.reason})
                      </span>
                    </span>
                  ))}
                  {classStats.atRiskProjects.length > 3 && (
                    <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                      +{classStats.atRiskProjects.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-[11px] font-medium text-amber-800/80 dark:text-amber-300/80 whitespace-nowrap self-end sm:self-center">
              Requires supervisory attention
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* LEVEL 2: TEAM-LEVEL ANALYTICS                                         */}
      {/* ===================================================================== */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-crew-text-primary">
                2. Team Telemetry & Quality — {activeProject?.team_name || 'Selected Team'}
              </h3>
              <p className="text-[11px] text-crew-text-secondary">
                Workflow distribution, revision velocity, and first-pass delivery precision
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-crew-text-secondary font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Completion Rate</span>
            </div>
            <div className="font-mono font-bold text-lg text-crew-text-primary">
              {teamAnalytics.completionPct}%
            </div>
            <span className="text-[10px] text-crew-text-tertiary block font-mono">
              {teamAnalytics.completedTeamTasks} of {teamAnalytics.totalTeamTasks} tasks
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-crew-text-secondary font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>First-Pass Approvals</span>
            </div>
            <div className="font-mono font-bold text-lg text-crew-text-primary">
              {teamAnalytics.firstPassRate}%
            </div>
            <span className="text-[10px] text-crew-text-tertiary block font-mono">
              {teamAnalytics.totalFirstPass} approved at v1
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-crew-text-secondary font-medium">
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              <span>Revision Cycles</span>
            </div>
            <div className="font-mono font-bold text-lg text-crew-text-primary">
              {teamAnalytics.totalRevisions}
            </div>
            <span className="text-[10px] text-crew-text-tertiary block font-mono">
              Changes requested
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 shadow-subtle space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-crew-text-secondary font-medium">
              <Award className="w-3.5 h-3.5 text-purple-500" />
              <span>Peer Reviews</span>
            </div>
            <div className="font-mono font-bold text-lg text-crew-text-primary">
              {teamAnalytics.totalPeerReviews}
            </div>
            <span className="text-[10px] text-crew-text-tertiary block font-mono">
              Audits conducted
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LEVEL 3: INDIVIDUAL STUDENT ANALYTICS & RUBRIC BREAKDOWN              */}
      {/* ===================================================================== */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-crew-text-primary">
                3. Individual Student Contribution Evidence & Evaluation
              </h3>
              <p className="text-[11px] text-crew-text-secondary">
                Verifiable tasks done, submission evidence, and academic rubric score breakdown
              </p>
            </div>
          </div>
        </div>

        {activeStudent ? (
          <div className="p-5 rounded-2xl bg-gradient-to-b from-white to-slate-50/60 dark:from-[#14171E] dark:to-[#1A1F29] border border-crew-border/90 shadow-subtle space-y-5">
            {/* Student Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-crew-border/60">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-heading font-bold text-sm shadow-sm flex-shrink-0">
                  {activeStudent.full_name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading font-bold text-base text-crew-text-primary">
                      {activeStudent.full_name}
                    </h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {activeStudent.role}
                    </span>
                  </div>
                  <span className="text-xs text-crew-text-secondary font-mono">
                    {activeStudent.email}
                  </span>
                </div>
              </div>

              {/* Rubric Total Score Badge */}
              <div className="text-left sm:text-right flex-shrink-0">
                {activeStudent.assessment ? (
                  <div className="space-y-0.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 font-bold text-sm">
                      <Award className="w-4 h-4 text-emerald-500" />
                      <span>{activeStudent.assessment.total_rubric_score} / 15 Rubric Score</span>
                    </div>
                    <span className="text-[10px] text-crew-text-tertiary block font-mono">
                      Assessed by {activeStudent.assessment.teacher_name || 'Faculty'}
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                    <span>Awaiting Rubric Scoring</span>
                  </span>
                )}
              </div>
            </div>

            {/* Evidence Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-crew-text-secondary block">Tasks Assigned</span>
                <span className="font-mono font-bold text-base text-crew-text-primary">
                  {activeStudent.assigned_tasks_count}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-crew-text-secondary block">Tasks Completed</span>
                <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                  {activeStudent.completed_tasks_count}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-crew-text-secondary block">Files Submitted</span>
                <span className="font-mono font-bold text-base text-indigo-600 dark:text-indigo-400">
                  {activeStudent.submitted_files_count}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-crew-text-secondary block">First-Pass v1</span>
                <span className="font-mono font-bold text-base text-amber-600 dark:text-amber-400">
                  {activeStudent.first_pass_count}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-crew-text-secondary block">On-Time Tasks</span>
                <span className="font-mono font-bold text-base text-teal-600 dark:text-teal-400">
                  {activeStudent.on_time_count}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-crew-text-secondary block">Peer Reviews</span>
                <span className="font-mono font-bold text-base text-purple-600 dark:text-purple-400">
                  {activeStudent.peer_reviews_conducted}
                </span>
              </div>
            </div>

            {/* Rubric Breakdown Gauges */}
            {activeStudent.assessment && (
              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/60 space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-crew-text-tertiary block">
                  3-Dimension Rubric Scoring
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Technical Execution */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-crew-text-primary">Technical Execution</span>
                      <span className="font-mono font-bold text-indigo-600">{activeStudent.assessment.technical_score}/5</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${(activeStudent.assessment.technical_score / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Documentation */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-crew-text-primary">Documentation</span>
                      <span className="font-mono font-bold text-teal-600">{activeStudent.assessment.documentation_score}/5</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-500"
                        style={{ width: `${(activeStudent.assessment.documentation_score / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Collaboration */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-crew-text-primary">Teamwork & Punctuality</span>
                      <span className="font-mono font-bold text-purple-600">{activeStudent.assessment.collaboration_score}/5</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500"
                        style={{ width: `${(activeStudent.assessment.collaboration_score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {activeStudent.assessment.feedback && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                    <span className="text-[10px] font-semibold text-crew-text-tertiary uppercase tracking-wider block mb-1">
                      Faculty Written Feedback
                    </span>
                    <p className="italic text-crew-text-primary leading-relaxed bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                      "{activeStudent.assessment.feedback}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Explanatory Distinction Label */}
            <div className="pt-1 text-[11px] text-crew-text-tertiary flex items-center gap-1.5 border-t border-crew-border/60">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">Notice:</span>
              <span>
                Task counts and activity logs serve as verifiable work evidence. Academic grades are determined solely by teacher-evaluated rubric criteria.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#14171E] border border-crew-border/90 text-xs text-crew-text-secondary italic">
            Select a project with assigned students to view individual contribution telemetry.
          </div>
        )}
      </div>
    </div>
  );
}
