# Staff Evaluation Hub

A comprehensive staff evaluation and peer review system built with React, NestJS, and PostgreSQL.

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

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Browser   │  │   Mobile    │  │   Admin     │                 │
│  │   (React)   │  │   (Future)  │  │   Portal    │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
└─────────┼────────────────┼────────────────┼─────────────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      NestJS Backend                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │   Auth   │ │  Staff   │ │  Groups  │ │Evaluations│       │   │
│  │  │  Module  │ │  Module  │ │  Module  │ │  Module  │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │   │
│  │  │Questions │ │  Reports │ │  Users   │                    │   │
│  │  │  Module  │ │  Module  │ │  Module  │                    │   │
│  │  └──────────┘ └──────────┘ └──────────┘                    │   │
│  └─────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Prisma ORM                                │   │
│  └─────────────────────────┬───────────────────────────────────┘   │
│                            │                                        │
│  ┌─────────────────────────▼───────────────────────────────────┐   │
│  │                   PostgreSQL 16                              │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │   │
│  │  │ staff  │ │ groups │ │questions│ │evalua- │ │profiles│    │   │
│  │  │        │ │        │ │        │ │ tions  │ │        │    │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                             │
├─────────────────────────────────────────────────────────────────┤
│  Pages                    │  Components                         │
│  ├── Auth                 │  ├── AppSidebar                    │
│  ├── Dashboard            │  ├── MainLayout                    │
│  ├── Assessment           │  ├── ProtectedRoute                │
│  ├── Profile              │  └── ui/ (shadcn)                  │
│  └── Admin/               │                                     │
│      ├── Staff            │  Hooks                              │
│      ├── Groups           │  ├── useAuth                       │
│      ├── Questions        │  ├── useStaff                      │
│      ├── Results          │  └── useToast                      │
│      ├── Charts           │                                     │
│      └── Roles            │  State: TanStack Query              │
├─────────────────────────────────────────────────────────────────┤
│                        API Client (Axios)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (NestJS)                             │
├─────────────────────────────────────────────────────────────────┤
│  Controllers              │  Services                           │
│  ├── AuthController       │  ├── AuthService                   │
│  ├── StaffController      │  ├── StaffService                  │
│  ├── GroupsController     │  ├── GroupsService                 │
│  ├── QuestionsController  │  ├── QuestionsService              │
│  ├── EvaluationsController│  ├── EvaluationsService            │
│  └── ReportsController    │  └── ReportsService                │
├─────────────────────────────────────────────────────────────────┤
│  Guards                   │  Decorators                         │
│  ├── JwtAuthGuard         │  ├── @CurrentUser                  │
│  └── RolesGuard           │  └── @Roles                        │
├─────────────────────────────────────────────────────────────────┤
│                     Prisma Service                               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Deployment Architecture (Local Development)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Compose                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │    Frontend     │         │    Backend      │               │
│  │    (Vite)       │◄───────►│   (NestJS)      │               │
│  │   Port: 5173    │         │   Port: 3001    │               │
│  └─────────────────┘         └────────┬────────┘               │
│                                       │                         │
│                              ┌────────▼────────┐               │
│                              │   PostgreSQL    │               │
│                              │   Port: 5432    │               │
│                              └─────────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
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

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Staff Evaluation System                       │
│                                                                      │
│  ┌─────────┐                                                        │
│  │  Guest  │───────► Login / Register                               │
│  └─────────┘                                                        │
│                                                                      │
│  ┌─────────┐                                                        │
│  │  User   │───┬───► View Dashboard                                 │
│  └─────────┘   │                                                    │
│                ├───► View My Groups                                 │
│                ├───► Select Colleague to Evaluate                   │
│                ├───► Submit Evaluation (0-4 scale)                  │
│                ├───► View My Evaluation History                     │
│                └───► Update Profile                                 │
│                                                                      │
│  ┌──────────┐                                                       │
│  │Moderator │───┬───► All User Use Cases                           │
│  └──────────┘   │                                                   │
│                 ├───► View Group Reports                            │
│                 └───► Export Evaluation Results                     │
│                                                                      │
│  ┌─────────┐                                                        │
│  │  Admin  │───┬───► All Moderator Use Cases                       │
│  └─────────┘   │                                                    │
│                ├───► Manage Staff (CRUD)                            │
│                ├───► Manage Groups (CRUD)                           │
│                ├───► Assign Staff to Groups                         │
│                ├───► Manage Questions (CRUD)                        │
│                ├───► Manage Organization Units                      │
│                ├───► Manage User Roles                              │
│                └───► View Analytics & Charts                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
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

```
┌────────┐          ┌────────┐          ┌────────┐          ┌────────┐
│ Client │          │ NestJS │          │ Prisma │          │PostgreSQL│
└───┬────┘          └───┬────┘          └───┬────┘          └───┬────┘
    │                   │                   │                   │
    │  POST /auth/login │                   │                   │
    │  {email, password}│                   │                   │
    │──────────────────►│                   │                   │
    │                   │  findUnique(email)│                   │
    │                   │──────────────────►│                   │
    │                   │                   │   SELECT profile  │
    │                   │                   │──────────────────►│
    │                   │                   │◄──────────────────│
    │                   │◄──────────────────│   profile + roles │
    │                   │                   │                   │
    │                   │ Verify password   │                   │
    │                   │ (Argon2id)        │                   │
    │                   │                   │                   │
    │                   │ Generate tokens   │                   │
    │                   │ (JWT)             │                   │
    │                   │                   │                   │
    │ {accessToken,     │                   │                   │
    │  refreshToken,    │                   │                   │
    │  user}            │                   │                   │
    │◄──────────────────│                   │                   │
    │                   │                   │                   │
    │  Store tokens     │                   │                   │
    │  (localStorage)   │                   │                   │
    │                   │                   │                   │
```

### 4.2 Peer Evaluation Flow

```
┌────────┐          ┌────────┐          ┌────────┐          ┌────────┐
│ Client │          │ NestJS │          │ Prisma │          │PostgreSQL│
└───┬────┘          └───┬────┘          └───┬────┘          └───┬────┘
    │                   │                   │                   │
    │ GET /groups/my    │                   │                   │
    │ (with JWT)        │                   │                   │
    │──────────────────►│                   │                   │
    │                   │  Validate JWT     │                   │
    │                   │  Extract staffId  │                   │
    │                   │                   │                   │
    │                   │  Find user groups │                   │
    │                   │──────────────────►│                   │
    │                   │◄──────────────────│                   │
    │  [groups]         │                   │                   │
    │◄──────────────────│                   │                   │
    │                   │                   │                   │
    │ User selects      │                   │                   │
    │ group & colleague │                   │                   │
    │                   │                   │                   │
    │ GET /questions    │                   │                   │
    │──────────────────►│                   │                   │
    │  [questions]      │                   │                   │
    │◄──────────────────│                   │                   │
    │                   │                   │                   │
    │ GET /evaluations/ │                   │                   │
    │ my?groupId=X      │                   │                   │
    │──────────────────►│                   │                   │
    │  [existing evals] │                   │                   │
    │◄──────────────────│                   │                   │
    │                   │                   │                   │
    │ User fills scores │                   │                   │
    │ for each question │                   │                   │
    │                   │                   │                   │
    │ POST /evaluations │                   │                   │
    │ /bulk             │                   │                   │
    │ {groupId,         │                   │                   │
    │  evaluations:[]}  │                   │                   │
    │──────────────────►│                   │                   │
    │                   │ Validate:         │                   │
    │                   │ - Not self-eval   │                   │
    │                   │ - Same group      │                   │
    │                   │ - Valid points    │                   │
    │                   │                   │                   │
    │                   │ Upsert evaluations│                   │
    │                   │──────────────────►│                   │
    │                   │◄──────────────────│                   │
    │  {success: true}  │                   │                   │
    │◄──────────────────│                   │                   │
    │                   │                   │                   │
```

### 4.3 Report Generation Flow

```
┌────────┐          ┌────────┐          ┌────────┐
│ Admin  │          │ NestJS │          │PostgreSQL│
└───┬────┘          └───┬────┘          └───┬────┘
    │                   │                   │
    │ GET /reports/     │                   │
    │ group/:groupId    │                   │
    │──────────────────►│                   │
    │                   │ Check role        │
    │                   │ (admin/moderator) │
    │                   │                   │
    │                   │ Fetch group +     │
    │                   │ members +         │
    │                   │ evaluations       │
    │                   │──────────────────►│
    │                   │◄──────────────────│
    │                   │                   │
    │                   │ Calculate:        │
    │                   │ - Avg per staff   │
    │                   │ - Avg per question│
    │                   │ - Rankings        │
    │                   │                   │
    │ {                 │                   │
    │   groupId,        │                   │
    │   groupName,      │                   │
    │   staffScores:[   │                   │
    │     {staffId,     │                   │
    │      name,        │                   │
    │      avgScore,    │                   │
    │      byQuestion}  │                   │
    │   ],              │                   │
    │   questionAvgs    │                   │
    │ }                 │                   │
    │◄──────────────────│                   │
    │                   │                   │
```

### 4.4 User Journey Flow

```
                                    ┌──────────────┐
                                    │    Login     │
                                    └──────┬───────┘
                                           │
                                           ▼
                              ┌────────────────────────┐
                              │      Dashboard         │
                              │  (Overview + Stats)    │
                              └────────────┬───────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
           ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
           │   Assessment   │    │    Profile     │    │  Admin Panel   │
           │   (Evaluate)   │    │   (View/Edit)  │    │  (Admin only)  │
           └───────┬────────┘    └────────────────┘    └───────┬────────┘
                   │                                           │
                   ▼                                           │
        ┌──────────────────┐                    ┌──────────────┴──────────────┐
        │  Select Group    │                    │                             │
        └────────┬─────────┘                    │                             │
                 │                              ▼                             ▼
                 ▼                    ┌─────────────────┐          ┌─────────────────┐
        ┌──────────────────┐          │  Manage Staff   │          │  Manage Groups  │
        │ Select Colleague │          │  - Create       │          │  - Create       │
        └────────┬─────────┘          │  - Edit         │          │  - Members      │
                 │                    │  - Delete       │          │  - Delete       │
                 ▼                    │  - Assign       │          └─────────────────┘
        ┌──────────────────┐          └─────────────────┘
        │ Rate Questions   │                    │
        │ (0-4 scale)      │                    ▼
        └────────┬─────────┘          ┌─────────────────┐
                 │                    │ View Reports    │
                 ▼                    │ - Group Report  │
        ┌──────────────────┐          │ - Staff Report  │
        │ Submit & Confirm │          │ - Charts        │
        └──────────────────┘          │ - Export        │
                                      └─────────────────┘
```

---

## 5. Database Design

### 5.1 Entity Relationship Diagram (ERD)

```
┌─────────────────────┐       ┌─────────────────────┐
│  organizationunits  │       │       profiles      │
├─────────────────────┤       ├─────────────────────┤
│ PK id (SERIAL)      │       │ PK id (UUID)        │
│    name (VARCHAR)   │       │    email (UNIQUE)   │
└──────────┬──────────┘       │    password_hash    │
           │                  │    email_confirmed  │
           │ 1                │ FK staff_id (UNIQUE)│◄─────┐
           │                  │    created_at       │      │
           │                  │    updated_at       │      │
           ▼ *                └──────────┬──────────┘      │
┌─────────────────────┐                  │                 │
│       staff         │                  │ 1               │
├─────────────────────┤                  │                 │
│ PK id (SERIAL)      │◄─────────────────┘                 │
│    staffcode        │                                    │
│    name             │                                    │
│    birthday         │                                    │
│    sex              │                                    │
│    mobile           │                                    │
│    emailh           │                                    │
│    emails           │                                    │
│    academicdegree   │                                    │
│    academicrank     │                                    │
│    bidv             │                                    │
│ FK organizationunitid│                                   │
└──────────┬──────────┘                                    │
           │                                               │
           │ 1              ┌─────────────────────┐        │
           │                │     user_roles      │        │
           │                ├─────────────────────┤        │
           │                │ PK id (UUID)        │        │
           │                │ FK user_id          │────────┤
           │                │    role (ENUM)      │        │
           │                │    created_at       │        │
           │                └─────────────────────┘        │
           │                                               │
           │ *                                             │
           ▼                                               │
┌─────────────────────┐                                    │
│    staff2groups     │                                    │
├─────────────────────┤                                    │
│ PK id (SERIAL)      │                                    │
│ FK staffid          │────────────────────────────────────┘
│ FK groupid          │───────────┐
│    UNIQUE(staffid,  │           │
│           groupid)  │           │
└─────────────────────┘           │
                                  │ *
                                  ▼
┌─────────────────────┐       ┌─────────────────────┐
│       groups        │       │      subjects       │
├─────────────────────┤       ├─────────────────────┤
│ PK id (SERIAL)      │◄──────│ FK groupid          │
│    name             │   1 * │ PK id (SERIAL)      │
│ FK organizationunitid       │    subjectid        │
└──────────┬──────────┘       │    name             │
           │                  └─────────────────────┘
           │ 1
           │
           ▼ *
┌─────────────────────┐       ┌─────────────────────┐
│    evaluations      │       │     questions       │
├─────────────────────┤       ├─────────────────────┤
│ PK id (SERIAL)      │       │ PK id (SERIAL)      │
│ FK reviewerid       │───┐   │    title            │
│ FK victimid         │───┤   │    description      │
│ FK questionid       │───┼───│◄────────────────────│
│ FK groupid          │───┤   └─────────────────────┘
│    point (0-4)      │   │
│    modifieddate     │   │
│    UNIQUE(reviewer, │   │
│      victim,question│   │
│      group)         │   │
└─────────────────────┘   │
           │              │
           │ *            │
           └──────────────┘
             (to staff)
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
