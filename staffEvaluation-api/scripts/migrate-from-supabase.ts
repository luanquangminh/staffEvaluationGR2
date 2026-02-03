import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Supabase configuration
const SUPABASE_URL = 'https://dgatzfhvbmszcpsrcuij.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnYXR6Zmh2Ym1zemNwc3JjdWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTQwNzQsImV4cCI6MjA4MjA3MDA3NH0.kcfy__-gmr5-BdYp5asdPOkMxJEXgjT6Y0gxLjA5PoM';

async function fetchFromSupabase(table: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${table}: ${response.statusText}`);
  }

  return response.json();
}

async function migrate() {
  console.log('Starting migration from Supabase to PostgreSQL...\n');

  try {
    // 1. Migrate Organization Units
    console.log('1. Migrating organization units...');
    const orgUnits = await fetchFromSupabase('organizationunits');
    console.log(`   Found ${orgUnits.length} organization units`);

    for (const unit of orgUnits) {
      await prisma.organizationUnit.upsert({
        where: { id: unit.id },
        update: { name: unit.name },
        create: { id: unit.id, name: unit.name },
      });
    }
    console.log('   ✓ Organization units migrated\n');

    // 2. Migrate Staff
    console.log('2. Migrating staff...');
    const staff = await fetchFromSupabase('staff');
    console.log(`   Found ${staff.length} staff members`);

    for (const s of staff) {
      await prisma.staff.upsert({
        where: { id: s.id },
        update: {
          name: s.name,
          emailh: s.emailh,
          emails: s.emails,
          staffcode: s.staffcode,
          sex: s.sex,
          birthday: s.birthday,
          mobile: s.mobile,
          academicrank: s.academicrank,
          academicdegree: s.academicdegree,
          organizationunitid: s.organizationunitid,
          bidv: s.bidv,
        },
        create: {
          id: s.id,
          name: s.name,
          emailh: s.emailh,
          emails: s.emails,
          staffcode: s.staffcode,
          sex: s.sex,
          birthday: s.birthday,
          mobile: s.mobile,
          academicrank: s.academicrank,
          academicdegree: s.academicdegree,
          organizationunitid: s.organizationunitid,
          bidv: s.bidv,
        },
      });
    }
    console.log('   ✓ Staff migrated\n');

    // 3. Migrate Groups
    console.log('3. Migrating groups...');
    const groups = await fetchFromSupabase('groups');
    console.log(`   Found ${groups.length} groups`);

    for (const g of groups) {
      await prisma.group.upsert({
        where: { id: g.id },
        update: {
          name: g.name,
          organizationunitid: g.organizationunitid,
        },
        create: {
          id: g.id,
          name: g.name,
          organizationunitid: g.organizationunitid,
        },
      });
    }
    console.log('   ✓ Groups migrated\n');

    // 4. Migrate Staff2Groups
    console.log('4. Migrating staff-group relationships...');
    const staff2groups = await fetchFromSupabase('staff2groups');
    console.log(`   Found ${staff2groups.length} staff-group relationships`);

    for (const s2g of staff2groups) {
      await prisma.staff2Group.upsert({
        where: { id: s2g.id },
        update: {
          staffid: s2g.staffid,
          groupid: s2g.groupid,
        },
        create: {
          id: s2g.id,
          staffid: s2g.staffid,
          groupid: s2g.groupid,
        },
      });
    }
    console.log('   ✓ Staff-group relationships migrated\n');

    // 5. Migrate Questions
    console.log('5. Migrating questions...');
    const questions = await fetchFromSupabase('questions');
    console.log(`   Found ${questions.length} questions`);

    for (const q of questions) {
      await prisma.question.upsert({
        where: { id: q.id },
        update: {
          title: q.title,
          description: q.description,
        },
        create: {
          id: q.id,
          title: q.title,
          description: q.description,
        },
      });
    }
    console.log('   ✓ Questions migrated\n');

    // 6. Migrate Subjects
    console.log('6. Migrating subjects...');
    const subjects = await fetchFromSupabase('subjects');
    console.log(`   Found ${subjects.length} subjects`);

    for (const sub of subjects) {
      await prisma.subject.upsert({
        where: { id: sub.id },
        update: {
          subjectid: sub.subjectid,
          name: sub.name,
          groupid: sub.groupid,
        },
        create: {
          id: sub.id,
          subjectid: sub.subjectid,
          name: sub.name,
          groupid: sub.groupid,
        },
      });
    }
    console.log('   ✓ Subjects migrated\n');

    // 7. Migrate Evaluations
    console.log('7. Migrating evaluations...');
    const evaluations = await fetchFromSupabase('evaluations');
    console.log(`   Found ${evaluations.length} evaluations`);

    for (const e of evaluations) {
      await prisma.evaluation.upsert({
        where: { id: e.id },
        update: {
          reviewerid: e.reviewerid,
          victimid: e.victimid,
          groupid: e.groupid,
          modifieddate: e.modifieddate ? new Date(e.modifieddate) : null,
          point: e.point,
          questionid: e.questionid,
        },
        create: {
          id: e.id,
          reviewerid: e.reviewerid,
          victimid: e.victimid,
          groupid: e.groupid,
          modifieddate: e.modifieddate ? new Date(e.modifieddate) : null,
          point: e.point,
          questionid: e.questionid,
        },
      });
    }
    console.log('   ✓ Evaluations migrated\n');

    // Reset sequences to max id + 1
    console.log('8. Resetting auto-increment sequences...');
    await prisma.$executeRawUnsafe(`SELECT setval('organizationunits_id_seq', COALESCE((SELECT MAX(id) FROM organizationunits), 0) + 1, false)`);
    await prisma.$executeRawUnsafe(`SELECT setval('staff_id_seq', COALESCE((SELECT MAX(id) FROM staff), 0) + 1, false)`);
    await prisma.$executeRawUnsafe(`SELECT setval('groups_id_seq', COALESCE((SELECT MAX(id) FROM groups), 0) + 1, false)`);
    await prisma.$executeRawUnsafe(`SELECT setval('staff2groups_id_seq', COALESCE((SELECT MAX(id) FROM staff2groups), 0) + 1, false)`);
    await prisma.$executeRawUnsafe(`SELECT setval('questions_id_seq', COALESCE((SELECT MAX(id) FROM questions), 0) + 1, false)`);
    await prisma.$executeRawUnsafe(`SELECT setval('subjects_id_seq', COALESCE((SELECT MAX(id) FROM subjects), 0) + 1, false)`);
    await prisma.$executeRawUnsafe(`SELECT setval('evaluations_id_seq', COALESCE((SELECT MAX(id) FROM evaluations), 0) + 1, false)`);
    console.log('   ✓ Sequences reset\n');

    console.log('========================================');
    console.log('Migration completed successfully!');
    console.log('========================================\n');

    // Print summary
    const counts = await Promise.all([
      prisma.organizationUnit.count(),
      prisma.staff.count(),
      prisma.group.count(),
      prisma.staff2Group.count(),
      prisma.question.count(),
      prisma.subject.count(),
      prisma.evaluation.count(),
    ]);

    console.log('Data Summary:');
    console.log(`  Organization Units: ${counts[0]}`);
    console.log(`  Staff: ${counts[1]}`);
    console.log(`  Groups: ${counts[2]}`);
    console.log(`  Staff-Group Relations: ${counts[3]}`);
    console.log(`  Questions: ${counts[4]}`);
    console.log(`  Subjects: ${counts[5]}`);
    console.log(`  Evaluations: ${counts[6]}`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate().catch(console.error);
