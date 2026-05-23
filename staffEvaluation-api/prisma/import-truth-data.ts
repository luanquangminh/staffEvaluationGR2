import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const DATA_DIR = path.join(__dirname, '../../truthdata');

function parseCsv(file: string): Record<string, string>[] {
  const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields with commas inside
    const values: string[] = [];
    let cur = '', inQuote = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    if (values.length < 2) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx]?.replace(/^"|"$/g, '') ?? ''; });
    rows.push(row);
  }
  return rows;
}

async function main() {
  console.log('\n=== Importing truth data ===\n');

  // 1. Organization Units
  console.log('1. Organization units...');
  const orgRows = parseCsv('Data(Nhóm hành chính).csv');
  await prisma.$executeRawUnsafe(`
    INSERT INTO organizationunits (id, name)
    VALUES ${orgRows.map(r => `(${r['Id']}, '${r['Name'].replace(/'/g, "''")}')` ).join(',')}
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
  `);
  // Reset sequence to max(id)+1
  await prisma.$executeRawUnsafe(`SELECT setval('organizationunits_id_seq', GREATEST((SELECT MAX(id) FROM organizationunits), 0) + 1, false)`);
  console.log(`   ✓ ${orgRows.length} org units`);

  // 2. Staff (preserve avatar)
  console.log('2. Staff...');
  const staffRows = parseCsv('Data(Cán bộ).csv');
  let staffCount = 0;
  for (const r of staffRows) {
    const id = parseInt(r['Id']);
    const name = r['Name'].replace(/'/g, "''");
    const homeEmail = r['EmailH'] || null;
    const schoolEmail = r['EmailS'] || null;
    const staffcode = r['StaffCode'] || null;
    const mobile = r['Mobile'] || null;
    const academicdegree = r['AcademicDegree'] || null;
    const orgId = r['OrganizationUnitId'] !== '' && r['OrganizationUnitId'] !== undefined
      ? parseInt(r['OrganizationUnitId'])
      : null;

    // Check if org unit exists; if not, null it out
    let safeOrgId: number | null = orgId;
    if (orgId !== null) {
      const exists = await prisma.organizationUnit.findUnique({ where: { id: orgId } });
      if (!exists) safeOrgId = null;
    }

    const homeEmailVal = homeEmail ? `'${homeEmail.replace(/'/g, "''")}'` : 'NULL';
    const schoolEmailVal = schoolEmail ? `'${schoolEmail.replace(/'/g, "''")}'` : 'NULL';
    const staffcodeVal = staffcode ? `'${staffcode.replace(/'/g, "''")}'` : 'NULL';
    const mobileVal = mobile ? `'${mobile.replace(/'/g, "''")}'` : 'NULL';
    const academicdegreeVal = academicdegree ? `'${academicdegree.replace(/'/g, "''")}'` : 'NULL';
    const orgIdVal = safeOrgId !== null ? safeOrgId : 'NULL';

    await prisma.$executeRawUnsafe(`
      INSERT INTO staff (id, name, "homeEmail", "schoolEmail", staffcode, mobile, academicdegree, organizationunitid, "isPartyMember")
      VALUES (${id}, '${name}', ${homeEmailVal}, ${schoolEmailVal}, ${staffcodeVal}, ${mobileVal}, ${academicdegreeVal}, ${orgIdVal}, false)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        "homeEmail" = EXCLUDED."homeEmail",
        "schoolEmail" = EXCLUDED."schoolEmail",
        staffcode = EXCLUDED.staffcode,
        mobile = EXCLUDED.mobile,
        academicdegree = EXCLUDED.academicdegree,
        organizationunitid = EXCLUDED.organizationunitid
        -- avatar is intentionally NOT updated to preserve existing images
    `);
    staffCount++;
  }
  await prisma.$executeRawUnsafe(`SELECT setval('staff_id_seq', (SELECT MAX(id) FROM staff) + 1, false)`);
  console.log(`   ✓ ${staffCount} staff members`);

  // 3. Groups (from Data(Nhóm).csv — teaching/peer-review groups)
  console.log('3. Groups...');
  const groupRows = parseCsv('Data(Nhóm).csv');
  for (const r of groupRows) {
    const id = parseInt(r['Id']);
    const name = r['Name'].replace(/'/g, "''");
    await prisma.$executeRawUnsafe(`
      INSERT INTO groups (id, name)
      VALUES (${id}, '${name}')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `);
  }
  await prisma.$executeRawUnsafe(`SELECT setval('groups_id_seq', (SELECT MAX(id) FROM groups) + 1, false)`);
  console.log(`   ✓ ${groupRows.length} groups`);

  // 4. Questions
  console.log('4. Questions...');
  const qRows = parseCsv('Data(Các câu hỏi).csv');
  for (const r of qRows) {
    const id = parseInt(r['Id']);
    const title = r['Title'].replace(/'/g, "''").trim();
    await prisma.$executeRawUnsafe(`
      INSERT INTO questions (id, title, "isActive")
      VALUES (${id}, '${title}', true)
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
    `);
  }
  await prisma.$executeRawUnsafe(`SELECT setval('questions_id_seq', (SELECT MAX(id) FROM questions) + 1, false)`);
  console.log(`   ✓ ${qRows.length} questions`);

  // 5. Subjects (Data(Môn học).csv)
  console.log('5. Subjects...');
  const subjectRows = parseCsv('Data(Môn học).csv');
  let subjectCount = 0;
  for (const r of subjectRows) {
    const id = parseInt(r['Id']);
    const subjectid = r['SubjectId']?.replace(/'/g, "''") || null;
    const name = r['Name']?.replace(/'/g, "''") || '';
    // Column header is "GroupId trong sheet Nhóm"
    const groupIdKey = Object.keys(r).find(k => k.startsWith('GroupId')) ?? '';
    const groupId = r[groupIdKey] ? parseInt(r[groupIdKey]) : null;

    if (!name) continue;
    const subjectidVal = subjectid ? `'${subjectid}'` : 'NULL';
    const groupIdVal = groupId !== null && !isNaN(groupId) ? groupId : 'NULL';

    await prisma.$executeRawUnsafe(`
      INSERT INTO subjects (id, subjectid, name, groupid)
      VALUES (${id}, ${subjectidVal}, '${name}', ${groupIdVal})
      ON CONFLICT (id) DO UPDATE SET
        subjectid = EXCLUDED.subjectid,
        name = EXCLUDED.name,
        groupid = EXCLUDED.groupid
    `);
    subjectCount++;
  }
  await prisma.$executeRawUnsafe(`SELECT setval('subjects_id_seq', (SELECT MAX(id) FROM subjects) + 1, false)`);
  console.log(`   ✓ ${subjectCount} subjects`);

  console.log('\n=== Import complete ===\n');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
