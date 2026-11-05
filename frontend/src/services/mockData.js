/**
 * Mock Data Fixtures for Frontend Parallel Development
 * Conforms 100% to docs/API_CONTRACT.md
 */

export const mockCurrentUser = {
  id: "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
  full_name: "Marcus Vance",
  email: "marcus.vance@university.edu",
  created_at: "2026-11-05T12:00:00Z",
};

export const mockTeams = [
  {
    id: "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
    name: "Autonomous Rover Capstone",
    description: "Senior design project for Mechatronics Engineering",
    join_code: "ROVER-8491",
    created_by: "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
    created_at: "2026-11-05T12:10:00Z",
    role: "owner",
    member_count: 3,
  },
];

export const mockTeamMembers = [
  {
    user_id: "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
    full_name: "Marcus Vance",
    email: "marcus.vance@university.edu",
    role: "owner",
    joined_at: "2026-11-05T12:10:00Z",
  },
  {
    user_id: "9f1e2d3c-4b5a-6789-0123-abcdef456789",
    full_name: "Elena Rostova",
    email: "elena.r@university.edu",
    role: "member",
    joined_at: "2026-11-05T12:15:00Z",
  },
  {
    user_id: "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a",
    full_name: "Devon Chen",
    email: "devon.c@university.edu",
    role: "member",
    joined_at: "2026-11-05T12:20:00Z",
  },
];

export const mockProjects = [
  {
    id: "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
    team_id: "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
    team_name: "Autonomous Rover Capstone",
    name: "Chassis & Motor Controller Build",
    description: "Fabrication of base frame and microcontroller motor driver interface",
    start_date: "2026-11-06",
    deadline: "2026-11-20",
    status: "active",
    created_by: "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
    created_at: "2026-11-05T12:20:00Z",
    total_tasks: 6,
    completed_tasks: 3,
  },
];

export const mockTasks = [
  {
    id: "5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f",
    project_id: "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
    title: "Calibrate PWM outputs on motor controller",
    description: "Verify frequency response using oscilloscope at 20kHz",
    assigned_to: "9f1e2d3c-4b5a-6789-0123-abcdef456789",
    assignee_name: "Elena Rostova",
    created_by: "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
    creator_name: "Marcus Vance",
    status: "in_progress",
    priority: "high",
    deadline: "2026-11-12",
    is_overdue: false,
    created_at: "2026-11-05T12:30:00Z",
    updated_at: "2026-11-05T12:45:00Z",
  },
  {
    id: "6d7e8f9a-0b1c-2d3e-4f5a-6b7c8d9e0f1a",
    project_id: "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
    title: "Mount optical encoders to drive shafts",
    description: "Laser cut bracket adapters and fasten with M3 bolts",
    assigned_to: "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a",
    assignee_name: "Devon Chen",
    status: "todo",
    priority: "medium",
    deadline: "2026-11-15",
    is_overdue: false,
    created_at: "2026-11-05T12:35:00Z",
    updated_at: "2026-11-05T12:35:00Z",
  },
  {
    id: "7e8f9a0b-1c2d-3e4f-5a6b-7c8d9e0f1a2b",
    project_id: "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
    title: "Initial frame CAD specification & stress test",
    description: "Completed FEA in SolidWorks for 15kg load",
    assigned_to: "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
    assignee_name: "Marcus Vance",
    status: "done",
    priority: "high",
    deadline: "2026-11-04",
    is_overdue: false,
    created_at: "2026-11-05T12:00:00Z",
    updated_at: "2026-11-05T12:20:00Z",
  },
];

export const mockAnalytics = {
  project_id: "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
  project_name: "Chassis & Motor Controller Build",
  completion_percentage: 50.0,
  summary: {
    total_tasks: 6,
    completed_tasks: 3,
    in_progress_tasks: 2,
    todo_tasks: 1,
    overdue_tasks: 1,
    unassigned_tasks: 0,
  },
  workload_distribution: [
    {
      user_id: "9f1e2d3c-4b5a-6789-0123-abcdef456789",
      full_name: "Elena Rostova",
      assigned_tasks: 3,
      completed_tasks: 1,
      in_progress_tasks: 1,
      todo_tasks: 1,
      workload_share_percentage: 50.0,
    },
    {
      user_id: "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
      full_name: "Marcus Vance",
      assigned_tasks: 2,
      completed_tasks: 2,
      in_progress_tasks: 0,
      todo_tasks: 0,
      workload_share_percentage: 33.3,
    },
    {
      user_id: "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a",
      full_name: "Devon Chen",
      assigned_tasks: 1,
      completed_tasks: 0,
      in_progress_tasks: 1,
      todo_tasks: 0,
      workload_share_percentage: 16.7,
    },
  ],
  imbalance_warnings: [
    "Workload Concentration: Elena Rostova holds 50.0% of all assigned tasks.",
  ],
};

