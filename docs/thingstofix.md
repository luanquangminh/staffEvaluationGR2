# Things to Fix — Bachelor Thesis Review

Review of the Staff Evaluation System as a HUST SoICT graduation research project.
Overall verdict: **Solid B+/A−**. Code is production-shaped. Weak spots are methodological, not technical.

---

## Must-Fix Before Submission (1–2 days)

### 1. Password complexity policy
- **Where:** `staffEvaluation-api/src/auth/dto/register.dto.ts`
- **Current:** just `@IsString()` — accepts `"a"`
- **Fix:** min 8 chars, require upper + lower + digit. Use `@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)`
- **Why it matters:** committee will ask about auth hardening; trivial to fix, embarrassing to miss

### 2. Global rate limiting + security headers
- **Where:** `staffEvaluation-api/src/main.ts`
- **Current:** only `/bulk` endpoints are throttled
- **Fix:**
  - Add `helmet()` middleware
  - Add `@nestjs/throttler` globally (e.g., 100 req/min per IP)
  - Keep stricter per-user limit on `/bulk`
- **Why:** brute-force login + resource exhaustion are standard audit questions

### 3. Write "Limitations & Future Work" section
- **Where:** thesis document (not code)
- **Content must include:**
  - No inter-rater reliability metric (Krippendorff's α, Cohen's κ)
  - No fairness/bias analysis across organizational units
  - No user study with real HUST faculty
  - CSRF state is in-memory (single-pod only)
  - No load-test numbers
- **Why:** committees reward honest self-assessment over hand-waving

---

## Should-Fix If Time Permits

### 4. Performance benchmark
- Write a k6 or autocannon script hitting `/evaluations?periodId=X` with 10k rows
- Record p50/p95/p99 latency and throughput in a table
- Put the chart in the thesis "Evaluation" chapter
- **Why:** turns `FIND_ALL_HARD_CAP` from a code constant into a defended design decision

### 5. CSRF state persistence
- **Where:** `staffEvaluation-api/src/auth/` (OAuth state handling)
- **Current:** in-memory Map → lost on restart, breaks with >1 pod
- **Fix options:**
  - Move to Redis-backed store, OR
  - Document in thesis that deployment is single-pod and this is acceptable

### 6. Small 5-person usability test
- Recruit 5 HUST faculty/peers, give them a task list, record time-on-task + errors
- Even informal results add an "Evaluation" section with real data
- **Why:** converts the project from "I built a thing" to "I built a thing and measured it"

---

## Acknowledge But Do Not Fix (mention as Future Work)

- Fairness metrics (Krippendorff α, demographic bias analysis)
- Multi-tenancy (currently single-faculty)
- Mobile app (only responsive web)
- Offline mode / PWA
- Notification email delivery (only in-app bell)

---

## Anticipated Committee Questions — Prep Answers

| Question | Suggested Answer |
|---|---|
| "How do you validate evaluation fairness?" | "Not in scope; future work: inter-rater reliability + bias detection across groups" |
| "Rate-limiting strategy?" | "Per-user on /bulk, global via throttler, stricter for auth" (after fix #2) |
| "CSRF state with 2 pods?" | "Single-pod deployment assumed; Redis-backed migration path is straightforward" |
| "Password policy?" | Point to register.dto.ts after fix #1 |
| "Performance at scale?" | Point to benchmark table after fix #4 |
| "Backup/DR?" | "Operational plan: nightly `pg_dump` → S3 with 30-day retention" |
| "User study?" | "Informal 5-person test" (after fix #6) OR "future work with IRB approval" |

---

## Strengths to Lead With in Defense

These are already done — highlight them, don't just list them:

1. **OAuth + auto-link staff by schoolEmail** — race-safe via Prisma P2002 handling (`auth.service.ts:61-71`)
2. **Bulk upsert with composite unique key** `(evaluatorId, evaluateeId, questionId, periodId)` — idempotent resubmission
3. **Pagination truncation flag** — honest signal to UI instead of silent cap
4. **Request-ID middleware** — production observability
5. **RBAC** via `@Roles()` + `RolesGuard` — clean separation, 224 passing tests
6. **Env validation** with production-only rules — JWT_REFRESH_SECRET ≥32 chars, ≠ JWT_SECRET
7. **Documentation fidelity** — README matches code, ERD matches schema, Swagger is live

---

## Thesis Structure Recommendation

1. **Introduction** — peer-evaluation problem at HUST SoICT
2. **Related Work** — 360-review systems, academic evaluation tools
3. **System Design** — lead with ERD + the 7 strengths above as design decisions
4. **Implementation** — NestJS + Prisma + React; OAuth auto-link flow diagram
5. **Evaluation** — test coverage %, performance benchmark, usability notes
6. **Limitations** — the honest list above
7. **Future Work** — fairness metrics, user study with IRB, multi-tenancy

---

## Priority Order

1. Password policy (30 min)
2. Helmet + rate limit (1 hour)
3. Write Limitations section (2 hours)
4. Benchmark script + results (half day)
5. Usability test (1 day incl. recruitment)
6. CSRF → Redis *(optional; can defer)*

**Bottom line:** the engineering is ready. What's missing is **academic framing** — turn code decisions into defended research claims.
