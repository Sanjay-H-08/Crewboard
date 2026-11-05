# Crewboard — Comprehensive API Contract Specification

## 1. Global Conventions & Protocol Standards

### 1.1 Base URL & Routing
All API endpoints are strictly served under the `/api` prefix:
- Development: `http://localhost:8000/api`
- Production / Docker: `http://localhost:8000/api` (proxied or direct)

### 1.2 Authentication Header
Endpoints requiring authentication mandate a standard HTTP Bearer token in the `Authorization` header:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```
Unauthenticated requests to protected endpoints return `401 Unauthorized`.

### 1.3 Request & Response Media Types
- All payloads are serialized as `application/json; charset=utf-8`.
- Date and timestamp fields follow **ISO 8601 / RFC 3339** format:
  - Dates: `YYYY-MM-DD` (e.g., `2026-11-20`)
  - Timestamps: `YYYY-MM-DDTHH:MM:SSZ` (e.g., `2026-11-05T14:30:00Z`)
- All entity identifiers (`id`, foreign keys) are standard **UUIDv4** strings.

### 1.4 Standard Error Response Format
Crewboard adopts FastAPI's standard RFC-aligned error envelope:

#### Generic Error (400, 401, 403, 404, 409)
```json
{
  "detail": "Descriptive error message explaining the rejection."
}
```

#### Validation Error (422 Unprocessable Entity)
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address: The email address is not valid. It must have exactly one @-sign.",
      "type": "value_error"
    }
  ]
}
```

---

## 2. Authentication Domain (`/api/auth`)

### 2.1 Register User
- **Method & Path**: `POST /api/auth/register`
- **Purpose**: Creates a new student user account and initializes password hash.
- **Authentication**: None (Public)
- **Request Body**:
```json
{
  "full_name": "Marcus Vance",
  "email": "marcus.vance@university.edu",
  "password": "SecurePassword123!"
}
```
| Field | Type | Required | Constraints |
| :--- | :--- | :--- | :--- |
| `full_name` | `string` | Yes | 2–100 chars |
| `email` | `string` | Yes | Valid email format, unique |
| `password` | `string` | Yes | Min 8 chars, at least 1 letter and 1 number |

- **Response (201 Created)**:
```json
{
  "id": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
  "full_name": "Marcus Vance",
  "email": "marcus.vance@university.edu",
  "created_at": "2026-11-05T12:00:00Z"
}
```
- **Error Responses**:
  - `400 Bad Request`: Email already registered (`{"detail": "Email already registered."}`).
  - `422 Unprocessable Entity`: Validation failure on input schema.

---

### 2.2 Login User
- **Method & Path**: `POST /api/auth/login`
- **Purpose**: Authenticates credentials and returns a signed JWT access token along with essential user profile data.
- **Authentication**: None (Public)
- **Request Body**:
```json
{
  "email": "marcus.vance@university.edu",
  "password": "SecurePassword123!"
}
```
- **Response (200 OK)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
    "full_name": "Marcus Vance",
    "email": "marcus.vance@university.edu",
    "created_at": "2026-11-05T12:00:00Z"
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Invalid email or password (`{"detail": "Incorrect email or password."}`).

---

### 2.3 Get Current User Profile
- **Method & Path**: `GET /api/auth/me`
- **Purpose**: Returns the authenticated user's profile and active team memberships.
- **Authentication**: Bearer Token Required
- **Request Body**: None
- **Response (200 OK)**:
```json
{
  "id": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
  "full_name": "Marcus Vance",
  "email": "marcus.vance@university.edu",
  "created_at": "2026-11-05T12:00:00Z"
}
```
- **Error Responses**:
  - `401 Unauthorized`: Token expired, malformed, or missing (`{"detail": "Could not validate credentials."}`).

---

## 3. Teams Domain (`/api/teams`)

### 3.1 Create Team
- **Method & Path**: `POST /api/teams`
- **Purpose**: Creates a new team workspace, generates a unique join code, and registers the caller as the `owner` in `team_members`.
- **Authentication**: Bearer Token Required
- **Request Body**:
```json
{
  "name": "Autonomous Rover Capstone",
  "description": "Senior design project for Mechatronics Engineering"
}
```
| Field | Type | Required | Constraints |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | 2–100 chars |
| `description` | `string` | No | Max 1000 chars or null |

- **Response (201 Created)**:
```json
{
  "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
  "name": "Autonomous Rover Capstone",
  "description": "Senior design project for Mechatronics Engineering",
  "join_code": "ROVER-8491",
  "created_by": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
  "created_at": "2026-11-05T12:10:00Z",
  "role": "owner",
  "member_count": 1
}
```

---

### 3.2 List My Teams
- **Method & Path**: `GET /api/teams`
- **Purpose**: Retrieves all teams in which the current user is an active member.
- **Authentication**: Bearer Token Required
- **Request Body**: None
- **Response (200 OK)**:
```json
[
  {
    "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
    "name": "Autonomous Rover Capstone",
    "description": "Senior design project for Mechatronics Engineering",
    "join_code": "ROVER-8491",
    "created_by": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
    "created_at": "2026-11-05T12:10:00Z",
    "role": "owner",
    "member_count": 4
  }
]
```

---

### 3.3 Join Team via Code
- **Method & Path**: `POST /api/teams/join`
- **Purpose**: Adds the authenticated user to an existing team using its unique join code.
- **Authentication**: Bearer Token Required
- **Request Body**:
```json
{
  "join_code": "ROVER-8491"
}
```
- **Response (200 OK)**:
```json
{
  "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
  "name": "Autonomous Rover Capstone",
  "description": "Senior design project for Mechatronics Engineering",
  "role": "member",
  "joined_at": "2026-11-05T12:15:00Z"
}
```
- **Error Responses**:
  - `404 Not Found`: Invalid join code (`{"detail": "Team with this join code does not exist."}`).
  - `409 Conflict`: User is already a member of this team (`{"detail": "You are already a member of this team."}`).

---

### 3.4 Get Team Details & Members
- **Method & Path**: `GET /api/teams/{team_id}`
- **Purpose**: Returns complete team details including all member profiles, their roles, and member count.
- **Authentication**: Bearer Token Required
- **Authorization**: Caller must be a member of the requested team (`403 Forbidden` if not a member).
- **Response (200 OK)**:
```json
{
  "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
  "name": "Autonomous Rover Capstone",
  "description": "Senior design project for Mechatronics Engineering",
  "join_code": "ROVER-8491",
  "created_by": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
  "created_at": "2026-11-05T12:10:00Z",
  "current_user_role": "owner",
  "members": [
    {
      "user_id": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
      "full_name": "Marcus Vance",
      "email": "marcus.vance@university.edu",
      "role": "owner",
      "joined_at": "2026-11-05T12:10:00Z"
    },
    {
      "user_id": "9f1e2d3c-4b5a-6789-0123-abcdef456789",
      "full_name": "Elena Rostova",
      "email": "elena.r@university.edu",
      "role": "member",
      "joined_at": "2026-11-05T12:15:00Z"
    }
  ]
}
```
- **Error Responses**:
  - `403 Forbidden`: Caller is not a member of the team.
  - `404 Not Found`: Team does not exist.

---

## 4. Projects Domain (`/api/projects`)

### 4.1 Create Project
- **Method & Path**: `POST /api/projects`
- **Purpose**: Creates a new project deliverable under an existing team.
- **Authentication**: Bearer Token Required
- **Authorization**: Caller must be a member of `team_id`.
- **Request Body**:
```json
{
  "team_id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
  "name": "Chassis & Motor Controller Build",
  "description": "Fabrication of base frame and micro-controller motor driver interface",
  "start_date": "2026-11-06",
  "deadline": "2026-11-20",
  "status": "active"
}
```
| Field | Type | Required | Constraints |
| :--- | :--- | :--- | :--- |
| `team_id` | `UUID` | Yes | Must reference a team caller belongs to |
| `name` | `string` | Yes | 2–150 chars |
| `description` | `string` | No | Nullable |
| `start_date` | `string` | No | ISO Date `YYYY-MM-DD` or null |
| `deadline` | `string` | No | ISO Date `YYYY-MM-DD` or null |
| `status` | `string` | No | `'planning'`, `'active'`, `'completed'`, `'archived'` (default `'active'`) |

- **Response (201 Created)**:
```json
{
  "id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
  "team_id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
  "name": "Chassis & Motor Controller Build",
  "description": "Fabrication of base frame and micro-controller motor driver interface",
  "start_date": "2026-11-06",
  "deadline": "2026-11-20",
  "status": "active",
  "created_by": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
  "created_at": "2026-11-05T12:20:00Z"
}
```
- **Error Responses**:
  - `403 Forbidden`: User is not a member of `team_id`.

---

### 4.2 List Projects
- **Method & Path**: `GET /api/projects`
- **Purpose**: Lists projects for a specified team or all projects across user's teams.
- **Authentication**: Bearer Token Required
- **Query Parameters**:
  - `team_id` (UUID, optional): Filter by specific team ID.
- **Authorization**: Caller must be a member of any returned project's team.
- **Response (200 OK)**:
```json
[
  {
    "id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
    "team_id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
    "team_name": "Autonomous Rover Capstone",
    "name": "Chassis & Motor Controller Build",
    "description": "Fabrication of base frame and micro-controller motor driver interface",
    "start_date": "2026-11-06",
    "deadline": "2026-11-20",
    "status": "active",
    "created_by": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
    "created_at": "2026-11-05T12:20:00Z",
    "total_tasks": 12,
    "completed_tasks": 7
  }
]
```

---

### 4.3 Get Project Details
- **Method & Path**: `GET /api/projects/{project_id}`
- **Purpose**: Returns single project details with summary metrics.
- **Authentication**: Bearer Token Required
- **Authorization**: Caller must belong to the project's parent team.
- **Response (200 OK)**:
```json
{
  "id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
  "team_id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
  "team_name": "Autonomous Rover Capstone",
  "name": "Chassis & Motor Controller Build",
  "description": "Fabrication of base frame and micro-controller motor driver interface",
  "start_date": "2026-11-06",
  "deadline": "2026-11-20",
  "status": "active",
  "created_by": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
  "created_at": "2026-11-05T12:20:00Z"
}
```
- **Error Responses**:
  - `403 Forbidden`: User does not belong to this project's team.
  - `404 Not Found`: Project not found.

---

## 5. Tasks Domain (`/api/tasks` & `/api/projects/{project_id}/tasks`)

### 5.1 Create Task
- **Method & Path**: `POST /api/tasks`
- **Purpose**: Creates a task within a project, optionally assigning it to a team member, and records an activity audit event.
- **Authentication**: Bearer Token Required
- **Authorization & Cross-Team Defense**:
  - Caller must belong to the project's parent team.
  - If `assigned_to` is provided, that user **must** belong to the project's parent team.
- **Request Body**:
```json
{
  "project_id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
  "title": "Calibrate PWM outputs on motor controller",
  "description": "Verify frequency response using oscilloscope at 20kHz",
  "assigned_to": "9f1e2d3c-4b5a-6789-0123-abcdef456789",
  "priority": "high",
  "deadline": "2026-11-12",
  "status": "todo"
}
```
| Field | Type | Required | Allowed Values / Constraints |
| :--- | :--- | :--- | :--- |
| `project_id` | `UUID` | Yes | Must be in caller's team |
| `title` | `string` | Yes | 1–200 chars |
| `description` | `string` | No | Nullable text |
| `assigned_to` | `UUID` | No | Nullable; must belong to project's team |
| `priority` | `string` | No | `'low'`, `'medium'`, `'high'` (default `'medium'`) |
| `deadline` | `string` | No | ISO Date `YYYY-MM-DD` or null |
| `status` | `string` | No | `'todo'`, `'in_progress'`, `'done'` (default `'todo'`) |

- **Response (201 Created)**:
```json
{
  "id": "5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f",
  "project_id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
  "title": "Calibrate PWM outputs on motor controller",
  "description": "Verify frequency response using oscilloscope at 20kHz",
  "assigned_to": "9f1e2d3c-4b5a-6789-0123-abcdef456789",
  "assignee_name": "Elena Rostova",
  "created_by": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
  "creator_name": "Marcus Vance",
  "status": "todo",
  "priority": "high",
  "deadline": "2026-11-12",
  "created_at": "2026-11-05T12:30:00Z",
  "updated_at": "2026-11-05T12:30:00Z"
}
```
- **Error Responses**:
  - `400 Bad Request`: Cross-team assignment violation (`{"detail": "Assigned user is not a member of this project's team."}`).
  - `403 Forbidden`: Caller is not a member of the project team.
  - `404 Not Found`: Project not found.

---

### 5.2 Update Task (PATCH)
- **Method & Path**: `PATCH /api/tasks/{task_id}`
- **Purpose**: Modifies task details, reassigns members, or transitions Kanban status (`todo` -> `in_progress` -> `done`). Triggers activity log for significant changes.
- **Authentication**: Bearer Token Required
- **Authorization & Cross-Team Defense**:
  - Caller must belong to the task's project team.
  - If `assigned_to` is updated, new user must belong to the task's project team.
- **Request Body (Partial Update)**:
```json
{
  "status": "in_progress",
  "priority": "high"
}
```
| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `title` | `string` | No | 1–200 chars |
| `description` | `string` | No | Text or null |
| `assigned_to` | `UUID` | No | UUID of team member or null to unassign |
| `status` | `string` | No | `'todo'`, `'in_progress'`, `'done'` |
| `priority` | `string` | No | `'low'`, `'medium'`, `'high'` |
| `deadline` | `string` | No | ISO Date or null |

- **Response (200 OK)**:
```json
{
  "id": "5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f",
  "project_id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
  "title": "Calibrate PWM outputs on motor controller",
  "description": "Verify frequency response using oscilloscope at 20kHz",
  "assigned_to": "9f1e2d3c-4b5a-6789-0123-abcdef456789",
  "assignee_name": "Elena Rostova",
  "created_by": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
  "creator_name": "Marcus Vance",
  "status": "in_progress",
  "priority": "high",
  "deadline": "2026-11-12",
  "created_at": "2026-11-05T12:30:00Z",
  "updated_at": "2026-11-05T12:45:00Z"
}
```
- **Error Responses**:
  - `400 Bad Request`: Reassignment to non-team member.
  - `403 Forbidden`: Caller not in task's project team.
  - `404 Not Found`: Task not found.

---

### 5.3 List Project Tasks (with Multi-Criteria Filtering)
- **Method & Path**: `GET /api/projects/{project_id}/tasks`
- **Purpose**: Powers the interactive Kanban board and list views with filtering by status, priority, and assignee.
- **Authentication**: Bearer Token Required
- **Query Parameters**:
  - `status` (string, optional): Filter by `'todo'`, `'in_progress'`, `'done'`.
  - `priority` (string, optional): Filter by `'low'`, `'medium'`, `'high'`.
  - `assigned_to` (UUID, optional): Filter by user ID (or string `'unassigned'`).
- **Authorization**: Caller must belong to the project team.
- **Response (200 OK)**:
```json
[
  {
    "id": "5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f",
    "project_id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
    "title": "Calibrate PWM outputs on motor controller",
    "description": "Verify frequency response using oscilloscope at 20kHz",
    "assigned_to": "9f1e2d3c-4b5a-6789-0123-abcdef456789",
    "assignee_name": "Elena Rostova",
    "created_by": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
    "creator_name": "Marcus Vance",
    "status": "in_progress",
    "priority": "high",
    "deadline": "2026-11-12",
    "is_overdue": false,
    "created_at": "2026-11-05T12:30:00Z",
    "updated_at": "2026-11-05T12:45:00Z"
  }
]
```

---

## 6. Analytics & Activity Auditing Domain

### 6.1 Get Project Analytics
- **Method & Path**: `GET /api/projects/{project_id}/analytics`
- **Purpose**: Computes real-time project metrics, completion percentage, overdue counts, individual completed task counts, and workload imbalance warnings.
- **Authentication**: Bearer Token Required
- **Authorization**: Caller must belong to the project's team.
- **Response (200 OK)**:
```json
{
  "project_id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
  "project_name": "Chassis & Motor Controller Build",
  "completion_percentage": 58.3,
  "summary": {
    "total_tasks": 12,
    "completed_tasks": 7,
    "in_progress_tasks": 3,
    "todo_tasks": 2,
    "overdue_tasks": 1,
    "unassigned_tasks": 1
  },
  "workload_distribution": [
    {
      "user_id": "9f1e2d3c-4b5a-6789-0123-abcdef456789",
      "full_name": "Elena Rostova",
      "assigned_tasks": 7,
      "completed_tasks": 4,
      "in_progress_tasks": 2,
      "todo_tasks": 1,
      "workload_share_percentage": 58.3
    },
    {
      "user_id": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
      "full_name": "Marcus Vance",
      "assigned_tasks": 4,
      "completed_tasks": 3,
      "in_progress_tasks": 1,
      "todo_tasks": 0,
      "workload_share_percentage": 33.3
    }
  ],
  "imbalance_warnings": [
    "Workload Concentration: Elena Rostova holds 58.3% of all project tasks.",
    "Overdue Alert: 1 task is past its designated deadline."
  ]
}
```

#### Imbalance Calculation Rule
1. **Workload Concentration Warning**: Triggered if any single member holds $\ge 50\%$ of all assigned tasks in projects with at least 4 tasks and more than 1 member.
2. **Idle Member Warning**: Triggered if an active team member has 0 assigned tasks while more than 4 tasks are active.
3. **Overdue Warning**: Triggered if any task with `status != 'done'` has `deadline < current_date`.

---

### 6.2 Get Team Activity Feed
- **Method & Path**: `GET /api/teams/{team_id}/activity`
- **Purpose**: Chronological audit feed of all actions occurring across the team's projects.
- **Authentication**: Bearer Token Required
- **Query Parameters**:
  - `project_id` (UUID, optional): Filter activity to a single project.
  - `limit` (integer, default 30, max 100): Number of records.
- **Authorization**: Caller must belong to the team.
- **Response (200 OK)**:
```json
[
  {
    "id": "11223344-5566-7788-99aa-bbccddeeff00",
    "project_id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
    "project_name": "Chassis & Motor Controller Build",
    "task_id": "5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f",
    "task_title": "Calibrate PWM outputs on motor controller",
    "user_id": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
    "user_name": "Marcus Vance",
    "action": "status_changed",
    "old_value": "todo",
    "new_value": "in_progress",
    "created_at": "2026-11-05T12:45:00Z"
  },
  {
    "id": "22334455-6677-8899-aabb-ccddeeff0011",
    "project_id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
    "project_name": "Chassis & Motor Controller Build",
    "task_id": "5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f",
    "task_title": "Calibrate PWM outputs on motor controller",
    "user_id": "e2a1b5c4-789a-4b12-9c34-d5e6f7a8b9c0",
    "user_name": "Marcus Vance",
    "action": "task_created",
    "old_value": null,
    "new_value": null,
    "created_at": "2026-11-05T12:30:00Z"
  }
]
```

---

## 7. Action Type Reference for Activity Logs

| Action String | Trigger Event | `old_value` | `new_value` |
| :--- | :--- | :--- | :--- |
| `task_created` | Creation of a new task | `null` | Task title |
| `status_changed` | Moving task between columns | Old status (`todo`) | New status (`in_progress`) |
| `task_assigned` | Assigning/reassigning task | Previous assignee name/null | New assignee name/null |
| `priority_changed` | Modifying task priority | Old priority (`low`) | New priority (`high`) |
| `deadline_changed` | Setting or extending deadline | Old date string/null | New date string |
| `project_created` | Initiation of new project | `null` | Project name |

