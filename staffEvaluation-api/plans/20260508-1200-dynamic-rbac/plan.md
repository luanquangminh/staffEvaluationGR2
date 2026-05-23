# Plan: Dynamic RBAC Permission Management System

**Date:** 2026-05-08  
**Scope:** staffEvaluation-api (NestJS) + staffEvaluation-hub (React)  
**Goal:** Replace hard-coded role checks with DB-driven, admin-configurable permissions + checkbox UI

---

## Current State Summary

### Backend
- `AppRole` enum: `admin | moderator | user`
- `RolesGuard` checks `user.roles` (string array from JWT) against `@Roles(...)` decorator
- Hard-coded per-endpoint: `@Roles('admin')`, `@Roles('admin', 'moderator')`
- No caching layer; no `@nestjs/cache-manager` installed
- Controllers affected: `users`, `staff`, `questions`, `evaluations`, `groups`, `evaluation-periods`, `organization-units`

### Frontend
- `ProtectedRoute` uses `isAdmin` / `isModerator` flags from `useAuth`
- Sidebar nav items hard-coded by role
- No per-permission granularity; binary: admin-only or admin+moderator

### Key Constraint
No Redis / cache library installed — in-memory `Map` cache in the service is the pragmatic option for a thesis system.

---

## 1. Permission Catalog

Every protected action gets a string key. Format: `<resource>.<action>`.

```
// Admin panel - data management
staff.view              — view staff list + details
staff.create            — POST /staff
staff.edit              — PATCH /staff/:id (any staff, not just own avatar)
staff.delete            — DELETE /staff/:id

questions.view          — GET /questions (all, including inactive)
questions.create        — POST /questions
questions.edit          — PATCH /questions/:id
questions.delete        — DELETE /questions/:id

groups.view             — GET /groups (admin view, all groups)
groups.create           — POST /groups
groups.edit             — PATCH /groups/:id
groups.manage_members   — PUT /groups/:id/members

periods.view            — GET /evaluation-periods (all)
periods.create          — POST /evaluation-periods
periods.edit            — PATCH /evaluation-periods/:id
periods.delete          — DELETE /evaluation-periods/:id

org_units.view          — GET /organization-units
org_units.create        — POST /organization-units
org_units.edit          — PATCH /organization-units/:id
org_units.delete        — DELETE /organization-units/:id

evaluations.view_all    — GET /evaluations (all, admin view)
evaluations.view_pending — GET /evaluations/pending
evaluations.view_staff2groups — GET /evaluations/staff2groups
evaluations.view_staff_results — GET /evaluations/staff/:id/received

results.view            — access /admin/results page (view aggregated scores)
charts.view             — access /admin/charts page

users.view_all          — GET /users/profiles + GET /users/roles
users.manage_roles      — POST|DELETE /users/:id/roles
users.link_staff        — POST /users/link-staff

permissions.manage      — GET|PUT /permissions (this new feature itself)
```

Total: **24 permissions** across 10 resource groups.

**Admin bypass rule:** If `user.roles.includes('admin')` → skip all permission checks. Hard-coded in guard. Cannot be removed.

---

## 2. Database Schema Changes

### 2a. New Prisma models

Add to `prisma/schema.prisma`:

```prisma
// Catalogue of all available permissions in the system
model Permission {
  id          Int              @id @default(autoincrement())
  key         String           @unique  // e.g. "staff.create"
  description String?
  resource    String           // e.g. "staff"
  createdAt   DateTime         @default(now()) @map("created_at")
  rolePerms   RolePermission[]

  @@map("permissions")
}

// Which permissions each role has
model RolePermission {
  id           Int        @id @default(autoincrement())
  role         AppRole
  permissionId Int        @map("permission_id")
  grantedAt    DateTime   @default(now()) @map("granted_at")
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([role, permissionId])
  @@index([role])
  @@map("role_permissions")
}
```

### 2b. What stays unchanged
- `AppRole` enum — no changes
- `UserRole` table — unchanged
- All existing models — unchanged

### 2c. Seed data
A seed script populates the `permissions` table with all 24 keys and sets default grants matching current behavior:

| Role | Default grants |
|---|---|
| admin | ALL (but guard bypasses anyway) |
| moderator | `groups.view`, `groups.manage_members`, `evaluations.view_all`, `evaluations.view_pending`, `evaluations.view_staff2groups`, `evaluations.view_staff_results`, `results.view`, `charts.view` |
| user | _(none — existing endpoints are open to all authenticated users anyway)_ |

---

## 3. Backend Architecture

### 3a. New module: `PermissionsModule`

**Files to create:**

```
src/permissions/
  permissions.module.ts
  permissions.service.ts
  permissions.controller.ts
  dto/
    update-role-permissions.dto.ts
```

### 3b. `PermissionsService`

```typescript
// src/permissions/permissions.service.ts
@Injectable()
export class PermissionsService {
  // In-memory cache: role → Set<permissionKey>
  private cache = new Map<string, { perms: Set<string>; ts: number }>();
  private readonly TTL_MS = 60_000; // 60 seconds

  constructor(private prisma: PrismaService) {}

  async getRolePermissions(role: string): Promise<Set<string>> {
    const cached = this.cache.get(role);
    if (cached && Date.now() - cached.ts < this.TTL_MS) {
      return cached.perms;
    }

    const rows = await this.prisma.rolePermission.findMany({
      where: { role: role as AppRole },
      include: { permission: true },
    });

    const perms = new Set(rows.map(r => r.permission.key));
    this.cache.set(role, { perms, ts: Date.now() });
    return perms;
  }

  // Called by controller when admin saves changes → invalidate cache
  async setRolePermissions(role: AppRole, permissionKeys: string[]): Promise<void> {
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { role } }),
      this.prisma.rolePermission.createMany({
        data: permissions.map(p => ({ role, permissionId: p.id })),
      }),
    ]);

    this.cache.delete(role); // invalidate immediately
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { key: 'asc' }] });
  }

  async getRolePermissionMatrix() {
    // Returns { moderator: ['groups.view', ...], user: [...] }
    const all = await this.prisma.rolePermission.findMany({
      include: { permission: true },
    });
    const matrix: Record<string, string[]> = { moderator: [], user: [] };
    for (const row of all) {
      if (row.role !== 'admin') {
        matrix[row.role] = matrix[row.role] ?? [];
        matrix[row.role].push(row.permission.key);
      }
    }
    return matrix;
  }

  invalidateAll() {
    this.cache.clear();
  }
}
```

### 3c. `PermissionsController`

```typescript
// src/permissions/permissions.controller.ts
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()                          // GET /permissions → { permissions[], matrix }
  getMatrix() { ... }

  @Put(':role')                   // PUT /permissions/:role → save checkbox state
  setRolePermissions(
    @Param('role') role: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) { ... }
}
```

**`UpdateRolePermissionsDto`:**
```typescript
export class UpdateRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissionKeys: string[];
}
```

### 3d. New guard: `PermissionGuard`

This **replaces** `RolesGuard` on endpoints that need dynamic checking. `RolesGuard` is kept for the permissions endpoint itself (only admin can manage permissions).

```typescript
// src/common/guards/permission.guard.ts
export const PERMISSION_KEY = 'permission';
export const RequirePermission = (key: string) => SetMetadata(PERMISSION_KEY, key);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredPerm = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!requiredPerm) return true; // no permission required

    const request = ctx.switchToHttp().getRequest();
    const user = request?.user;

    if (!user || !Array.isArray(user.roles)) return false;

    // Admin always passes
    if (user.roles.includes('admin')) return true;

    // Check each role the user holds
    for (const role of user.roles) {
      const perms = await this.permissionsService.getRolePermissions(role);
      if (perms.has(requiredPerm)) return true;
    }

    return false;
  }
}
```

### 3e. Migrating existing controllers

**Strategy: Additive migration** — add `@RequirePermission(...)` alongside existing `@Roles(...)` in Phase 2. In Phase 3, remove `@Roles(...)` from non-admin endpoints.

Example diff for `evaluations.controller.ts`:

```typescript
// BEFORE
@Get('pending')
@Roles('admin', 'moderator')
@UseGuards(RolesGuard)
getPendingEvaluations() { ... }

// AFTER (Phase 2 — both guards active)
@Get('pending')
@RequirePermission('evaluations.view_pending')
@UseGuards(JwtAuthGuard, PermissionGuard)
getPendingEvaluations() { ... }
```

Endpoints that remain admin-only (permissions management, user role management) keep `@Roles('admin') @UseGuards(RolesGuard)`.

### 3f. `getMe` / JWT payload change

`/auth/me` does **not** embed permissions in the token (tokens are short-lived 15min, but permissions must be live). Instead, extend the `/auth/me` response:

```typescript
// auth.service.ts — getMe()
async getMe(userId: string) {
  const user = await this.prisma.user.findUnique({ ... });
  const isAdmin = user.roles.some(r => r.role === 'admin');

  let permissions: string[] = [];
  if (!isAdmin) {
    const permSets = await Promise.all(
      user.roles.map(r => this.permissionsService.getRolePermissions(r.role))
    );
    permissions = [...new Set([...permSets].flatMap(s => [...s]))];
  }

  return {
    id: user.id,
    email: user.email,
    staffId: user.profile?.staffId ?? null,
    roles: user.roles.map(r => r.role),
    isAdmin,
    permissions, // NEW — empty array for admin (they bypass checks anyway)
  };
}
```

`PermissionsService` must be injected into `AuthModule` → export from `PermissionsModule`.

### 3g. Module wiring

```typescript
// src/permissions/permissions.module.ts
@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],   // exported so AuthModule can use it
})
export class PermissionsModule {}
```

Add to `app.module.ts` imports: `PermissionsModule`.

### 3h. Seed script

```
prisma/seeds/permissions.seed.ts
```

Run via: `pnpm db:seed` (extend existing seed.ts to call this).

Seed inserts all 24 permission rows, then seeds default `RolePermission` rows for `moderator` role.

---

## 4. Frontend Architecture

### 4a. Extend `AuthUser` and `useAuth`

```typescript
// hooks/useAuth.tsx
interface AuthUser {
  id: string;
  email: string;
  staffId: number | null;
  roles: string[];
  isAdmin: boolean;
  permissions: string[];   // NEW
}

// In AuthProvider value:
const hasPermission = useCallback(
  (key: string) => user?.isAdmin || (user?.permissions.includes(key) ?? false),
  [user]
);

// Expose:
interface AuthContextType {
  // ... existing ...
  permissions: string[];   // NEW
  hasPermission: (key: string) => boolean;  // NEW
}
```

No breaking changes — `isAdmin`, `isModerator` stay as-is.

### 4b. `ProtectedRoute` — new prop

```typescript
// components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAdminOnly?: boolean;
  requirePermission?: string;   // NEW
}

// Add to canActivate logic:
if (requirePermission && !hasPermission(requirePermission)) {
  return <Navigate to="/dashboard" replace />;
}
```

### 4c. Update App.tsx routes

```tsx
// From:
<Route element={<ProtectedRoute requireAdminOnly><MainLayout /></ProtectedRoute>}>
  <Route path="/admin/results" element={<AdminResults />} />

// To:
<Route element={<ProtectedRoute requirePermission="results.view"><MainLayout /></ProtectedRoute>}>
  <Route path="/admin/results" element={<AdminResults />} />
```

Full route mapping:

| Route | Old guard | New `requirePermission` |
|---|---|---|
| `/admin/staff` | `requireAdminOnly` | `staff.view` |
| `/admin/groups` | `requireAdmin` | `groups.view` |
| `/admin/questions` | `requireAdminOnly` | `questions.view` |
| `/admin/results` | `requireAdminOnly` | `results.view` |
| `/admin/charts` | `requireAdminOnly` | `charts.view` |
| `/admin/periods` | `requireAdminOnly` | `periods.view` |
| `/admin/roles` | `requireAdminOnly` | `users.manage_roles` |
| `/admin/permissions` | NEW | `permissions.manage` (admin only) |

### 4d. Sidebar — dynamic nav

```tsx
// AppSidebar.tsx
const { hasPermission, isAdmin } = useAuth();

const adminItems = [
  { title: 'Giảng viên', url: '/admin/staff', icon: Users, perm: 'staff.view' },
  { title: 'Nhóm', url: '/admin/groups', icon: FolderOpen, perm: 'groups.view' },
  { title: 'Câu hỏi', url: '/admin/questions', icon: HelpCircle, perm: 'questions.view' },
  { title: 'Đợt đánh giá', url: '/admin/periods', icon: Calendar, perm: 'periods.view' },
  { title: 'Kết quả', url: '/admin/results', icon: BarChart3, perm: 'results.view' },
  { title: 'Biểu đồ', url: '/admin/charts', icon: PieChart, perm: 'charts.view' },
  { title: 'Phân quyền', url: '/admin/roles', icon: Shield, perm: 'users.manage_roles' },
  { title: 'Quyền hạn', url: '/admin/permissions', icon: Lock, perm: 'permissions.manage' },
];

// Filter: show if admin OR has the permission
const visibleItems = adminItems.filter(
  item => isAdmin || hasPermission(item.perm)
);
```

Remove hardcoded `moderatorItems` — replaced by filtered `adminItems`.

### 4e. New page: `AdminPermissions.tsx`

**Location:** `src/pages/admin/AdminPermissions.tsx`

UI: Checkbox matrix — rows = permissions grouped by resource, columns = non-admin roles (moderator, user).

```
Permissions Matrix
┌─────────────────────┬────────────┬──────┐
│ Permission          │ Moderator  │ User │
├─────────────────────┼────────────┼──────┤
│ staff               │            │      │
│  └ staff.view       │    [x]     │ [ ] │
│  └ staff.create     │    [ ]     │ [ ] │
│ groups              │            │      │
│  └ groups.view      │    [x]     │ [ ] │
│ ...                 │            │      │
└─────────────────────┴────────────┴──────┘
         [Save Changes]
```

**Data flow:**
1. `GET /permissions` → `{ permissions: Permission[], matrix: { moderator: string[], user: string[] } }`
2. Render checkboxes with local state
3. On save: `PUT /permissions/moderator` + `PUT /permissions/user` (two separate calls)
4. On success: toast + `queryClient.invalidateQueries` for `permissionMatrix` key

**Query key to add to `queryKeys.ts`:**
```typescript
permissionMatrix: ['permission-matrix'] as const,
```

---

## 5. Implementation Order

### Phase 1 — Database + Seed (Day 1)
1. Add `Permission` + `RolePermission` models to `schema.prisma`
2. Run `prisma migrate dev --name add_permissions`
3. Write `prisma/seeds/permissions.seed.ts` with all 24 permissions + default moderator grants
4. Run seed, verify via Prisma Studio

### Phase 2 — Backend Core (Day 2)
5. Create `src/permissions/permissions.module.ts`
6. Create `src/permissions/permissions.service.ts` (cache + CRUD)
7. Create `src/permissions/permissions.controller.ts` (GET + PUT endpoints)
8. Create `src/permissions/dto/update-role-permissions.dto.ts`
9. Create `src/common/guards/permission.guard.ts`
10. Add `RequirePermission` decorator to `roles.decorator.ts` (or new `permission.decorator.ts`)
11. Wire `PermissionsModule` into `app.module.ts`
12. Extend `AuthService.getMe()` to return `permissions[]`
13. Import `PermissionsModule` into `AuthModule`

### Phase 3 — Migrate Existing Guards (Day 3)
14. Update `evaluations.controller.ts` — swap `@Roles(...)` → `@RequirePermission(...)`
15. Update `groups.controller.ts`
16. Update `staff.controller.ts` (CUD operations)
17. Update `questions.controller.ts` (CUD operations)
18. Update `evaluation-periods.controller.ts` (CUD operations)
19. Update `organization-units.controller.ts` (CUD operations)
20. Keep `users.controller.ts` admin-only with `@Roles('admin')` — user role management is not dynamically configurable by design
21. Write unit tests for `PermissionGuard` and `PermissionsService`

### Phase 4 — Frontend (Day 4–5)
22. Extend `AuthUser` interface + `useAuth` to include `permissions`, `hasPermission()`
23. Update `ProtectedRoute` to accept `requirePermission` prop
24. Update `App.tsx` routes to use `requirePermission`
25. Update `AppSidebar.tsx` to filter items by permission
26. Add `permissionMatrix` to `queryKeys.ts`
27. Create `AdminPermissions.tsx` checkbox matrix page
28. Register route `/admin/permissions` in `App.tsx`
29. Add sidebar entry for `/admin/permissions`

### Phase 5 — Testing + Polish (Day 6)
30. Manual E2E: login as moderator → verify only granted pages visible
31. Test cache invalidation: change permission → verify takes effect within 60s
32. Add `AdminPermissions` route to Swagger exclusion if needed
33. Update `roles.guard.spec.ts` → add `permission.guard.spec.ts`

---

## 6. Caching Strategy Detail

**Chosen: In-process `Map` with TTL** (no Redis dependency needed)

```
Cache key:   role string (e.g. "moderator")
Cache value: { perms: Set<string>, ts: number }
TTL:         60 seconds
Invalidation: immediate on PUT /permissions/:role (delete that role's key)
```

**Behavior on cache miss:**
- Query `role_permissions JOIN permissions WHERE role = ?`
- Result set is small (max ~24 rows per role)
- Single DB round-trip per role per minute under load

**Why not embed in JWT:**
- Tokens are 15min — admin changes would take up to 15min to propagate
- Would require token reissue mechanism
- /auth/me is called on every app boot and is cached by React Query (30s staleTime already set)

**Why not `@nestjs/cache-manager`:**
- Would add dependency; in-memory Map is simpler for thesis scale
- No multi-instance concern (single-server deployment)

---

## 7. Trade-offs and Risks

| # | Issue | Impact | Mitigation |
|---|---|---|---|
| 1 | **Cache staleness (60s TTL)** | Revoked permission takes up to 60s to take effect | Accept for thesis; document in thesis as known trade-off. Reduce TTL to 10s if needed. |
| 2 | **Permissions in `/auth/me` not in JWT** | Every cold-start re-fetches `/auth/me`; permissions not available offline | Already the case for roles. React Query 30s staleTime means 1 refetch per 30s max. Acceptable. |
| 3 | **`user` role permissions** | Currently all authenticated GET endpoints are open (no `@Roles` check). Adding `@RequirePermission` to reads would break regular staff experience if misconfigured. | Leave most GET endpoints open (no `@RequirePermission`). Only protect admin-facing CUD + aggregation endpoints. |
| 4 | **Admin role hardcoded bypass** | Admin cannot be restricted — a deliberate design choice | Document clearly. In `PermissionGuard`: `if (user.roles.includes('admin')) return true;` — thesis committee will approve this as correct security design. |
| 5 | **`moderatorItems` removal from Sidebar** | UX regression if moderator has no permissions granted | Seed ensures moderator gets `groups.view` etc. by default. Also: empty admin section just won't render (no visible items). |
| 6 | **Migration on existing prod data** | New tables are additive, no column changes on existing tables | Zero-risk migration. `prisma migrate deploy` is safe. |
| 7 | **`PermissionsService` circular dependency** | `AuthModule` needs `PermissionsService`, `PermissionsModule` needs `PrismaModule` — no circular dep since `AuthModule` doesn't import `PermissionsModule` back | Verify module graph before wiring; use `forwardRef` only if needed (unlikely here). |
| 8 | **Permission key typos** | String keys like `"staff.view"` can drift between FE/BE | Define `PERMISSIONS` constant object in a shared location. On backend: `src/permissions/permission-keys.ts`. Pass same strings as API response to FE — no FE-side hardcoding of keys needed for the guard (just call `hasPermission(item.perm)` where `item.perm` is the key from the matrix response). |

---

## 8. File Paths Reference

**Backend — new files:**
- `src/permissions/permissions.module.ts`
- `src/permissions/permissions.service.ts`
- `src/permissions/permissions.controller.ts`
- `src/permissions/dto/update-role-permissions.dto.ts`
- `src/permissions/permission-keys.ts` (PERMISSIONS constant)
- `src/common/guards/permission.guard.ts`
- `src/common/decorators/permission.decorator.ts` (RequirePermission)
- `prisma/seeds/permissions.seed.ts`

**Backend — modified files:**
- `prisma/schema.prisma` — add 2 models
- `src/auth/auth.service.ts` — extend `getMe()` to return `permissions[]`
- `src/auth/auth.module.ts` — import `PermissionsModule`
- `src/app.module.ts` — import `PermissionsModule`
- `src/evaluations/evaluations.controller.ts` — swap guards
- `src/groups/groups.controller.ts` — swap guards
- `src/staff/staff.controller.ts` — add permission decorator
- `src/questions/questions.controller.ts` — swap guards
- `src/evaluation-periods/evaluation-periods.controller.ts` — swap guards
- `src/organization-units/organization-units.controller.ts` — swap guards

**Frontend — new files:**
- `src/pages/admin/AdminPermissions.tsx`

**Frontend — modified files:**
- `src/hooks/useAuth.tsx` — add `permissions`, `hasPermission`
- `src/components/ProtectedRoute.tsx` — add `requirePermission` prop
- `src/App.tsx` — update routes
- `src/components/AppSidebar.tsx` — dynamic nav filtering
- `src/lib/queryKeys.ts` — add `permissionMatrix`

---

## Unresolved Questions

1. **`user` role write permissions:** Should regular staff ever be granted `staff.edit` (own profile)? Currently `PATCH /staff/:id` uses an ownership check in the service layer, not a role check. Clarify scope before Phase 3.

2. **`/admin/permissions` page visibility:** Should this page appear in the sidebar for `admin` only, or should it be a grantable permission? Recommendation: always admin-only (driven by `isAdmin` flag, not a dynamic permission) to avoid lockout scenario.

3. **Multiple roles per user:** A user could hold both `moderator` and `user` roles. `PermissionGuard` iterates all roles and grants if any role has the permission — this is correct union-based RBAC. Verify this is the intended semantics.
