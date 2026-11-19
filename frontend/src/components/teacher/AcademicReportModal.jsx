import React, { useRef } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { formatDate } from '../../utils/formatters';
import { teacherService, formatApiError } from '../../services/api';
import {
  Printer,
  FileSpreadsheet,
} from 'lucide-react';

export default function AcademicReportModal({
  isOpen,
  onClose,
  project,
  contributionsData,
  teacher,
}) {
  const printAreaRef = useRef(null);

  if (!project) return null;

  const students = contributionsData?.students || [];
  const totalTasks = contributionsData?.total_tasks || project.total_tasks || 0;
  const completedTasks = contributionsData?.completed_tasks || project.completed_tasks || 0;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const assessedStudents = students.filter((s) => Boolean(s.assessment));
  const assessedCount = assessedStudents.length;
  const totalStudents = students.length;

  const avgTotal =
    assessedCount > 0
      ? (
          assessedStudents.reduce((acc, s) => acc + s.assessment.total_rubric_score, 0) /
          assessedCount
        ).toFixed(1)
      : 'N/A';

  const avgTech =
    assessedCount > 0
      ? (
          assessedStudents.reduce((acc, s) => acc + s.assessment.technical_score, 0) / assessedCount
        ).toFixed(1)
      : 'N/A';

  const avgDoc =
    assessedCount > 0
      ? (
          assessedStudents.reduce((acc, s) => acc + s.assessment.documentation_score, 0) /
          assessedCount
        ).toFixed(1)
      : 'N/A';

  const avgCollab =
    assessedCount > 0
      ? (
          assessedStudents.reduce((acc, s) => acc + s.assessment.collaboration_score, 0) /
          assessedCount
        ).toFixed(1)
      : 'N/A';

  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  function handlePrint() {
    window.print();
  }

  async function handleDownloadCsv() {
    try {
      const response = await teacherService.exportReport(project.id, 'csv');
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${project.name.replace(/\s+/g, '_').toLowerCase()}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert(formatApiError(err, 'Failed to download CSV report.'));
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Academic Assessment & Contribution Report"
      description={`Supervised Deliverable: ${project.name}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Action Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-crew-bg border border-crew-border print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-crew-text-primary">
              Official Assessment Dossier
            </span>
            <span className="text-[10px] text-crew-text-tertiary">
              Printable PDF & Spreadsheet Export
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handlePrint}
              variant="outline"
              size="sm"
              icon={Printer}
            >
              Print / Save as PDF
            </Button>
            <Button
              type="button"
              onClick={handleDownloadCsv}
              size="sm"
              icon={FileSpreadsheet}
            >
              Download CSV
            </Button>
          </div>
        </div>

        {/* Printable Academic Report Document Body */}
        <div
          ref={printAreaRef}
          id="printable-academic-report"
          className="bg-white text-gray-900 p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none print:text-black"
        >
          {/* Header & Seal */}
          <div className="border-b-2 border-gray-900 pb-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-sm">
                  CB
                </div>
                <div>
                  <h1 className="font-heading font-extrabold text-lg text-gray-900 tracking-tight leading-none uppercase">
                    Crewboard Academic Platform
                  </h1>
                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider block mt-0.5">
                    Faculty Assessment & Individual Contribution Report
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-gray-600 font-mono">
              <div>Date: {todayStr}</div>
              <div>Report ID: {project.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>

          {/* Project & Supervision Meta Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Topic / Milestone</span>
              <span className="font-semibold text-gray-900">{project.name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Supervised Team</span>
              <span className="font-semibold text-gray-900">
                {contributionsData?.team_name || project.team_name || 'Assigned Team'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Faculty Supervisor</span>
              <span className="font-semibold text-gray-900">{teacher?.full_name || 'Faculty Instructor'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Target Deadline</span>
              <span className="font-semibold text-gray-900">
                {project.deadline ? formatDate(project.deadline) : 'Ongoing Project'}
              </span>
            </div>
          </div>

          {/* Executive Summary Metrics */}
          <div className="space-y-2">
            <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900 border-b border-gray-200 pb-1">
              1. Executive Milestone Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl border border-gray-200 bg-white">
                <span className="text-[10px] uppercase font-semibold text-gray-500 block">Deliverables</span>
                <span className="font-heading font-extrabold text-xl text-gray-900">
                  {completedTasks} / {totalTasks}
                </span>
                <span className="text-[10px] text-gray-600 block mt-0.5">({completionPct}% Completed)</span>
              </div>
              <div className="p-3 rounded-xl border border-gray-200 bg-white">
                <span className="text-[10px] uppercase font-semibold text-gray-500 block">Students Assessed</span>
                <span className="font-heading font-extrabold text-xl text-gray-900">
                  {assessedCount} / {totalStudents}
                </span>
                <span className="text-[10px] text-gray-600 block mt-0.5">
                  {totalStudents > 0 ? Math.round((assessedCount / totalStudents) * 100) : 0}% Graded
                </span>
              </div>
              <div className="p-3 rounded-xl border border-gray-200 bg-white">
                <span className="text-[10px] uppercase font-semibold text-gray-500 block">Composite Rubric Avg</span>
                <span className="font-heading font-extrabold text-xl text-gray-900 font-mono">
                  {avgTotal}
                </span>
                <span className="text-[10px] text-gray-600 block mt-0.5">Out of 15.0 Points</span>
              </div>
              <div className="p-3 rounded-xl border border-gray-200 bg-white">
                <span className="text-[10px] uppercase font-semibold text-gray-500 block">Criteria Breakdown</span>
                <div className="text-[11px] font-mono font-medium text-gray-800 space-y-0.5 mt-0.5">
                  <div>Tech: {avgTech}/5 · Doc: {avgDoc}/5</div>
                  <div>Collab: {avgCollab}/5</div>
                </div>
              </div>
            </div>
          </div>

          {/* Individual Contribution & Rubric Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-gray-200 pb-1">
              <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900">
                2. Individual Student Contribution Evidence & Faculty Rubric Evaluation
              </h2>
              <span className="text-[10px] text-gray-500 font-mono">
                {students.length} Enrolled Student{students.length === 1 ? '' : 's'}
              </span>
            </div>

            {students.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500 italic">
                No students enrolled in this group project.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200 text-[11px]">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-2 text-center">Tasks (Done/Assigned)</th>
                      <th className="py-2.5 px-2 text-center">Files</th>
                      <th className="py-2.5 px-2 text-center">Revisions</th>
                      <th className="py-2.5 px-2 text-center">Reviews</th>
                      <th className="py-2.5 px-2 text-center">Tech (/5)</th>
                      <th className="py-2.5 px-2 text-center">Doc (/5)</th>
                      <th className="py-2.5 px-2 text-center">Collab (/5)</th>
                      <th className="py-2.5 px-2 text-center">Total (/15)</th>
                      <th className="py-2.5 px-3">Faculty Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-[11px]">
                    {students.map((st) => (
                      <tr key={st.user_id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-gray-900 block">{st.full_name}</span>
                          <span className="text-[10px] text-gray-500">{st.email}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          {st.completed_tasks_count} / {st.assigned_tasks_count}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">{st.submitted_files_count}</td>
                        <td className="py-2.5 px-2 text-center font-mono">{st.revision_cycles_count}</td>
                        <td className="py-2.5 px-2 text-center font-mono">{st.peer_reviews_conducted}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-semibold">
                          {st.assessment ? st.assessment.technical_score : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-semibold">
                          {st.assessment ? st.assessment.documentation_score : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-semibold">
                          {st.assessment ? st.assessment.collaboration_score : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-extrabold text-gray-900">
                          {st.assessment ? `${st.assessment.total_rubric_score}` : 'Pending'}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs text-[10px] text-gray-600 italic">
                          {st.assessment?.feedback ? `"${st.assessment.feedback}"` : 'No written comments.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Academic Verification Certification Sign-off */}
          <div className="pt-4 border-t-2 border-gray-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-gray-600">
            <div className="space-y-1">
              <div className="font-semibold text-gray-900">Official Institutional Certification</div>
              <p className="text-[10px] text-gray-500 max-w-md">
                This academic report documents verified deliverable submissions, versioned audit trails, peer auditing actions, and official rubric scores recorded under Crewboard institutional standards.
              </p>
            </div>
            <div className="border-t border-gray-400 pt-1 text-center min-w-[180px]">
              <span className="font-semibold text-gray-900 block text-xs">{teacher?.full_name || 'Instructor'}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Authorized Evaluator Signature</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
