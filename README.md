# Staff Evaluation System — System Design Document

> **Bachelor Thesis Project — Peer Review Hub for Academic Staff Evaluation**
> A web-based platform supporting 360° peer assessment of faculty members across configurable evaluation periods, with role-based administration, quantitative reporting, and Microsoft OAuth 2.0 single sign-on.

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Design](#2-architecture-design)
3. [Use Cases](#3-use-cases)
4. [System Flows](#4-system-flows)
5. [Database Design](#5-database-design)
6. [API Design](#6-api-design)
7. [Security Design](#7-security-design)
8. [Quality Assurance](#8-quality-assurance)
9. [Appendix](#appendix)

---

## 1. Introduction

### 1.1 Project Overview

The **Staff Evaluation System** (Peer Review Hub) is a full-stack web application designed to digitise and standardise the periodic peer-review process for academic staff at a university department. It replaces paper-based and spreadsheet-based workflows with a centralised platform that supports evaluation period lifecycle management, configurable criteria, role-based access control, and quantitative analytics (radar and bar charts, CSV export).

The system is implemented as a decoupled single-page application (SPA) consuming a RESTful backend, with a relational database of record. It targets deployment on modest on-premise hardware and supports both local-credential and institutional single sign-on authentication.

### 1.2 Problem Statement

Academic departments conduct recurring peer-review cycles to support promotion decisions, quality assurance, and workforce development. In the absence of a dedicated system, the process typically suffers from:

- **Data fragmentation** — scores held in disparate spreadsheets, with no canonical record per period.
- **Auditability gaps** — no immutable trail of who evaluated whom, when, and on what criteria.
- **Role confusion** — administrators, group moderators, and reviewers share the same artefacts with no enforced authorisation boundary.
- **Reporting overhead** — aggregation, ranking, and chart generation are performed manually at the end of each period.
- **Authentication friction** — separate credentials increase onboarding cost and weaken overall security posture.

### 1.3 Objectives

**Functional objectives**

1. Allow each faculty member to submit quantitative evaluations (0–4 scale) for peers within their assigned groups during an active evaluation period.
2. Provide administrators with full CRUD over staff, organisation units, groups, evaluation criteria, and evaluation periods.
3. Enforce exactly one active evaluation period at any time; auto-deactivate siblings on activation.
4. Deliver aggregate reporting (per-question averages, ranking tables, radar charts) and data export (CSV).
5. Support Microsoft OAuth 2.0 SSO alongside local email/password credentials.

**Non-functional objectives**

| Attribute | Target |
|---|---|
| Availability | Single-node availability sufficient for departmental use (≥ 99% during business hours) |
| Response time | p95 < 300 ms for read endpoints under 50 concurrent users |
| Security | OWASP Top 10 mitigations; Argon2id password hashing; short-lived access tokens |
| Maintainability | Modular NestJS backend; typed React SPA; ≥ 60% unit test coverage on services |
| Portability | Containerisable deployment (Docker Compose); PostgreSQL-compatible schema |
| Accessibility | WCAG 2.1 AA for principal workflows |

### 1.4 Scope and Limitations

**In scope:** peer evaluation, group and period management, role-based authorisation, quantitative reporting, Microsoft SSO, CSV export.

**Out of scope:** qualitative (free-text) reviews, multi-tenant isolation, mobile native clients, real-time notifications, integration with HR systems of record.

### 1.5 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React 18 + TypeScript, Vite, TanStack Query, Tailwind CSS, shadcn/ui, Recharts | Mature SPA ecosystem; strict typing; declarative server-state management |
| **Backend** | NestJS 11, Prisma 5 ORM, Passport.js (JWT + Microsoft OAuth) | Modular DI architecture; compile-time SQL safety via Prisma |
| **Database** | PostgreSQL 16 | ACID guarantees; rich indexing; strong ecosystem support |
| **Authentication** | JWT (access + refresh), Microsoft OAuth 2.0 | Stateless API; institutional SSO integration |
| **Testing** | Jest (backend), Vitest + React Testing Library (frontend) | Industry-standard tooling aligned with chosen frameworks |
| **Infrastructure** | Docker, Docker Compose | Reproducible environments; portable deployment |

---

## 2. Architecture Design

### 2.1 Architectural Style

The system follows a **three-tier, layered client–server architecture** with a clear separation of concerns:

- **Presentation tier** — React SPA rendered client-side; communicates only via HTTPS REST.
- **Application tier** — NestJS modular monolith exposing a versionable REST API; organised by bounded context (Auth, Staff, Groups, Evaluations, …).
- **Data tier** — PostgreSQL accessed exclusively through Prisma; the database is the single source of truth.

A monolithic backend was chosen over microservices to match project scale (single department, ~10² users), minimise operational complexity, and keep transactional boundaries simple. Modules remain independently testable, leaving the door open to future extraction.

### 2.2 High-Level Architecture

```mermaid
flowchart TB
    subgraph CLIENTS["Clients"]
        Browser["Web Browser<br/>(React SPA)"]
        Mobile["Mobile Web<br/>(responsive)"]
        AdminPortal["Administrator<br/>Workspace"]
    end

    Browser & Mobile & AdminPortal -->|HTTPS / JSON| API_GATEWAY

    subgraph API_GATEWAY["Application Tier — NestJS"]
        Auth["Auth<br/>Module"]
        Staff["Staff<br/>Module"]
        Groups["Groups<br/>Module"]
        Evaluations["Evaluations<br/>Module"]
        Questions["Questions<br/>Module"]
        OrgUnits["Organization<br/>Units Module"]
        Periods["Evaluation<br/>Periods Module"]
        Users["Users<br/>Module"]
    end

    API_GATEWAY --> DATA_LAYER

    subgraph DATA_LAYER["Data Tier"]
        Prisma["Prisma ORM<br/>(type-safe query builder)"]
        subgraph PostgreSQL["PostgreSQL 16"]
            staff_db[(staff)]
            groups_db[(groups)]
            questions_db[(questions)]
            evaluations_db[(evaluations)]
            profiles_db[(profiles)]
            periods_db[(evaluation_periods)]
        end
        Prisma --> PostgreSQL
    end
```

### 2.3 Component Architecture

```mermaid
flowchart TB
    subgraph FRONTEND["Frontend (React SPA)"]
        subgraph Pages
            AuthPage["Auth"]
            AuthCallback["AuthCallback"]
            Dashboard["Dashboard"]
            Assessment["Assessment"]
            History["History"]
            Profile["Profile"]
            NotFound["NotFound"]
            subgraph Admin
                AdminStaff["Staff"]
                AdminGroups["Groups"]
                AdminQuestions["Questions"]
                AdminPeriods["Periods"]
                AdminResults["Results"]
                AdminCharts["Charts"]
                AdminRoles["Roles"]
            end
        end
        subgraph Components
            AppSidebar["AppSidebar"]
            MainLayout["MainLayout"]
            NavLink["NavLink"]
            ProtectedRoute["ProtectedRoute"]
            UI["shadcn/ui primitives"]
        end
        subgraph Hooks
            useAuth["useAuth"]
            useStaff["useStaff"]
            useToast["useToast"]
            useMobile["useMobile"]
        end
        State["Server state:<br/>TanStack Query"]
        APIClient["API Client<br/>(typed fetch wrapper)"]
    end

    APIClient --> BACKEND

    subgraph BACKEND["Backend (NestJS)"]
        subgraph Controllers
            AuthController["AuthController"]
            StaffController["StaffController"]
            GroupsController["GroupsController"]
            QuestionsController["QuestionsController"]
            EvaluationsController["EvaluationsController"]
            PeriodsController["EvaluationPeriodsController"]
            OrgUnitsController["OrganizationUnitsController"]
            UsersController["UsersController"]
        end
        subgraph Services
            AuthService["AuthService"]
            MSOAuthService["MicrosoftOAuthService"]
            StaffService["StaffService"]
            GroupsService["GroupsService"]
            QuestionsService["QuestionsService"]
            EvaluationsService["EvaluationsService"]
            PeriodsService["EvaluationPeriodsService"]
            OrgUnitsService["OrganizationUnitsService"]
            UsersService["UsersService"]
        end
        subgraph CrossCutting["Cross-cutting"]
            JwtAuthGuard["JwtAuthGuard"]
            RolesGuard["RolesGuard"]
            CurrentUser["@CurrentUser"]
            Roles["@Roles"]
            ValidationPipe["ValidationPipe"]
            Throttler["ThrottlerGuard"]
        end
        PrismaService["PrismaService<br/>(singleton DI provider)"]
    end
```

### 2.4 Design Decisions and Rationale

| Decision | Alternative considered | Rationale |
|---|---|---|
| Modular monolith (NestJS) | Microservices | Scale does not warrant distributed complexity; transactional evaluations are easier to reason about in a single process. |
| Prisma ORM | Raw SQL / TypeORM | Compile-time type safety, generated client, migration tooling; mitigates SQL-injection and schema-drift risks. |
| JWT (stateless) + refresh token | Server-side sessions | Horizontal scalability; simplifies CORS; tokens short-lived to limit blast radius. |
| Argon2id password hashing | bcrypt | Memory-hard; OWASP-recommended for new systems. |
| TanStack Query (server state) | Redux | Caching, revalidation, and mutation semantics align with REST; less boilerplate. |
| Single `evaluations` table with composite unique key | Separate tables per period | Keeps aggregate queries simple; period is a foreign key, not a namespace. |

### 2.5 Deployment Architecture

**Local development** — Vite dev server (frontend, port 8080) and NestJS with hot reload (backend, port 3001) consume a containerised PostgreSQL instance.

**Production** — The application is packaged as two container images served behind a reverse proxy that terminates TLS.

```mermaid
flowchart TB
    subgraph Internet
        Users["End Users<br/>(HTTPS)"]
    end

    Users --> Proxy

    subgraph Host["Single-Node Deployment"]
        Proxy["Reverse Proxy<br/>(TLS termination)"]
        FE["Frontend Container<br/>(static assets + Nginx)"]
        BE["Backend Container<br/>(NestJS, port 3001)"]
        DB[("PostgreSQL 16<br/>Container<br/>(persistent volume)")]
    end

    Proxy --> FE
    Proxy --> BE
    BE --> DB
```

---

## 3. Use Cases

### 3.1 Actors

| Actor | Description |
|-------|-------------|
| **Guest** | Unauthenticated visitor; may only access the login and OAuth callback routes |
| **User** | Authenticated staff member; may evaluate peers in their groups and view their own records |
| **Moderator** | User + read-only access to group-level reports and charts |
| **Admin** | Full CRUD on all entities, evaluation-period lifecycle management, CSV export |

### 3.2 Use-Case Diagram

```mermaid
flowchart LR
    Guest((Guest))
    User((User))
    Mod((Moderator))
    Admin((Admin))

    Guest --- UC01[UC-01<br/>Authenticate]
    User --- UC02[UC-02<br/>Submit Peer Evaluation]
    User --- UC05[UC-05<br/>View Own History]
    Mod --- UC06[UC-06<br/>View Group Reports]
    Admin --- UC03[UC-03<br/>Manage Periods]
    Admin --- UC04[UC-04<br/>View Results & Charts]
    Admin --- UC07[UC-07<br/>Manage Staff & Groups]
    Admin --- UC08[UC-08<br/>Manage Criteria]
    Admin --- UC09[UC-09<br/>Manage Roles]

    User --- UC01
    Mod --- UC01
    Admin --- UC01
    Mod --- UC02
    Admin --- UC02
```

### 3.3 Use Case Details

#### UC-01: Authenticate

| Field | Description |
|-------|-------------|
| **Actor** | Guest |
| **Precondition** | User holds valid local credentials or an institutional Microsoft account |
| **Main Flow** | 1. User submits email/password, or initiates Microsoft OAuth.<br>2. System verifies credentials (Argon2id) or validates the OAuth callback.<br>3. System issues a short-lived access token and a refresh token.<br>4. Client persists tokens and redirects to the dashboard. |
| **Alt Flows** | Invalid credentials → 401 with generic error.<br>OAuth denial → redirect to login with error banner. |
| **Postcondition** | Authenticated session established; subsequent requests carry the bearer token. |

#### UC-02: Submit Peer Evaluation

| Field | Description |
|-------|-------------|
| **Actor** | User |
| **Precondition** | User is authenticated, linked to a staff record, a member of at least one group, and an active evaluation period exists. |
| **Main Flow** | 1. User selects a group from their assigned list.<br>2. User selects a colleague from that group (self-selection is disallowed).<br>3. System loads evaluation criteria and any existing scores for the active period.<br>4. User rates each criterion on the 0–4 scale.<br>5. User submits; system validates and upserts the evaluation set atomically. |
| **Alt Flow** | User has already evaluated this colleague this period → existing scores are loaded for editing. |
| **Postcondition** | Evaluation records exist for each (reviewer, evaluatee, question, group, period) tuple. |

#### UC-03: Manage Evaluation Periods

| Field | Description |
|-------|-------------|
| **Actor** | Admin |
| **Precondition** | Admin is authenticated. |
| **Main Flow** | 1. Admin creates a period with a name and start/end dates.<br>2. Admin activates it — the system automatically deactivates any other active period in a single transaction.<br>3. Staff submit evaluations while the period is active.<br>4. Admin closes the period to freeze the result set. |
| **Invariant** | At most one period has status `active` at any time. |

#### UC-04: View Results & Radar Charts

| Field | Description |
|-------|-------------|
| **Actor** | Admin, Moderator (scope-limited) |
| **Precondition** | Selected period has at least one submitted evaluation. |
| **Main Flow** | 1. Admin selects a period.<br>2. System displays a ranking table with per-question averages and overall score.<br>3. Admin drills into a staff member; a radar chart visualises per-criterion strengths.<br>4. Admin exports the result set to CSV. |
| **Postcondition** | Report is rendered or an export file is downloaded. |

---

## 4. System Flows

### 4.1 Authentication Flow (Local Credentials)

```mermaid
sequenceDiagram
    participant Client
    participant NestJS
    participant Prisma
    participant PostgreSQL

    Client->>NestJS: POST /auth/login<br/>{email, password}
    NestJS->>Prisma: findUnique(email)
    Prisma->>PostgreSQL: SELECT user + roles
    PostgreSQL-->>Prisma: record
    Prisma-->>NestJS: user + roles
    Note over NestJS: Verify password (Argon2id)
    Note over NestJS: Sign JWT access + refresh
    NestJS-->>Client: {accessToken, refreshToken, user}
    Note over Client: Persist tokens<br/>(memory + localStorage)
```

### 4.2 Authentication Flow (Microsoft OAuth 2.0)

```mermaid
sequenceDiagram
    participant Client
    participant NestJS
    participant Microsoft
    participant PostgreSQL

    Client->>NestJS: GET /auth/microsoft
    NestJS-->>Client: 302 → Microsoft authorize URL
    Client->>Microsoft: Authorize (user consent)
    Microsoft-->>NestJS: GET /auth/microsoft/callback?code
    NestJS->>Microsoft: Exchange code for id_token
    Microsoft-->>NestJS: id_token (user claims)
    NestJS->>PostgreSQL: Upsert user by microsoft_id
    NestJS-->>Client: 302 with one-time code
    Client->>NestJS: POST /auth/microsoft/token {code}
    NestJS-->>Client: {accessToken, refreshToken, user}
```

### 4.3 Peer Evaluation Flow

```mermaid
sequenceDiagram
    participant Client
    participant NestJS
    participant Prisma
    participant PostgreSQL

    Client->>NestJS: GET /evaluations/my-groups (JWT)
    Note over NestJS: Validate JWT, extract staffId
    NestJS->>Prisma: Find groups for staffId
    Prisma-->>NestJS: groups
    NestJS-->>Client: [groups]

    Note over Client: User selects group & colleague

    Client->>NestJS: GET /questions
    NestJS-->>Client: [questions]

    Client->>NestJS: GET /evaluations/my?groupId=X&periodId=Y
    NestJS-->>Client: [existing scores]

    Note over Client: User fills scores (0–4)

    Client->>NestJS: POST /evaluations/bulk<br/>{groupId, evaluateeId, periodId, evaluations}
    Note over NestJS: Validate:<br/>• not self-evaluation<br/>• same group membership<br/>• period is active<br/>• each score ∈ [0,4]
    NestJS->>Prisma: Upsert evaluations (transaction)
    Prisma-->>NestJS: success
    NestJS-->>Client: [evaluations]
```

### 4.4 User Journey

```mermaid
flowchart TB
    Login["Login<br/>(Email/Password or Microsoft)"] --> Dashboard["Dashboard<br/>Overview + Stats + Received Score"]

    Dashboard --> Assessment["Assessment"]
    Dashboard --> History["History<br/>(Received + Given)"]
    Dashboard --> Profile["Profile"]
    Dashboard --> AdminPanel["Admin Panel<br/>(Admin / Moderator)"]

    Assessment --> SelectGroup["Select Group"]
    SelectGroup --> SelectColleague["Select Colleague"]
    SelectColleague --> RateQuestions["Rate Criteria (0–4)"]
    RateQuestions --> Submit["Submit & Confirm"]

    AdminPanel --> ManageStaff["Staff"]
    AdminPanel --> ManageGroups["Groups"]
    AdminPanel --> ManagePeriods["Periods"]
    AdminPanel --> ManageQuestions["Criteria"]
    AdminPanel --> ViewResults["Results<br/>Radar + CSV"]
    AdminPanel --> ViewCharts["Bar / Pie Charts"]
    AdminPanel --> ManageRoles["Roles"]
```

### 4.5 Evaluation Period State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft: Admin creates period
    Draft --> Active: Admin activates<br/>(auto-deactivate siblings)
    Active --> Closed: Admin closes period
    Active --> Draft: Admin deactivates
    Closed --> [*]
    Draft --> [*]: Admin deletes (if no evaluations)
```

---

## 5. Database Design

The schema shown below is authoritative: it is generated from `staffEvaluation-api/prisma/schema.prisma` and verified against the running PostgreSQL 16 instance (database `peer_review_hub`).

### 5.1 Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o| profiles : "has"
    users ||--o{ user_roles : "has"
    profiles |o--o| staff : "links to"

    organizationunits ||--o{ staff : "has"
    organizationunits ||--o{ groups : "contains"

    staff ||--o{ staff2groups : "belongs to"
    staff ||--o{ evaluations : "reviews (reviewer)"
    staff ||--o{ evaluations : "receives (evaluatee)"

    groups ||--o{ staff2groups : "has members"
    groups ||--o{ evaluations : "context for"
    groups ||--o{ subjects : "has"

    questions ||--o{ evaluations : "criterion for"
    evaluation_periods ||--o{ evaluations : "belongs to"

    users {
        UUID id PK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR provider "DEFAULT 'local'"
        VARCHAR microsoft_id UK
        INT token_version "NOT NULL DEFAULT 0"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    profiles {
        UUID id PK
        UUID user_id FK_UK
        INT staff_id FK_UK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    user_roles {
        UUID id PK
        UUID user_id FK
        ENUM role
        TIMESTAMP created_at
    }

    organizationunits {
        SERIAL id PK
        VARCHAR name UK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    staff {
        SERIAL id PK
        VARCHAR name "NOT NULL"
        VARCHAR staffcode "UNIQUE NOT NULL"
        VARCHAR emails "UNIQUE"
        VARCHAR emailh
        ENUM sex
        TIMESTAMP birthday
        VARCHAR mobile
        VARCHAR academicdegree
        VARCHAR academicrank
        VARCHAR position
        BOOLEAN is_party_member "DEFAULT false"
        VARCHAR bidv
        VARCHAR avatar
        INT organizationunitid FK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    groups {
        SERIAL id PK
        VARCHAR name
        INT organizationunitid FK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    staff2groups {
        SERIAL id PK
        INT staffid FK
        INT groupid FK
    }

    questions {
        SERIAL id PK
        VARCHAR title
        VARCHAR description
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    subjects {
        SERIAL id PK
        VARCHAR subjectid
        VARCHAR name
        INT groupid FK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    evaluation_periods {
        SERIAL id PK
        VARCHAR name
        VARCHAR description
        TIMESTAMP start_date
        TIMESTAMP end_date
        ENUM status "DEFAULT 'draft'"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    evaluations {
        SERIAL id PK
        INT reviewerid FK
        INT evaluatee_id FK
        INT questionid FK
        INT groupid FK
        INT periodid FK
        DOUBLE point "NOT NULL DEFAULT 0"
        TIMESTAMP created_at
        TIMESTAMP modifieddate
    }
```

### 5.2 Normalisation

The schema is designed to satisfy **Third Normal Form (3NF)**:

- Every non-key attribute is fully functionally dependent on the primary key.
- No transitive dependencies between non-key attributes.
- Many-to-many relationships (staff ↔ groups) are resolved through the `staff2groups` junction table.
- Authentication (`users`) is deliberately separated from HR identity (`staff`), bridged through `profiles` to support staff records that do not yet have a login and logins that are not yet linked to a staff entry.

### 5.3 Enumerated Types

PostgreSQL enum types are used for finite-domain attributes; enums are referenced from the ERD by name.

| Enum | Values | Used by |
|---|---|---|
| `AppRole` | `admin`, `moderator`, `user` | `user_roles.role` |
| `gender` | `male`, `female` | `staff.sex` |
| `period_status` | `draft`, `active`, `closed` | `evaluation_periods.status` (default `draft`) |

> **Implementation note.** Attributes labelled `UUID` in the ERD are stored as PostgreSQL `text` by Prisma's `String @id @default(uuid())`; the UUID label is retained in the ERD to communicate intent. Attributes labelled `TIMESTAMP` correspond to Prisma `DateTime`, materialised as `timestamp(3) without time zone` in the live schema — including `staff.birthday` and the period date range, which are semantically date-only but physically stored as timestamps.

### 5.4 Key Constraints

| Constraint | Type | Description |
|---|---|---|
| `staff.staffcode` | UNIQUE | Institutional staff identifier |
| `staff.emails` | UNIQUE | Primary institutional email |
| `organizationunits.name` | UNIQUE | Department name |
| `staff2groups(staffid, groupid)` | UNIQUE | Prevents duplicate group membership |
| `evaluations(reviewerid, evaluatee_id, groupid, questionid, periodid)` | UNIQUE | Guarantees one score per reviewer/evaluatee/question/group/period |
| `user_roles(userId, role)` | UNIQUE | Prevents duplicate role assignments |

### 5.5 Indexes

```sql
-- Single-column indexes
CREATE INDEX idx_staff_organizationunitid ON staff(organizationunitid);
CREATE INDEX idx_groups_organizationunitid ON groups(organizationunitid);
CREATE INDEX idx_staff2groups_staffid ON staff2groups(staffid);
CREATE INDEX idx_staff2groups_groupid ON staff2groups(groupid);
CREATE INDEX idx_evaluations_reviewerid ON evaluations(reviewerid);
CREATE INDEX idx_evaluations_evaluateeid ON evaluations(evaluatee_id);
CREATE INDEX idx_evaluations_groupid ON evaluations(groupid);
CREATE INDEX idx_evaluations_questionid ON evaluations(questionid);
CREATE INDEX idx_evaluations_periodid ON evaluations(periodid);

-- Composite indexes matching the most frequent query patterns
CREATE INDEX idx_evaluations_reviewer_period ON evaluations(reviewerid, periodid);
CREATE INDEX idx_evaluations_evaluatee_period ON evaluations(evaluatee_id, periodid);
CREATE INDEX idx_evaluations_evaluatee_group_period
    ON evaluations(evaluatee_id, groupid, periodid);
```

The composite indexes are chosen to cover the aggregate-per-period and per-evaluatee reporting queries, reducing them from full-table scans to index-only range scans.

---

## 6. API Design

### 6.1 Design Principles

- **RESTful resource orientation** — plural nouns, standard verbs, HTTP status semantics.
- **Stateless authentication** — every request carries a bearer token; no server-side session.
- **DTO validation** — all request payloads pass through `class-validator` schemas before reaching the service layer.
- **Least privilege** — each endpoint declares its minimum required role via the `@Roles` decorator.
- **OpenAPI documentation** — Swagger UI is served at `/api/docs` in development.

### 6.2 Endpoints Summary

#### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login with email/password | Public |
| POST | `/auth/refresh` | Rotate access token | Public (refresh) |
| GET | `/auth/me` | Get current user | JWT |
| GET | `/auth/microsoft` | Redirect to Microsoft authorize endpoint | Public |
| GET | `/auth/microsoft/callback` | Microsoft OAuth callback | Public |
| POST | `/auth/microsoft/token` | Exchange one-time code for JWT pair | Public |

#### Organization Units

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/organization-units` | List all | JWT |
| GET | `/organization-units/:id` | Get by ID | JWT |
| POST | `/organization-units` | Create | Admin |
| PATCH | `/organization-units/:id` | Update | Admin |
| DELETE | `/organization-units/:id` | Delete | Admin |

#### Staff

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/staff` | List all staff | JWT |
| GET | `/staff/:id` | Get by ID | JWT |
| POST | `/staff` | Create (name, staffcode required) | Admin |
| PATCH | `/staff/:id` | Partial update | Admin |
| DELETE | `/staff/:id` | Delete | Admin |

#### Groups

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/groups` | List all | JWT |
| GET | `/groups/:id` | Get by ID | JWT |
| GET | `/groups/:id/members` | Get group members | JWT |
| POST | `/groups` | Create | Admin |
| PATCH | `/groups/:id` | Update | Admin |
| PUT | `/groups/:id/members` | Replace members | Admin / Moderator |
| DELETE | `/groups/:id` | Delete | Admin |

#### Evaluation Periods

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/evaluation-periods` | List all periods | JWT |
| GET | `/evaluation-periods/active` | Get active period | JWT |
| POST | `/evaluation-periods` | Create period | Admin |
| PATCH | `/evaluation-periods/:id` | Update (auto-deactivates others if activating) | Admin |
| DELETE | `/evaluation-periods/:id` | Delete period | Admin |

#### Evaluations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/evaluations` | All evaluations (filtered) | Admin / Moderator |
| GET | `/evaluations/my` | My given evaluations | JWT |
| GET | `/evaluations/received` | My received evaluations | JWT |
| GET | `/evaluations/my-groups` | My groups | JWT |
| GET | `/evaluations/colleagues/:groupId` | Colleagues in group | JWT |
| GET | `/evaluations/staff2groups` | Staff-to-groups mapping | Admin / Moderator |
| POST | `/evaluations/bulk` | Submit bulk evaluation | JWT |

#### Questions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/questions` | List all questions | JWT |
| POST | `/questions` | Create question | Admin |
| PATCH | `/questions/:id` | Update question | Admin |
| DELETE | `/questions/:id` | Delete question | Admin |

#### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/profiles` | List all user profiles | Admin |
| GET | `/users/profile` | Get my profile | JWT |
| POST | `/users/link-staff` | Link user to staff record | Admin |
| GET | `/users/roles` | Users with roles | Admin |
| POST | `/users/:userId/roles` | Add role to user | Admin |
| DELETE | `/users/:userId/roles/:role` | Remove role | Admin |

### 6.3 Request / Response Examples

#### Login

**Request**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response 200**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "staffId": 42,
    "roles": ["user"]
  }
}
```

#### Submit Bulk Evaluation

**Request**
```http
POST /evaluations/bulk
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "groupId": 1,
  "evaluateeId": 5,
  "periodId": 1,
  "evaluations": { "1": 3.5, "2": 4.0, "3": 3.0 }
}
```

**Response 201**
```json
[
  { "id": 10, "reviewerid": 2, "evaluateeid": 5, "questionid": 1, "groupid": 1, "periodid": 1, "point": 3.5 },
  { "id": 11, "reviewerid": 2, "evaluateeid": 5, "questionid": 2, "groupid": 1, "periodid": 1, "point": 4.0 },
  { "id": 12, "reviewerid": 2, "evaluateeid": 5, "questionid": 3, "groupid": 1, "periodid": 1, "point": 3.0 }
]
```

### 6.4 Standard Error Responses

| Status | Meaning | Typical cause |
|---|---|---|
| 400 | Bad Request | DTO validation failure |
| 401 | Unauthorized | Missing/expired token |
| 403 | Forbidden | Role-guard rejection |
| 404 | Not Found | Resource absent |
| 409 | Conflict | Unique-constraint violation (e.g., duplicate staffcode) |
| 422 | Unprocessable Entity | Business-rule violation (e.g., self-evaluation) |
| 429 | Too Many Requests | Rate limit exceeded |

---

## 7. Security Design

### 7.1 Authentication

- **Local credentials** — Argon2id password hashing (memory-hard, side-channel resistant), enforced password complexity policy.
- **Institutional SSO** — Microsoft OAuth 2.0 authorisation-code flow; account linking by verified email.
- **Token strategy** — JWT access token (15 min) + refresh token (7 days); refresh rotation on use.

### 7.2 Authorisation Model

The system implements **role-based access control (RBAC)** through NestJS guards:

| Role | Capabilities |
|------|--------------|
| **user** | View own groups, submit evaluations, read own received and given scores |
| **moderator** | `user` + read-only group reports and charts |
| **admin** | `moderator` + CRUD on all entities, period lifecycle, role management, CSV export |

Controller methods declare required roles via the `@Roles` decorator; `RolesGuard` enforces them after `JwtAuthGuard` authentication.

### 7.3 Security Controls

| Concern | Control |
|---------|---------|
| Rate limiting | NestJS Throttler (100 requests / minute / IP) |
| CORS | Explicit origin whitelist; credentials allowed only for trusted origins |
| Input validation | `class-validator` DTOs with `whitelist` and `forbidNonWhitelisted` |
| SQL injection | Prisma parameterised queries; no dynamic SQL |
| XSS | React auto-escaping + strict Content Security Policy headers |
| CSRF | Not applicable — stateless bearer-token API; browsers cannot forge `Authorization` headers cross-origin |
| Transport | HTTPS-only in production; HSTS via reverse proxy |
| Secrets | Environment-variable injection; no secrets in the repository |
| HTTP headers | Helmet middleware (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, …) |
| Audit | `created_at` / `updated_at` on every mutable row |

### 7.4 Domain Invariants

- **No self-evaluation** — `reviewerId ≠ evaluateeId` enforced at the service layer.
- **Group membership required** — reviewer and evaluatee must belong to the same group.
- **Active period required** — evaluations only accepted while the referenced period is `active`.
- **Score range** — each score ∈ [0, 4], validated server-side.
- **Single active period** — activation is performed inside a transaction that deactivates all siblings.
- **Uniqueness** — the composite unique constraint on `evaluations` prevents duplicate submissions.

### 7.5 Threat Model (STRIDE summary)

| Threat | Mitigation |
|---|---|
| Spoofing | Argon2id + JWT signature verification; OAuth state parameter |
| Tampering | HTTPS; JWT signature; DTO validation |
| Repudiation | `created_at` / `modifieddate` timestamps; immutable evaluation keys |
| Information disclosure | Role guards; minimal JWT claims; no PII in logs |
| Denial of service | Throttler; connection pool limits; reverse proxy timeouts |
| Elevation of privilege | Explicit role checks on every mutating endpoint |

---

## 8. Quality Assurance

### 8.1 Testing Strategy

A layered testing strategy is applied across the stack:

| Layer | Tooling | Coverage target |
|---|---|---|
| Backend — unit (services) | Jest | ≥ 70% line coverage |
| Backend — integration (controllers + guards) | Jest + NestJS testing module | Critical paths |
| Frontend — component | Vitest + React Testing Library | Core interactive components |
| Frontend — hooks | Vitest | `useAuth`, `useStaff`, mutation hooks |
| End-to-end | Manual scripted scenarios (see `docs/`) | Smoke + primary flows |

### 8.2 Static Analysis and Style

- **TypeScript strict mode** on both frontend and backend.
- **ESLint + Prettier** enforce style and catch common bugs.
- **Prisma schema validation** during CI prevents drift between migrations and client.

### 8.3 Observability

- Structured JSON logs at service boundaries.
- Request logging middleware records method, path, status, and latency.
- Health endpoint (`/health`) suitable for reverse-proxy probes.

### 8.4 Known Limitations and Future Work

| Area | Limitation | Proposed improvement |
|---|---|---|
| Scalability | Single-node deployment | Horizontal scaling behind a load balancer; Redis-backed refresh-token store |
| Notifications | None | Email/SMTP notifications for period open/close |
| Qualitative feedback | Scores only | Free-text comment field per evaluation |
| Analytics | Per-period only | Longitudinal trend analysis across periods |
| Audit | Timestamp-based only | Full append-only audit log table |
| Localisation | Bilingual EN/VN | i18n framework with additional locales |

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Staff** | Faculty member (*Giảng viên*) |
| **Group** | Collection of staff who evaluate each other (*Nhóm đánh giá*) |
| **Question** | Evaluation criterion (e.g., "Tinh thần trách nhiệm") |
| **Evaluation** | A single score given by a reviewer to an evaluatee on a question |
| **Reviewer** | Staff member issuing the evaluation |
| **Evaluatee** | Staff member receiving the evaluation |
| **Evaluation Period** | Time-bounded evaluation cycle (*Đợt đánh giá*) |
| **Organisation Unit** | Department or faculty (*Khoa*) |

### B. Vietnamese Field Mapping

| English | Vietnamese |
|---------|------------|
| Organisation Unit | Khoa |
| Staff | Giảng viên |
| Group | Nhóm đánh giá |
| Evaluation | Đánh giá |
| Evaluation Period | Đợt đánh giá |
| Question | Tiêu chí đánh giá |
| Academic Degree | Học vị (ThS, TS) |
| Academic Rank | Học hàm (PGS, GS) |
| Dashboard | Tổng quan |
| Assessment | Đánh giá đồng nghiệp |
| History | Tra cứu |
| Results | Kết quả |

### C. Repository Layout

```
staffEvaluationGR2/
├── staffEvaluation-api/       # NestJS backend (modules, services, Prisma schema)
├── staffEvaluation-hub/       # React + Vite frontend SPA
├── docker-compose.yml         # Development orchestration (DB + services)
├── docker-compose.prod.yml    # Production orchestration
├── docs/                      # Design notes, fix logs, reference material
└── README.md                  # This document
```

### D. Running the System Locally

1. `docker compose up -d` — starts PostgreSQL.
2. In `staffEvaluation-api/`: `pnpm install && pnpm prisma migrate dev && pnpm db:seed && pnpm start:dev`.
3. In `staffEvaluation-hub/`: `pnpm install && pnpm dev`.
4. Visit `http://localhost:8080`; default accounts are listed in `demo-accounts.md`.

### E. References

1. Fielding, R. T. *Architectural Styles and the Design of Network-based Software Architectures.* UC Irvine, 2000.
2. OWASP Foundation. *OWASP Top 10 — 2021.*
3. Biryukov, A., Dinu, D., Khovratovich, D. *Argon2: the memory-hard function for password hashing.* 2015.
4. Hardt, D. (ed.). *RFC 6749 — The OAuth 2.0 Authorization Framework.* IETF, 2012.
5. Jones, M., Bradley, J., Sakimura, N. *RFC 7519 — JSON Web Token (JWT).* IETF, 2015.
