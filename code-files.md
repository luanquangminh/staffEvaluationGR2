# Code Files Catalog — Staff Evaluation System

> Liệt kê toàn bộ file mã nguồn trong project và mô tả chức năng từng file.
> Tổng: **74 BE source files + 1 BE e2e test + Prisma schema + 5 migrations + 94 FE files** (trong đó 49 file là shadcn/ui primitives).

**Cấu trúc repo:**
```
staffEvaluationGR2/
├── staffEvaluation-api/       # NestJS backend (production)
├── staffEvaluation-hub/       # React + Vite frontend
├── peer-review-api/           # (skeleton — chưa có source code TS)
├── docs/                      # ERD, refactor log, fix backlog
├── docker-compose.yml         # dev compose
├── docker-compose.prod.yml    # prod compose
└── mise.toml                  # Node version pinning
```

---

# Part 1 — Backend (`staffEvaluation-api/`)

## Bootstrap & Root

- **src/main.ts** — Bootstrap NestJS app: Helmet, CORS, ValidationPipe, Swagger docs, global exception filters & response interceptor.
- **src/app.module.ts** — Root module; cấu hình ThrottlerModule global, import tất cả domain modules, đăng ký request-id middleware.

## `src/auth/` — Authentication & OAuth

- **auth.service.ts** — Đăng ký, đăng nhập, sinh/refresh JWT, hash password bằng bcrypt.
- **auth.controller.ts** — Endpoints `login`, `register`, `refresh`, callback Microsoft OAuth.
- **auth.module.ts** — Cấu hình JWT + Passport, inject secret từ ConfigService.
- **microsoft-oauth.service.ts** — OAuth flow Microsoft: token exchange, profile fetch, in-memory state code store, kiểm tra domain HUST, link account.
- **auth.service.spec.ts** — Unit test cho auth service.
- **auth.controller.spec.ts** — Unit test cho auth controller.

### `src/auth/strategies/`
- **jwt.strategy.ts** — Passport JWT strategy: validate access token, gắn user payload vào request.
- **refresh-token.strategy.ts** — Passport strategy cho refresh token rotation.

### `src/auth/dto/`
- **login.dto.ts** — DTO email/password cho login.
- **register.dto.ts** — DTO đăng ký (email, password, profile fields).
- **refresh-token.dto.ts** — DTO cho refresh token request.
- **microsoft-oauth.dto.ts** — TypeScript interfaces cho Microsoft token response và user profile.

## `src/common/` — Cross-cutting Concerns

- **upload.constants.ts** — Hằng số cho avatar upload (MIME types, kích thước tối đa).

### `decorators/`
- **current-user.decorator.ts** — `@CurrentUser()` để rút user từ request.
- **roles.decorator.ts** — `@Roles(...)` để khai báo role yêu cầu cho endpoint.

### `dto/`
- **pagination.dto.ts** — `PaginationDto` (page/limit) + interface `PaginatedResult<T>` chuẩn hóa cho mọi list endpoint.

### `filters/`
- **http-exception.filter.ts** — Global exception filter cho HttpException của NestJS.
- **prisma-exception.filter.ts** — Map Prisma errors (P2002 unique, P2003 FK, P2025 not found, P2014) → HTTP status hợp ngữ nghĩa.
- **prisma-exception.filter.spec.ts** — Unit test cho Prisma filter.

### `guards/`
- **jwt-auth.guard.ts** — Guard validate Bearer token, gắn user vào request.
- **roles.guard.ts** — RBAC guard, default-deny, đọc metadata từ `@Roles()`.
- **roles.guard.spec.ts** — Unit test cho roles guard.

### `interceptors/`
- **logging.interceptor.ts** — Log request/response (method, URL, duration).
- **transform.interceptor.ts** — Bọc mọi response trong envelope `{ data, statusCode, timestamp }`.

### `middleware/`
- **request-id.middleware.ts** — Sinh request ID UUID gắn vào header để trace.

## `src/config/`
- **env.validation.ts** — Validate biến môi trường ở bootstrap, fail-fast nếu thiếu.

## `src/health/` — Liveness Probe
- **health.controller.ts** — Endpoint `/health` check kết nối DB.
- **health.module.ts** — Module cấu hình health check.

## `src/prisma/` — Database Layer
- **prisma.service.ts** — Extend `PrismaClient` với lifecycle hooks (`onModuleInit`, `onModuleDestroy`).
- **prisma.module.ts** — Module global, export `PrismaService` cho mọi module khác inject.

## `src/users/` — User & Role Management

- **users.service.ts** — Quản lý profile, link User với Staff record, gán/xóa role.
- **users.controller.ts** — Endpoints list user, manage roles, link staff account.
- **users.module.ts** — Module config.
- **users.service.spec.ts** — Unit test service.
- **users.controller.spec.ts** — Unit test controller.
- **dto/users.dto.ts** — DTO link staff & add role.

## `src/staff/` — Staff CRUD

- **staff.service.ts** — CRUD staff, xử lý avatar upload, pagination.
- **staff.controller.ts** — Endpoints CRUD + `@Post(':id/avatar')` upload, có role guard.
- **staff.module.ts** — Module config.
- **staff.service.spec.ts** — Unit test service.
- **staff.controller.spec.ts** — Unit test controller.
- **dto/staff.dto.ts** — DTO create/update staff (validate email, gender, birthdate…).

## `src/groups/` — Group Management

- **groups.service.ts** — CRUD group, gán/xóa thành viên, pagination.
- **groups.controller.ts** — Endpoints CRUD group + member operations.
- **groups.module.ts** — Module config.
- **groups.service.spec.ts** — Unit test service.
- **groups.controller.spec.ts** — Unit test controller.
- **dto/groups.dto.ts** — DTO create/update group + manage members.

## `src/organization-units/` — Khoa/Bộ môn

- **organization-units.service.ts** — CRUD organization unit, hỗ trợ phân cấp.
- **organization-units.controller.ts** — Endpoints list & CRUD.
- **organization-units.module.ts** — Module config.
- **organization-units.service.spec.ts** — Unit test service.
- **organization-units.controller.spec.ts** — Unit test controller.
- **dto/organization-units.dto.ts** — DTO create/update org unit.

## `src/questions/` — Tiêu chí đánh giá

- **questions.service.ts** — CRUD câu hỏi đánh giá, pagination.
- **questions.controller.ts** — Endpoints CRUD question.
- **questions.module.ts** — Module config.
- **questions.service.spec.ts** — Unit test service.
- **questions.controller.spec.ts** — Unit test controller.
- **dto/questions.dto.ts** — DTO create/update question (type, validation).

## `src/evaluation-periods/` — Kỳ đánh giá

- **evaluation-periods.service.ts** — CRUD kỳ đánh giá, validate khoảng thời gian, **enforce ràng buộc "chỉ một kỳ active"** (auto-deactivate các kỳ khác khi activate).
- **evaluation-periods.controller.ts** — Endpoints CRUD + listing.
- **evaluation-periods.module.ts** — Module config.
- **evaluation-periods.service.spec.ts** — Unit test service.
- **evaluation-periods.controller.spec.ts** — Unit test controller.
- **dto/evaluation-periods.dto.ts** — DTO create/update kỳ đánh giá.

## `src/evaluations/` — Submit & Query Evaluation

- **evaluations.service.ts** — Bulk submit đánh giá, query theo reviewer/evaluatee/period, pagination.
- **evaluations.controller.ts** — Endpoints submit & query, có permission check.
- **evaluations.module.ts** — Module config.
- **evaluations.service.spec.ts** — Unit test service.
- **evaluations.controller.spec.ts** — Unit test controller.
- **dto/evaluations.dto.ts** — DTO bulk submit & query evaluation.

## `test/` — End-to-End

- **test/app.e2e-spec.ts** — E2E test HTTP layer: auth flow, guards, validation pipe, exception filters, mock Prisma.

## Database Schema & Migrations

- **prisma/schema.prisma** — Prisma schema: tất cả model (User, Staff, Group, Question, EvaluationPeriod, Evaluation, EvaluationScore, OrganizationUnit, Staff2Group…).
- **prisma/migrations/** — 5 migrations:
  - `20260312065042_init` — schema khởi tạo.
  - `20260312130636_add_number_of_children` — thêm field số con.
  - `20260312130723_add_children_table` — thêm bảng children.
  - `20260312145437_remove_children_table` — gỡ bảng children (revert).
  - `20260315_database_improvements` — refinement.

---

# Part 2 — Frontend (`staffEvaluation-hub/`)

## Bootstrap & Root

- **src/main.tsx** — Entry point, render React app vào DOM với StrictMode.
- **src/App.tsx** — Root router, lazy-load pages, setup TanStack Query, AuthProvider, role-based route guards.
- **src/vite-env.d.ts** — Vite env type declarations.
- **src/setupTests.ts** — Vitest config (DOM polyfills, mock setup).

## `src/pages/` — Public/User Pages

- **Auth.tsx** — Trang login/register, validate Zod, button đăng nhập Microsoft.
- **AuthCallback.tsx** — Xử lý callback OAuth Microsoft, exchange token rồi redirect dashboard.
- **Dashboard.tsx** — Dashboard chính: tiến độ đánh giá, kỳ đang active, group members, statistics.
- **Assessment.tsx** — Form đánh giá đồng nghiệp trong group, thang điểm 0–4.
- **History.tsx** — Leaderboard + analytics: chọn period, sort, comparative charts.
- **Profile.tsx** — Profile editor: staff info, avatar upload, email/contact.
- **NotFound.tsx** — 404 page.
- **Assessment.test.tsx** — Unit test cho Assessment form logic.

## `src/pages/admin/` — Admin Pages

- **AdminStaff.tsx** — CRUD staff: search, filter, gán group.
- **AdminGroups.tsx** — Quản lý group: collapse theo org unit, edit thành viên.
- **AdminQuestions.tsx** — CRUD câu hỏi đánh giá.
- **AdminPeriods.tsx** — Lifecycle kỳ đánh giá (draft → active → closed) + date range.
- **AdminResults.tsx** — Xem kết quả: radar chart per staff, sort theo điểm/số lượng.
- **AdminCharts.tsx** — Dashboard biểu đồ: bar/pie chart aggregate theo group/staff.
- **AdminRoles.tsx** — Gán role (admin/moderator/user), lookup theo Microsoft email.

## `src/components/` — Custom Components

- **MainLayout.tsx** — Layout wrapper: sticky header, sidebar, notifications, user dropdown, outlet.
- **AppSidebar.tsx** — Navigation sidebar, menu theo role (lecturer/admin/moderator).
- **ProtectedRoute.tsx** — Route guard: enforce auth + role check.
- **ErrorBoundary.tsx** — React error boundary với UI reset/về home.
- **NotificationBell.tsx** — Icon chuông + badge: số đánh giá chưa xong + task admin.
- **NotificationBell.test.tsx** — Unit test notification bell.
- **UserAvatar.tsx** — Hiển thị avatar, fallback initial nếu chưa upload.
- **PaginationControls.tsx** — Buttons pagination (first/prev/next/last) + page info.
- **TableSkeleton.tsx** — Skeleton shimmer rows cho data tables (a11y-friendly, chống CLS).
- **NavLink.tsx** — Wrapper React Router NavLink với activeClassName & pendingClassName.

## `src/components/ui/` — shadcn/ui Primitives

- **49 components** — Button, Dialog, Form, Table, Card, Input, Select, Tabs, Badge, Checkbox, Popover, Tooltip, Pagination, Progress, Slider, Drawer, Sheet, Sidebar, Alert, Accordion, Carousel, Calendar, Collapsible, Command, ContextMenu, DropdownMenu, HoverCard, InputOTP, Label, Menubar, NavigationMenu, RadioGroup, Resizable, ScrollArea, Separator, Skeleton, Switch, Textarea, Toggle, ToggleGroup, Chart (Recharts wrapper), Breadcrumb, AspectRatio, Sonner toast, use-toast hook... — implementations chuẩn shadcn/ui, không custom logic.

## `src/hooks/` — Custom Hooks

- **useAuth.tsx** — AuthProvider context: login/signup, refresh token, session expiration, user state.
- **useAuth.test.tsx** — Unit test auth context.
- **useStaff.ts** — TanStack Query hooks: `useStaff`, `useGroups`, `useOrganizationUnits`, `useQuestions`, `useColleaguesInGroup`, `useMyGroups`, `useActivePeriods`, `useEvaluations`…
- **useNotifications.ts** — Hooks `useMyProgress`, `usePendingEvaluations` (refetch mỗi 5 phút).
- **usePagination.ts** — State pagination (page, pageSize, hasNext, hasPrev…).
- **use-mobile.tsx** — Detect mobile breakpoint.
- **use-toast.ts** — Sonner toast hook.

## `src/lib/` — Utilities & API Client

- **api.ts** — `ApiClient` wrapper: fetch + timeout, quản lý auth token, refresh logic, session expiration, parse field-level error.
- **api.test.ts** — Unit test API client (refresh flow, error handling, timeout).
- **queryKeys.ts** — Factory cho TanStack Query keys, đảm bảo cache key nhất quán.
- **utils.ts** — Hàm `cn()` merge Tailwind classes.
- **avatarUtils.ts** — Resolver URL avatar (server path hoặc fallback theo tên).
- **teacherAvatars.ts** — Static/generated avatar mapping theo tên giảng viên.
- **uploadLimits.ts** — Hằng số validate upload (size, types, accept attribute).

## `src/types/`

- **api.ts** — TypeScript interfaces mirror Prisma backend: Staff, Group, Question, Evaluation, EvaluationPeriod, OrganizationUnit, Staff2Group… single source of truth per Prisma model.

---

# Part 3 — Lưu ý

## `peer-review-api/`
Thư mục tồn tại nhưng **không có source TypeScript**. Có thể là skeleton chuẩn bị tách microservice trong tương lai, hoặc workspace cũ. Hiện tại chỉ `staffEvaluation-api/` được dùng cho production.

## Notable Patterns — Backend

1. **DTO + Service + Controller triplet** nhất quán cho mọi domain module (staff, groups, questions, evaluations…).
2. **Pagination chuẩn hóa** — mọi list endpoint nhận `PaginationDto` và trả `PaginatedResult<T>` có total count.
3. **Guard composition** — `@UseGuards(JwtAuthGuard)` ở class level + `@UseGuards(RolesGuard) + @Roles(...)` ở method level.
4. **Exception mapping global** — `PrismaExceptionFilter` chạy trước `HttpExceptionFilter` để map P2002/P2003/P2025/P2014 thành HTTP code chuẩn.
5. **Response envelope** — `TransformInterceptor` bọc mọi response trong `{ data, statusCode, timestamp }`.

## Notable Patterns — Frontend

1. **TanStack Query** cho mọi data fetching, cache key qua `queryKeys` factory, stale time 30s, retry 1 lần.
2. **RBAC ba tầng** (user/moderator/admin) qua `ProtectedRoute` + helper `isModerator`/`isAdmin` trong hook.
3. **OAuth Microsoft** — `AuthCallback` xử lý token exchange, refresh token tự renew khi gặp 401 trong `ApiClient`.
4. **Zod validation** cho form (Auth page có `loginSchema`, `registerSchema`); API errors gồm field-level constraints (FE-5 pattern).
5. **A11y/perf** — skip-to-content link (FE-6), virtualized leaderboard (FE-3/FE-4), semantic tables + ARIA labels, table skeleton chống CLS (FE-7).
