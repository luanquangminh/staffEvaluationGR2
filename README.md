# Staff Evaluation System - System Design Document

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Design](#2-architecture-design)
3. [Use Cases](#3-use-cases)
4. [System Flows](#4-system-flows)
5. [Database Design](#5-database-design)
6. [API Design](#6-api-design)
7. [Security Design](#7-security-design)

---

## 1. Introduction

### 1.1 Project Overview

**Staff Evaluation System** (Peer Review Hub) is a web-based application for academic peer review and staff evaluation. It enables faculty members to evaluate their colleagues within designated groups using predefined evaluation criteria.

### 1.2 Goals

- Enable peer-to-peer evaluation among staff members
- Provide administrators with tools to manage staff, groups, and evaluation criteria
- Generate reports and analytics for evaluation results
- Ensure secure, role-based access control

### 1.3 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TanStack Query, Tailwind CSS, shadcn/ui |
| **Backend** | NestJS, Prisma ORM, Passport.js (JWT) |
| **Database** | PostgreSQL 16 |
| **Authentication** | JWT (Access + Refresh tokens) |

---

## 2. Architecture Design

### 2.1 High-Level Architecture

```mermaid
flowchart TB
    subgraph CLIENTS["CLIENTS"]
        Browser["Browser<br/>(React)"]
        Mobile["Mobile<br/>(Future)"]
        AdminPortal["Admin<br/>Portal"]
    end
    
    Browser & Mobile & AdminPortal -->|HTTPS| API_GATEWAY
    
    subgraph API_GATEWAY["API GATEWAY"]
        subgraph NestJS["NestJS Backend"]
            Auth["Auth<br/>Module"]
            Staff["Staff<br/>Module"]
            Groups["Groups<br/>Module"]
            Evaluations["Evaluations<br/>Module"]
            Questions["Questions<br/>Module"]
            Reports["Reports<br/>Module"]
            Users["Users<br/>Module"]
        end
    end
    
    NestJS --> DATA_LAYER
    
    subgraph DATA_LAYER["DATA LAYER"]
        Prisma["Prisma ORM"]
        subgraph PostgreSQL["PostgreSQL 16"]
            staff_db[(staff)]
            groups_db[(groups)]
            questions_db[(questions)]
            evaluations_db[(evaluations)]
            profiles_db[(profiles)]
        end
        Prisma --> PostgreSQL
    end
```

### 2.2 Component Architecture

```mermaid
flowchart TB
    subgraph FRONTEND["FRONTEND (React)"]
        subgraph Pages
            AuthPage["Auth"]
            Dashboard["Dashboard"]
            Assessment["Assessment"]
            Profile["Profile"]
            subgraph Admin
                AdminStaff["Staff"]
                AdminGroups["Groups"]
                AdminQuestions["Questions"]
                AdminResults["Results"]
                AdminCharts["Charts"]
                AdminRoles["Roles"]
            end
        end
        subgraph Components
            AppSidebar["AppSidebar"]
            MainLayout["MainLayout"]
            ProtectedRoute["ProtectedRoute"]
            UI["ui/ (shadcn)"]
        end
        subgraph Hooks
            useAuth["useAuth"]
            useStaff["useStaff"]
            useToast["useToast"]
        end
        State["State: TanStack Query"]
        APIClient["API Client (Axios)"]
    end
    
    APIClient --> BACKEND
    
    subgraph BACKEND["BACKEND (NestJS)"]
        subgraph Controllers
            AuthController["AuthController"]
            StaffController["StaffController"]
            GroupsController["GroupsController"]
            QuestionsController["QuestionsController"]
            EvaluationsController["EvaluationsController"]
            ReportsController["ReportsController"]
        end
        subgraph Services
            AuthService["AuthService"]
            StaffService["StaffService"]
            GroupsService["GroupsService"]
            QuestionsService["QuestionsService"]
            EvaluationsService["EvaluationsService"]
            ReportsService["ReportsService"]
        end
        subgraph Guards
            JwtAuthGuard["JwtAuthGuard"]
            RolesGuard["RolesGuard"]
        end
        subgraph Decorators
            CurrentUser["@CurrentUser"]
            Roles["@Roles"]
        end
        PrismaService["Prisma Service"]
    end
```

### 2.3 Deployment Architecture (Local Development)

```mermaid
flowchart TB
    subgraph DockerCompose["Docker Compose"]
        Frontend["Frontend<br/>(Vite)<br/>Port: 5173"]
        Backend["Backend<br/>(NestJS)<br/>Port: 3001"]
        PostgreSQL[("PostgreSQL<br/>Port: 5432")]
        
        Frontend <--> Backend
        Backend --> PostgreSQL
    end
```

---

## 3. Use Cases

### 3.1 Actors

| Actor | Description |
|-------|-------------|
| **Guest** | Unauthenticated user, can only access login/register |
| **User** | Authenticated staff member, can evaluate peers |
| **Moderator** | Can view reports for their groups |
| **Admin** | Full system access, manages all entities |

### 3.2 Use Case Diagram

```mermaid
flowchart LR
    subgraph System["Staff Evaluation System"]
        UC1["Login / Register"]
        UC2["View Dashboard"]
        UC3["View My Groups"]
        UC4["Select Colleague to Evaluate"]
        UC5["Submit Evaluation (0-4 scale)"]
        UC6["View My Evaluation History"]
        UC7["Update Profile"]
        UC8["View Group Reports"]
        UC9["Export Evaluation Results"]
        UC10["Manage Staff (CRUD)"]
        UC11["Manage Groups (CRUD)"]
        UC12["Assign Staff to Groups"]
        UC13["Manage Questions (CRUD)"]
        UC14["Manage Organization Units"]
        UC15["Manage User Roles"]
        UC16["View Analytics & Charts"]
    end

    Guest((Guest)) --> UC1

    User((User)) --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7

    Moderator((Moderator)) -.->|includes| User
    Moderator --> UC8
    Moderator --> UC9

    Admin((Admin)) -.->|includes| Moderator
    Admin --> UC10
    Admin --> UC11
    Admin --> UC12
    Admin --> UC13
    Admin --> UC14
    Admin --> UC15
    Admin --> UC16
```

### 3.3 Use Case Details

#### UC-01: User Authentication

| Field | Description |
|-------|-------------|
| **Actor** | Guest |
| **Precondition** | User has valid credentials |
| **Main Flow** | 1. User enters email/password<br>2. System validates credentials<br>3. System issues JWT tokens<br>4. User redirected to dashboard |
| **Alt Flow** | Invalid credentials → Show error message |
| **Postcondition** | User authenticated with session |

#### UC-02: Submit Peer Evaluation

| Field | Description |
|-------|-------------|
| **Actor** | User |
| **Precondition** | User is authenticated and belongs to at least one group |
| **Main Flow** | 1. User selects a group<br>2. User selects a colleague from the group<br>3. System displays evaluation questions<br>4. User rates colleague on each question (0-4 scale)<br>5. User submits evaluation<br>6. System saves evaluation |
| **Alt Flow** | User already evaluated → Load existing scores for editing |
| **Postcondition** | Evaluation stored in database |

#### UC-03: Manage Staff

| Field | Description |
|-------|-------------|
| **Actor** | Admin |
| **Precondition** | Admin is authenticated |
| **Main Flow** | 1. Admin navigates to Staff Management<br>2. Admin can Create/Read/Update/Delete staff<br>3. Admin can assign staff to groups<br>4. Admin can link staff to user profiles |
| **Postcondition** | Staff data updated |

#### UC-04: Generate Group Report

| Field | Description |
|-------|-------------|
| **Actor** | Admin, Moderator |
| **Precondition** | Group has evaluations |
| **Main Flow** | 1. User selects a group<br>2. System aggregates all evaluations<br>3. System calculates average scores per staff<br>4. System displays report with rankings |
| **Postcondition** | Report displayed/exported |

---

## 4. System Flows

### 4.1 Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant NestJS
    participant Prisma
    participant PostgreSQL
    
    Client->>NestJS: POST /auth/login<br/>{email, password}
    NestJS->>Prisma: findUnique(email)
    Prisma->>PostgreSQL: SELECT profile
    PostgreSQL-->>Prisma: profile data
    Prisma-->>NestJS: profile + roles
    Note over NestJS: Verify password<br/>(Argon2id)
    Note over NestJS: Generate tokens<br/>(JWT)
    NestJS-->>Client: {accessToken,<br/>refreshToken,<br/>user}
    Note over Client: Store tokens<br/>(localStorage)
```

### 4.2 Peer Evaluation Flow

```mermaid
sequenceDiagram
    participant Client
    participant NestJS
    participant Prisma
    participant PostgreSQL
    
    Client->>NestJS: GET /groups/my (with JWT)
    Note over NestJS: Validate JWT<br/>Extract staffId
    NestJS->>Prisma: Find user groups
    Prisma-->>NestJS: groups data
    NestJS-->>Client: [groups]
    
    Note over Client: User selects<br/>group & colleague
    
    Client->>NestJS: GET /questions
    NestJS-->>Client: [questions]
    
    Client->>NestJS: GET /evaluations/my?groupId=X
    NestJS-->>Client: [existing evals]
    
    Note over Client: User fills scores<br/>for each question
    
    Client->>NestJS: POST /evaluations/bulk<br/>{groupId, evaluations:[]}
    Note over NestJS: Validate:<br/>- Not self-eval<br/>- Same group<br/>- Valid points
    NestJS->>Prisma: Upsert evaluations
    Prisma-->>NestJS: success
    NestJS-->>Client: {success: true}
```

### 4.3 Report Generation Flow

```mermaid
sequenceDiagram
    participant Admin
    participant NestJS
    participant PostgreSQL
    
    Admin->>NestJS: GET /reports/group/:groupId
    Note over NestJS: Check role<br/>(admin/moderator)
    NestJS->>PostgreSQL: Fetch group +<br/>members +<br/>evaluations
    PostgreSQL-->>NestJS: data
    Note over NestJS: Calculate:<br/>- Avg per staff<br/>- Avg per question<br/>- Rankings
    NestJS-->>Admin: {groupId, groupName,<br/>staffScores:[{staffId,<br/>name, avgScore,<br/>byQuestion}],<br/>questionAvgs}
```

### 4.4 User Journey Flow

```mermaid
flowchart TB
    Login["Login"] --> Dashboard["Dashboard<br/>(Overview + Stats)"]
    
    Dashboard --> Assessment["Assessment<br/>(Evaluate)"]
    Dashboard --> Profile["Profile<br/>(View/Edit)"]
    Dashboard --> AdminPanel["Admin Panel<br/>(Admin only)"]
    
    Assessment --> SelectGroup["Select Group"]
    SelectGroup --> SelectColleague["Select Colleague"]
    SelectColleague --> RateQuestions["Rate Questions<br/>(0-4 scale)"]
    RateQuestions --> Submit["Submit & Confirm"]
    
    AdminPanel --> ManageStaff["Manage Staff<br/>- Create<br/>- Edit<br/>- Delete<br/>- Assign"]
    AdminPanel --> ManageGroups["Manage Groups<br/>- Create<br/>- Members<br/>- Delete"]
    ManageStaff --> ViewReports["View Reports<br/>- Group Report<br/>- Staff Report<br/>- Charts<br/>- Export"]
```

---

## 5. Database Design

### 5.1 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    organizationunits ||--o{ staff : "has"
    organizationunits ||--o{ groups : "contains"
    
    organizationunits {
        SERIAL id PK
        VARCHAR name
    }
    
    profiles ||--|| staff : "links to"
    profiles ||--o{ user_roles : "has"
    
    profiles {
        UUID id PK
        VARCHAR email UK
        VARCHAR password_hash
        BOOLEAN email_confirmed
        INT staff_id FK UK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
    
    staff ||--o{ staff2groups : "belongs to"
    staff ||--o{ evaluations : "reviews (as reviewer)"
    staff ||--o{ evaluations : "receives (as victim)"
    
    staff {
        SERIAL id PK
        VARCHAR staffcode UK
        VARCHAR name
        DATE birthday
        INT sex
        VARCHAR mobile
        VARCHAR emailh
        VARCHAR emails
        VARCHAR academicdegree
        VARCHAR academicrank
        VARCHAR bidv
        INT organizationunitid FK
    }
    
    user_roles {
        UUID id PK
        UUID user_id FK
        ENUM role
        TIMESTAMP created_at
    }
    
    staff2groups }o--|| groups : "member of"
    
    staff2groups {
        SERIAL id PK
        INT staffid FK
        INT groupid FK
    }
    
    groups ||--o{ subjects : "has"
    groups ||--o{ evaluations : "context for"
    
    groups {
        SERIAL id PK
        VARCHAR name
        INT organizationunitid FK
    }
    
    subjects {
        SERIAL id PK
        VARCHAR subjectid
        VARCHAR name
        INT groupid FK
    }
    
    questions ||--o{ evaluations : "criterion for"
    
    questions {
        SERIAL id PK
        VARCHAR title
        VARCHAR description
    }
    
    evaluations {
        SERIAL id PK
        INT reviewerid FK
        INT victimid FK
        INT questionid FK
        INT groupid FK
        DOUBLE point
        TIMESTAMP modifieddate
    }
```

### 5.2 Table Definitions

#### 5.2.1 organizationunits

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | VARCHAR(50) | NOT NULL | Department/Faculty name |

#### 5.2.2 staff

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| staffcode | VARCHAR | UNIQUE | Employee code |
| name | VARCHAR | | Full name |
| birthday | DATE | | Date of birth |
| sex | INT | | 0=Male, 1=Female |
| mobile | VARCHAR | | Phone number |
| emailh | VARCHAR | | Personal email |
| emails | VARCHAR | | School email |
| academicdegree | VARCHAR | | Degree (ThS, TS, etc.) |
| academicrank | VARCHAR | | Rank (PGS, GS, etc.) |
| bidv | VARCHAR | | Bank account |
| organizationunitid | INT | FK → organizationunits | Department |

#### 5.2.3 groups

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | VARCHAR(1024) | NOT NULL | Group name |
| organizationunitid | INT | FK → organizationunits | Department |

#### 5.2.4 staff2groups

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| staffid | INT | FK → staff, ON DELETE CASCADE | Staff member |
| groupid | INT | FK → groups, ON DELETE CASCADE | Group |
| | | UNIQUE(staffid, groupid) | Prevent duplicates |

#### 5.2.5 questions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| title | VARCHAR(1024) | NOT NULL | Question title |
| description | VARCHAR(1024) | | Question details |

#### 5.2.6 evaluations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| reviewerid | INT | FK → staff | Evaluator |
| victimid | INT | FK → staff | Person being evaluated |
| questionid | INT | FK → questions | Evaluation criterion |
| groupid | INT | FK → groups | Evaluation context |
| point | DOUBLE PRECISION | CHECK (0 ≤ point ≤ 4) | Score (0.5 increments) |
| modifieddate | TIMESTAMP | DEFAULT NOW() | Last modified |
| | | UNIQUE(reviewerid, victimid, questionid, groupid) | One score per combination |

#### 5.2.7 profiles

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | User ID |
| email | VARCHAR | UNIQUE, NOT NULL | Login email |
| password_hash | VARCHAR | NOT NULL | Argon2id hash |
| email_confirmed | BOOLEAN | DEFAULT FALSE | Email verified |
| staff_id | INT | UNIQUE, FK → staff | Linked staff |
| created_at | TIMESTAMP | DEFAULT NOW() | Created date |
| updated_at | TIMESTAMP | | Updated date |

#### 5.2.8 user_roles

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Role assignment ID |
| user_id | UUID | FK → profiles, ON DELETE CASCADE | User |
| role | ENUM | ('admin', 'moderator', 'user') | Role type |
| created_at | TIMESTAMP | DEFAULT NOW() | Assigned date |
| | | UNIQUE(user_id, role) | One role per type |

### 5.3 Indexes

```sql
-- Performance indexes
CREATE INDEX idx_staff_organizationunitid ON staff(organizationunitid);
CREATE INDEX idx_groups_organizationunitid ON groups(organizationunitid);
CREATE INDEX idx_staff2groups_staffid ON staff2groups(staffid);
CREATE INDEX idx_staff2groups_groupid ON staff2groups(groupid);
CREATE INDEX idx_evaluations_reviewerid ON evaluations(reviewerid);
CREATE INDEX idx_evaluations_victimid ON evaluations(victimid);
CREATE INDEX idx_evaluations_groupid ON evaluations(groupid);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
```

---

## 6. API Design

### 6.1 API Endpoints Summary

#### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login | Public |
| POST | `/auth/refresh` | Refresh tokens | Public |
| GET | `/auth/me` | Get current user | JWT |

#### Organization Units

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/organization-units` | List all | JWT |
| GET | `/api/v1/organization-units/:id` | Get by ID | JWT |
| POST | `/api/v1/organization-units` | Create | Admin |
| PUT | `/api/v1/organization-units/:id` | Update | Admin |
| DELETE | `/api/v1/organization-units/:id` | Delete | Admin |

#### Staff

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/staff` | List (paginated) | JWT |
| GET | `/api/v1/staff/:id` | Get by ID | JWT |
| POST | `/api/v1/staff` | Create | Admin |
| PUT | `/api/v1/staff/:id` | Update | Admin |
| DELETE | `/api/v1/staff/:id` | Delete | Admin |

#### Groups

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/groups` | List all | JWT |
| GET | `/api/v1/groups/:id` | Get with members | JWT |
| POST | `/api/v1/groups` | Create | Admin |
| POST | `/api/v1/groups/:id/members` | Add members | Admin |
| DELETE | `/api/v1/groups/:id/members` | Remove members | Admin |

#### Evaluations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/evaluations` | Create single | JWT |
| POST | `/api/v1/evaluations/bulk` | Create bulk | JWT |
| GET | `/api/v1/evaluations/my` | My evaluations | JWT |

#### Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/reports/group/:id` | Group report | Moderator+ |
| GET | `/api/v1/reports/staff/:id` | Staff report | Moderator+ |
| GET | `/api/v1/reports/matrix/:id` | Eval matrix | Moderator+ |

### 6.2 Request/Response Examples

#### Login

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
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

#### Submit Evaluation

**Request:**
```http
POST /api/v1/evaluations/bulk
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "groupId": 1,
  "evaluations": [
    { "victimid": 5, "questionid": 1, "point": 3.5 },
    { "victimid": 5, "questionid": 2, "point": 4.0 },
    { "victimid": 5, "questionid": 3, "point": 3.0 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "evaluations": [...]
}
```

---

## 7. Security Design

### 7.1 Authentication

- **Method:** JWT (JSON Web Tokens)
- **Access Token:** 15 minutes expiry
- **Refresh Token:** 7 days expiry
- **Password Hashing:** Argon2id (memory-hard, side-channel resistant)

### 7.2 Authorization

| Role | Permissions |
|------|-------------|
| **user** | View own groups, submit evaluations, view profile |
| **moderator** | user + view group reports |
| **admin** | moderator + full CRUD on all entities |

### 7.3 Security Measures

| Measure | Implementation |
|---------|----------------|
| **Rate Limiting** | NestJS Throttler (100 req/min) |
| **CORS** | Whitelist frontend origins only |
| **Input Validation** | class-validator DTOs |
| **SQL Injection** | Prisma parameterized queries |
| **XSS** | React auto-escaping + CSP headers |
| **HTTPS** | Required in production |
| **Password Policy** | Min 12 chars, uppercase, lowercase, number |

### 7.4 Data Protection

- Self-evaluation prevention (reviewerId ≠ victimId)
- Group membership validation before evaluation
- Point range validation (0-4)
- Row-level security for sensitive data

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Staff** | Faculty member being evaluated |
| **Group** | Collection of staff who evaluate each other |
| **Question** | Evaluation criterion (e.g., "Teaching quality") |
| **Evaluation** | Single score given by reviewer to victim on a question |
| **Reviewer** | Staff member giving the evaluation |
| **Victim** | Staff member receiving the evaluation |
| **Organization Unit** | Department or faculty (Khoa) |

### B. Vietnamese Field Mapping

| English | Vietnamese |
|---------|------------|
| Organization Unit | Khoa |
| Staff | Giảng viên |
| Group | Nhóm đánh giá |
| Evaluation | Đánh giá |
| Academic Degree | Học vị (ThS, TS) |
| Academic Rank | Học hàm (PGS, GS) |
