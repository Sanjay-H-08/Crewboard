import React from 'react';
import { RoleBadge } from '../common/Badge';
import { getInitials, formatDate } from '../../utils/formatters';
import { Users, Mail } from 'lucide-react';

export default function MemberTable({ members = [], workload = [] }) {
  // Create a map from user_id to workload entry
  const workloadMap = {};
  (workload || []).forEach((w) => {
    workloadMap[w.user_id] = w;
  });

  if (members.length === 0) {
    return (
      <div className="bg-crew-surface border border-crew-border rounded-lg p-6 text-center text-xs text-crew-text-secondary">
        <Users className="w-6 h-6 text-crew-sand mx-auto mb-2" />
        <p className="font-semibold text-crew-text-primary text-sm">No members found</p>
      </div>
    );
  }

  return (
    <div className="bg-crew-surface border border-crew-border rounded-lg shadow-card overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-crew-border/60 flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-sm text-crew-text-primary tracking-tight">
            Team Roster & Contributions
          </h3>
          <p className="text-xs text-crew-text-secondary mt-0.5">
            Verified members and their deliverable completion records
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-crew-bg border border-crew-border text-crew-text-secondary">
          {members.length} Teammates
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-crew-bg/70 border-b border-crew-border text-crew-text-secondary font-heading uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4 hidden sm:table-cell">Joined</th>
              <th className="py-3 px-4 text-center">Assigned</th>
              <th className="py-3 px-4 text-center">Completed</th>
              <th className="py-3 px-4 text-right">Workload Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-crew-border/60">
            {members.map((member) => {
              const wl = workloadMap[member.user_id];
              const assigned = wl ? wl.assigned_tasks : '—';
              const completed = wl ? wl.completed_tasks : '—';
              const share = wl ? `${wl.workload_share_percentage}%` : '—';

              return (
                <tr key={member.user_id} className="hover:bg-crew-bg/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-crew-action/15 text-crew-action border border-crew-action/25 flex items-center justify-center font-heading font-bold text-xs flex-shrink-0">
                        {getInitials(member.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-crew-text-primary truncate">
                          {member.full_name}
                        </div>
                        <div className="text-[11px] text-crew-text-secondary truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 text-crew-text-secondary/70 flex-shrink-0" />
                          <span>{member.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <RoleBadge role={member.role} />
                  </td>

                  <td className="py-3 px-4 text-crew-text-secondary whitespace-nowrap hidden sm:table-cell">
                    {formatDate(member.joined_at)}
                  </td>

                  <td className="py-3 px-4 text-center font-heading font-medium text-crew-text-primary">
                    {assigned}
                  </td>

                  <td className="py-3 px-4 text-center font-heading font-medium text-crew-success">
                    {completed}
                  </td>

                  <td className="py-3 px-4 text-right font-heading font-semibold text-crew-text-primary">
                    {share}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
