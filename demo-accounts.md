# Demo Accounts - Staff Evaluation Hub

## Quick Login

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@demo.com | Admin@123 |
| **Moderator** | moderator@demo.com | Mod@123 |
| **User** | user1@demo.com | User@123 |

---

## All Demo Accounts

### Admin Account (Full Access)
- **Email:** `admin@demo.com`
- **Password:** `Admin@123`
- **Linked Staff:** Nguyễn Văn An (PGS, Tiến sỹ)
- **Department:** Khoa Công nghệ thông tin
- **Permissions:** All admin features, user management, evaluation management

### Moderator Account
- **Email:** `moderator@demo.com`
- **Password:** `Mod@123`
- **Linked Staff:** Lê Văn Cường (GS, Tiến sỹ)
- **Department:** Khoa Công nghệ thông tin
- **Permissions:** Group management, evaluation oversight

### Regular User Accounts

| Email | Password | Staff Name | Department |
|-------|----------|------------|------------|
| user1@demo.com | User@123 | Trần Thị Bình | Khoa Công nghệ thông tin |
| user2@demo.com | User@123 | Phạm Thị Dung | Khoa Kinh tế |
| user3@demo.com | User@123 | Hoàng Văn Em | Khoa Kinh tế |
| user4@demo.com | User@123 | Vũ Thị Phương | Khoa Ngoại ngữ |
| user5@demo.com | User@123 | Đặng Văn Giang | Khoa Ngoại ngữ |
| user6@demo.com | User@123 | Bùi Thị Hoa | Khoa Công nghệ thông tin |

---

## Legacy Accounts (Not Linked to Staff)

These accounts exist for backward compatibility but are **not linked** to any staff profile. They cannot perform evaluations.

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | Admin |
| test@example.com | test123 | User |

---

## Sample Data Overview

### Organization Units (Departments)
1. Khoa Công nghệ thông tin
2. Khoa Kinh tế
3. Khoa Ngoại ngữ

### Groups
1. Nhóm Lập trình (Khoa CNTT)
2. Nhóm Mạng máy tính (Khoa CNTT)
3. Nhóm Kinh tế vĩ mô (Khoa Kinh tế)
4. Nhóm Tiếng Anh (Khoa Ngoại ngữ)

### Evaluation Questions
1. Tinh thần trách nhiệm
2. Khả năng hợp tác
3. Chuyên môn nghiệp vụ
4. Đổi mới sáng tạo
5. Thái độ làm việc

---

## URLs

- **Hub (Frontend):** http://localhost:8080
- **API (Backend):** http://localhost:3001
- **Swagger Docs:** http://localhost:3001/api

---

## Reset Database

To reset the database with fresh sample data:

```bash
mise run db:reset
```

Or manually:

```bash
cd staffEvaluation-api
npx prisma db push --accept-data-loss
pnpm db:seed
```
