# Timeline — Staff Evaluation System (Peer Review Hub)

> Bachelor thesis project · 8 tuần đã hoàn thành (tính đến 2026-04-15)
> Tổng kế hoạch: 12 tuần · Trạng thái: đang ở giai đoạn xây dựng chương trình (Nội dung 4)

---

## Nội dung 1 — Tìm hiểu tổng quan về bài toán (Tuần 1–2)

**Kế hoạch:**
- Khảo sát yêu cầu, hiện trạng, hoàn cảnh bối cảnh.
- Xây dựng đề bài và mục tiêu dự án.
- Xây dựng giải pháp khả thi ngắn gọn.
- Tìm hiểu các nguồn mở.

**Đã hoàn thành:**
- Xác định được bài toán: số hóa quy trình đánh giá chéo định kỳ (peer-review) của giảng viên trong khoa, thay thế quy trình dựa trên giấy/Excel.
- Đặc tả problem statement: data fragmentation, auditability gaps, role confusion, reporting overhead, authentication friction (ghi nhận trong `README.md §1.2`).
- Xác định mục tiêu chức năng (CRUD staff/group/criteria/period, thang điểm 0–4, ràng buộc một kỳ active, báo cáo radar/bar, export CSV, Microsoft OAuth) và phi chức năng (hiệu năng, bảo mật, audit).
- Khảo sát các nguồn mở tương đồng: các hệ 360° feedback thương mại (Culture Amp, Lattice) và nguồn mở (OrangeHRM) — chốt hướng tự xây do ràng buộc tích hợp SSO của trường và quy trình đặc thù.

---

## Nội dung 2 — Tìm hiểu tổng quan về công nghệ liên quan (Tuần 3–4)

**Kế hoạch:**
- Về cơ sở dữ liệu.
- Về web front-end.
- Về web back-end.
- Về linh kiện thiết bị.
- Về các giao thức.

**Đã hoàn thành:**
- **Cơ sở dữ liệu:** chốt PostgreSQL cho dữ liệu quan hệ (staff, group, period, evaluation). Khảo sát Prisma ORM cho type-safe migration và schema-first workflow.
- **Front-end:** khảo sát React 18 + TypeScript + Vite, TanStack Query cho server state, React Hook Form + Zod cho validation, Tailwind + shadcn/ui cho design system.
- **Back-end:** chốt NestJS (TypeScript) với kiến trúc modular + DI container sẵn có; Passport cho auth strategies; class-validator cho DTO validation.
- **Hạ tầng triển khai:** Docker Compose cho dev và prod, deploy trên server on-premise công suất vừa.
- **Giao thức:** HTTPS cho traffic, OAuth 2.0 (Authorization Code + PKCE) cho SSO Microsoft, JWT cho session, bcrypt cho local credentials.

---

## Nội dung 3 — Phân tích thiết kế (Tuần 5–6)

**Kế hoạch:**
- Sơ đồ chức năng.
- Usecase mô tả cách thức hệ thống tương tác với người sử dụng.
- Mô hình/Kiến trúc hạ tầng thiết bị, máy chủ, máy ảo.
- Mô hình tích hợp/Kiến trúc các phần mềm, thư viện như load balancing, kafka…
- Thiết kế cơ sở dữ liệu và quan hệ giữa các dữ liệu.
- Thiết kế giao diện người dùng.
- Các giao thức như https, mqtt, dns.
- Các cấu trúc gói tin/payload.
- Các thuật toán chính như jwt, base64, sinh mật khẩu, RSA…

**Đã hoàn thành:**
- **Sơ đồ chức năng & use case:** định nghĩa 3 role (Admin, Group Moderator, Reviewer) và các use case chính: quản lý kỳ đánh giá, CRUD nhân sự/nhóm/tiêu chí, thực hiện đánh giá, xem báo cáo, export (ghi nhận trong `README.md §3`).
- **Kiến trúc hệ thống:** SPA React ↔ REST API NestJS ↔ PostgreSQL, triển khai bằng Docker Compose trên máy chủ on-premise. Quyết định: không dùng load balancer/Kafka ở giai đoạn này do quy mô khoa (< vài trăm người dùng).
- **Thiết kế CSDL:** ERD hoàn chỉnh trong `docs/erd.md` — các thực thể Staff, OrgUnit, Group, Criteria, EvaluationPeriod, Evaluation, EvaluationScore cùng quan hệ; ràng buộc nghiệp vụ "đúng một kỳ active" được enforce ở cả DB và service layer.
- **Giao diện người dùng:** thiết kế wireframe cho dashboard admin, trang đánh giá, trang báo cáo (radar/bar chart). Sử dụng Tailwind + shadcn/ui cho design tokens nhất quán.
- **Giao thức & payload:** HTTPS, RESTful JSON, chuẩn hóa error response (mã + message), pagination chuẩn.
- **Thuật toán chính:** JWT (HS256) cho access token, bcrypt cho password hashing, OAuth 2.0 Authorization Code + PKCE cho Microsoft SSO, base64 cho file upload avatar.

---

## Nội dung 4 — Xây dựng chương trình (Tuần 7–12, *đang thực hiện*)

**Kế hoạch:**
- Thiết kế cơ sở dữ liệu với framework cụ thể.
- Các ORM của cơ sở dữ liệu.
- Đặc tả chi tiết các hàm (có thể chụp ảnh minh họa và tham chiếu tới swagger, phụ lục nếu dài).
- Cấu trúc các component giao diện chính của React hoặc tương đương.
- Các giao diện hàm, tham số, convention chính như là tên hàm, tên các tham số vào ra và ý nghĩa của mỗi hàm.

**Đã hoàn thành (Tuần 7–8):**

### Backend (`staffEvaluation-api`, `peer-review-api`)
- **Schema & ORM:** Prisma schema hoàn chỉnh, migration tracked trong git, seed data cho demo accounts (`demo-accounts.md`).
- **Auth module:** local email/password (bcrypt + JWT) + Microsoft OAuth 2.0 SSO flow đầy đủ (commit `f8e744a`).
- **Core modules:** Staff, OrgUnit, Group, Criteria, EvaluationPeriod, Evaluation — CRUD + business rules (chỉ một period active, auto-deactivate khi activate period khác).
- **Reporting:** aggregate per-question averages, ranking, radar/bar data endpoints, CSV export.
- **Avatar upload:** file upload + serve, validation MIME/size.
- **Swagger/OpenAPI** doc tự sinh, là đặc tả chi tiết các hàm API.
- **SOLID / robustness hardening (BE-1..9, commit `2f5c572`):** refactor theo dõi trong `docs/solidfix.md` — tách service, inject dependencies, chuẩn hóa error handling, bổ sung observability (logging, metrics), closed security gaps.
- **Testing:** unit test cho service layer, integration test cho auth/evaluation flow (ConfigService + Throttler test setup ghi chú trong memory).

### Frontend (`staffEvaluation-hub`)
- **Component structure:** phân tách theo feature (auth/, evaluation/, admin/, reporting/), shared UI primitives (`components/ui/`) dựa trên shadcn/ui.
- **State:** TanStack Query cho server state, React Hook Form + Zod cho form validation.
- **Các trang chính:** Login (local + Microsoft), Dashboard, Evaluation form, Admin CRUD (Staff/Group/Criteria/Period), Reports (radar + bar + ranking + CSV export), Profile với avatar upload.
- **FE-1..8 hardening:** accessibility (a11y) fixes, performance (lazy load, code split), error boundaries, loading/empty states chuẩn hóa.
- **Responsive** layout cho desktop và tablet.

### DevOps & Documentation
- **Docker Compose** cho dev (`docker-compose.yml`) và prod (`docker-compose.prod.yml`).
- **mise.toml** quản lý tool versions (Node, pnpm) nhất quán giữa team.
- **README.md** — System Design Document hoàn chỉnh (introduction, architecture, use case, flow, DB design, API design, security, QA).
- **docs/** — `erd.md` (data model), `solidfix.md` (refactor log), `thingstofix.md` (backlog).

**Còn lại (Tuần 9–12):**
- Hoàn thiện BE-10 và các mục còn sót trong `docs/solidfix.md`.
- Bổ sung test coverage (target > 70% cho service layer).
- User acceptance testing với giảng viên trong khoa.
- Chuẩn bị slide và demo cho buổi bảo vệ.
- Viết báo cáo đồ án (thesis document) dựa trên `README.md` làm xương sống.

---

## Tổng kết tiến độ

| Tuần | Nội dung | Trạng thái |
|------|----------|------------|
| 1–2  | Tổng quan bài toán | Hoàn thành |
| 3–4  | Tổng quan công nghệ | Hoàn thành |
| 5–6  | Phân tích thiết kế | Hoàn thành |
| 7–8  | Xây dựng chương trình (core) | Hoàn thành — BE-1..9, FE-1..8, OAuth, observability |
| 9–12 | Hoàn thiện, test, bảo vệ | Đang thực hiện |
