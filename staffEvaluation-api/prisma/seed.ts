import { PrismaClient, AppRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database with sample data...\n');

  // 1. Create Organization Units (Khoa)
  console.log('1. Creating organization units...');
  const orgUnits = await Promise.all([
    prisma.organizationUnit.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, name: 'Khoa Công nghệ thông tin' },
    }),
    prisma.organizationUnit.upsert({
      where: { id: 2 },
      update: {},
      create: { id: 2, name: 'Khoa Kinh tế' },
    }),
    prisma.organizationUnit.upsert({
      where: { id: 3 },
      update: {},
      create: { id: 3, name: 'Khoa Ngoại ngữ' },
    }),
  ]);
  console.log(`   ✓ Created ${orgUnits.length} organization units\n`);

  // 2. Create Staff
  console.log('2. Creating staff members...');
  const staffData = [
    { id: 1, name: 'Nguyễn Văn An', emailh: 'an.nv@example.com', emails: 'an.nv@school.edu.vn', staffcode: 'GV001', sex: 1, academicrank: 'PGS', academicdegree: 'Tiến sỹ', organizationunitid: 1 },
    { id: 2, name: 'Trần Thị Bình', emailh: 'binh.tt@example.com', emails: 'binh.tt@school.edu.vn', staffcode: 'GV002', sex: 0, academicrank: null, academicdegree: 'Thạc sỹ', organizationunitid: 1 },
    { id: 3, name: 'Lê Văn Cường', emailh: 'cuong.lv@example.com', emails: 'cuong.lv@school.edu.vn', staffcode: 'GV003', sex: 1, academicrank: 'GS', academicdegree: 'Tiến sỹ', organizationunitid: 1 },
    { id: 4, name: 'Phạm Thị Dung', emailh: 'dung.pt@example.com', emails: 'dung.pt@school.edu.vn', staffcode: 'GV004', sex: 0, academicrank: null, academicdegree: 'Tiến sỹ', organizationunitid: 2 },
    { id: 5, name: 'Hoàng Văn Em', emailh: 'em.hv@example.com', emails: 'em.hv@school.edu.vn', staffcode: 'GV005', sex: 1, academicrank: 'PGS', academicdegree: 'Tiến sỹ', organizationunitid: 2 },
    { id: 6, name: 'Vũ Thị Phương', emailh: 'phuong.vt@example.com', emails: 'phuong.vt@school.edu.vn', staffcode: 'GV006', sex: 0, academicrank: null, academicdegree: 'Thạc sỹ', organizationunitid: 3 },
    { id: 7, name: 'Đặng Văn Giang', emailh: 'giang.dv@example.com', emails: 'giang.dv@school.edu.vn', staffcode: 'GV007', sex: 1, academicrank: null, academicdegree: 'Tiến sỹ', organizationunitid: 3 },
    { id: 8, name: 'Bùi Thị Hoa', emailh: 'hoa.bt@example.com', emails: 'hoa.bt@school.edu.vn', staffcode: 'GV008', sex: 0, academicrank: 'PGS', academicdegree: 'Tiến sỹ', organizationunitid: 1 },
  ];

  for (const s of staffData) {
    await prisma.staff.upsert({
      where: { id: s.id },
      update: s,
      create: s,
    });
  }
  console.log(`   ✓ Created ${staffData.length} staff members\n`);

  // 3. Create Groups
  console.log('3. Creating groups...');
  const groups = await Promise.all([
    prisma.group.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, name: 'Nhóm Lập trình', organizationunitid: 1 },
    }),
    prisma.group.upsert({
      where: { id: 2 },
      update: {},
      create: { id: 2, name: 'Nhóm Mạng máy tính', organizationunitid: 1 },
    }),
    prisma.group.upsert({
      where: { id: 3 },
      update: {},
      create: { id: 3, name: 'Nhóm Kinh tế vĩ mô', organizationunitid: 2 },
    }),
    prisma.group.upsert({
      where: { id: 4 },
      update: {},
      create: { id: 4, name: 'Nhóm Tiếng Anh', organizationunitid: 3 },
    }),
  ]);
  console.log(`   ✓ Created ${groups.length} groups\n`);

  // 4. Create Staff2Groups (assign staff to groups)
  console.log('4. Assigning staff to groups...');
  const staff2groupsData = [
    { staffid: 1, groupid: 1 },
    { staffid: 2, groupid: 1 },
    { staffid: 3, groupid: 1 },
    { staffid: 8, groupid: 1 },
    { staffid: 1, groupid: 2 },
    { staffid: 3, groupid: 2 },
    { staffid: 4, groupid: 3 },
    { staffid: 5, groupid: 3 },
    { staffid: 6, groupid: 4 },
    { staffid: 7, groupid: 4 },
  ];

  for (const s2g of staff2groupsData) {
    await prisma.staff2Group.upsert({
      where: {
        staffid_groupid: { staffid: s2g.staffid, groupid: s2g.groupid },
      },
      update: {},
      create: s2g,
    });
  }
  console.log(`   ✓ Created ${staff2groupsData.length} staff-group assignments\n`);

  // 5. Create Questions
  console.log('5. Creating evaluation questions...');
  const questions = await Promise.all([
    prisma.question.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, title: 'Tinh thần trách nhiệm', description: 'Đánh giá mức độ hoàn thành công việc được giao' },
    }),
    prisma.question.upsert({
      where: { id: 2 },
      update: {},
      create: { id: 2, title: 'Khả năng hợp tác', description: 'Đánh giá khả năng làm việc nhóm và phối hợp với đồng nghiệp' },
    }),
    prisma.question.upsert({
      where: { id: 3 },
      update: {},
      create: { id: 3, title: 'Chuyên môn nghiệp vụ', description: 'Đánh giá năng lực chuyên môn và kiến thức' },
    }),
    prisma.question.upsert({
      where: { id: 4 },
      update: {},
      create: { id: 4, title: 'Đổi mới sáng tạo', description: 'Đánh giá khả năng đề xuất ý tưởng mới và cải tiến công việc' },
    }),
    prisma.question.upsert({
      where: { id: 5 },
      update: {},
      create: { id: 5, title: 'Thái độ làm việc', description: 'Đánh giá thái độ tích cực, chuyên nghiệp trong công việc' },
    }),
  ]);
  console.log(`   ✓ Created ${questions.length} questions\n`);

  // 6. Create Demo User Accounts
  console.log('6. Creating demo user accounts...');

  const demoAccounts = [
    // Admin account
    { email: 'admin@demo.com', password: 'Admin@123', staffId: 1, roles: [AppRole.admin, AppRole.user] },
    // Moderator account
    { email: 'moderator@demo.com', password: 'Mod@123', staffId: 3, roles: [AppRole.moderator, AppRole.user] },
    // Regular users linked to different staff/departments
    { email: 'user1@demo.com', password: 'User@123', staffId: 2, roles: [AppRole.user] },
    { email: 'user2@demo.com', password: 'User@123', staffId: 4, roles: [AppRole.user] },
    { email: 'user3@demo.com', password: 'User@123', staffId: 5, roles: [AppRole.user] },
    { email: 'user4@demo.com', password: 'User@123', staffId: 6, roles: [AppRole.user] },
    { email: 'user5@demo.com', password: 'User@123', staffId: 7, roles: [AppRole.user] },
    { email: 'user6@demo.com', password: 'User@123', staffId: 8, roles: [AppRole.user] },
  ];

  for (const account of demoAccounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10);

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { passwordHash: hashedPassword },
      create: {
        email: account.email,
        passwordHash: hashedPassword,
      },
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: { staffId: account.staffId },
      create: {
        userId: user.id,
        staffId: account.staffId,
      },
    });

    for (const role of account.roles) {
      await prisma.userRole.upsert({
        where: {
          userId_role: { userId: user.id, role },
        },
        update: {},
        create: {
          userId: user.id,
          role,
        },
      });
    }
  }
  console.log(`   ✓ Created ${demoAccounts.length} demo user accounts\n`);

  // Legacy accounts for backward compatibility
  console.log('7. Creating legacy test accounts...');
  const legacyPassword = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: legacyPassword,
    },
  });

  await prisma.profile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      staffId: null,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_role: { userId: adminUser.id, role: AppRole.admin },
    },
    update: {},
    create: {
      userId: adminUser.id,
      role: AppRole.admin,
    },
  });

  const testPassword = await bcrypt.hash('test123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: testPassword,
    },
  });

  await prisma.profile.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      staffId: null,
    },
  });
  console.log('   ✓ Created legacy accounts\n');

  // 8. Create Sample Evaluations
  console.log('8. Creating sample evaluations...');
  const evaluationData = [];
  const now = new Date();

  // Staff 1 evaluates Staff 2, 3, 8 in group 1
  for (const victimid of [2, 3, 8]) {
    for (const questionid of [1, 2, 3, 4, 5]) {
      evaluationData.push({
        reviewerid: 1,
        victimid,
        groupid: 1,
        questionid,
        point: Math.round((Math.random() * 2 + 2) * 10) / 10, // Random 2.0-4.0
        modifieddate: now,
      });
    }
  }

  // Staff 2 evaluates Staff 1, 3, 8 in group 1
  for (const victimid of [1, 3, 8]) {
    for (const questionid of [1, 2, 3, 4, 5]) {
      evaluationData.push({
        reviewerid: 2,
        victimid,
        groupid: 1,
        questionid,
        point: Math.round((Math.random() * 2 + 2) * 10) / 10,
        modifieddate: now,
      });
    }
  }

  // Staff 4 evaluates Staff 5 in group 3
  for (const questionid of [1, 2, 3, 4, 5]) {
    evaluationData.push({
      reviewerid: 4,
      victimid: 5,
      groupid: 3,
      questionid,
      point: Math.round((Math.random() * 2 + 2) * 10) / 10,
      modifieddate: now,
    });
  }

  for (const e of evaluationData) {
    await prisma.evaluation.create({ data: e });
  }
  console.log(`   ✓ Created ${evaluationData.length} sample evaluations\n`);

  // Reset sequences
  console.log('10. Resetting sequences...');
  await prisma.$executeRawUnsafe(`SELECT setval('organizationunits_id_seq', COALESCE((SELECT MAX(id) FROM organizationunits), 0) + 1, false)`);
  await prisma.$executeRawUnsafe(`SELECT setval('staff_id_seq', COALESCE((SELECT MAX(id) FROM staff), 0) + 1, false)`);
  await prisma.$executeRawUnsafe(`SELECT setval('groups_id_seq', COALESCE((SELECT MAX(id) FROM groups), 0) + 1, false)`);
  await prisma.$executeRawUnsafe(`SELECT setval('staff2groups_id_seq', COALESCE((SELECT MAX(id) FROM staff2groups), 0) + 1, false)`);
  await prisma.$executeRawUnsafe(`SELECT setval('questions_id_seq', COALESCE((SELECT MAX(id) FROM questions), 0) + 1, false)`);
  await prisma.$executeRawUnsafe(`SELECT setval('evaluations_id_seq', COALESCE((SELECT MAX(id) FROM evaluations), 0) + 1, false)`);
  console.log('   ✓ Sequences reset\n');

  console.log('========================================');
  console.log('Seeding completed successfully!');
  console.log('========================================\n');

  console.log('Test Accounts:');
  console.log('  ┌───────────────────────────────────────────────────────────────┐');
  console.log('  │ DEMO ACCOUNTS                                                 │');
  console.log('  ├───────────────────────────────────────────────────────────────┤');
  console.log('  │ Admin:     admin@demo.com / Admin@123                         │');
  console.log('  │ Moderator: moderator@demo.com / Mod@123                       │');
  console.log('  │ User 1:    user1@demo.com / User@123 (Trần Thị Bình)          │');
  console.log('  │ User 2:    user2@demo.com / User@123 (Phạm Thị Dung)          │');
  console.log('  │ User 3:    user3@demo.com / User@123 (Hoàng Văn Em)           │');
  console.log('  │ User 4:    user4@demo.com / User@123 (Vũ Thị Phương)          │');
  console.log('  │ User 5:    user5@demo.com / User@123 (Đặng Văn Giang)         │');
  console.log('  │ User 6:    user6@demo.com / User@123 (Bùi Thị Hoa)            │');
  console.log('  ├───────────────────────────────────────────────────────────────┤');
  console.log('  │ LEGACY ACCOUNTS (not linked to staff)                         │');
  console.log('  │ Admin: admin@example.com / admin123                           │');
  console.log('  │ User:  test@example.com / test123                             │');
  console.log('  └───────────────────────────────────────────────────────────────┘');

  await prisma.$disconnect();
}

seed().catch(console.error);
