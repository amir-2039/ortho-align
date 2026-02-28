import { PrismaClient, UserRole, EmployeeType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@orthoalign.com' },
    update: {},
    create: {
      email: 'admin@orthoalign.com',
      passwordHash,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  });
  console.log('✓ Created admin user');

  const client1 = await prisma.user.upsert({
    where: { email: 'client1@example.com' },
    update: {},
    create: {
      email: 'client1@example.com',
      passwordHash,
      name: 'Dr. Sarah Johnson',
      role: UserRole.CLIENT,
    },
  });
  console.log('✓ Created client user 1');

  const client2 = await prisma.user.upsert({
    where: { email: 'client2@example.com' },
    update: {},
    create: {
      email: 'client2@example.com',
      passwordHash,
      name: 'Dr. Michael Brown',
      role: UserRole.CLIENT,
    },
  });
  console.log('✓ Created client user 2');

  const designer1 = await prisma.user.upsert({
    where: { email: 'designer1@orthoalign.com' },
    update: {},
    create: {
      email: 'designer1@orthoalign.com',
      passwordHash,
      name: 'Alex Designer',
      role: UserRole.EMPLOYEE,
      employeeType: EmployeeType.DESIGNER,
    },
  });
  console.log('✓ Created designer user 1');

  const designer2 = await prisma.user.upsert({
    where: { email: 'designer2@orthoalign.com' },
    update: {},
    create: {
      email: 'designer2@orthoalign.com',
      passwordHash,
      name: 'Jordan Designer',
      role: UserRole.EMPLOYEE,
      employeeType: EmployeeType.DESIGNER,
    },
  });
  console.log('✓ Created designer user 2');

  const qc1 = await prisma.user.upsert({
    where: { email: 'qc1@orthoalign.com' },
    update: {},
    create: {
      email: 'qc1@orthoalign.com',
      passwordHash,
      name: 'Sam QC Specialist',
      role: UserRole.EMPLOYEE,
      employeeType: EmployeeType.QC,
    },
  });
  console.log('✓ Created QC user 1');

  const bothEmployee = await prisma.user.upsert({
    where: { email: 'both@orthoalign.com' },
    update: {},
    create: {
      email: 'both@orthoalign.com',
      passwordHash,
      name: 'Casey Multi-role',
      role: UserRole.EMPLOYEE,
      employeeType: EmployeeType.BOTH,
    },
  });
  console.log('✓ Created employee with both roles');

  const patient1 = await prisma.patient.create({
    data: {
      name: 'John Smith',
      dateOfBirth: new Date('1985-03-15'),
      notes: 'Regular patient, upper arch alignment needed',
      createdById: client1.id,
    },
  });
  console.log('✓ Created patient 1');

  const patient2 = await prisma.patient.create({
    data: {
      name: 'Emma Davis',
      dateOfBirth: new Date('1992-07-22'),
      notes: 'First time patient',
      createdById: client1.id,
    },
  });
  console.log('✓ Created patient 2');

  const patient3 = await prisma.patient.create({
    data: {
      name: 'Robert Wilson',
      dateOfBirth: new Date('1978-11-08'),
      notes: 'Follow-up case',
      createdById: client2.id,
    },
  });
  console.log('✓ Created patient 3');

  console.log('\n📊 Seed completed successfully!');
  console.log('\n🔑 Test Credentials (password: password123):');
  console.log('   Admin:     admin@orthoalign.com');
  console.log('   Client 1:  client1@example.com (Dr. Sarah Johnson)');
  console.log('   Client 2:  client2@example.com (Dr. Michael Brown)');
  console.log('   Designer 1: designer1@orthoalign.com');
  console.log('   Designer 2: designer2@orthoalign.com');
  console.log('   QC 1:      qc1@orthoalign.com');
  console.log('   Both:      both@orthoalign.com');
  console.log('\n👥 Sample Patients:');
  console.log(`   ${patient1.name} (ID: ${patient1.id})`);
  console.log(`   ${patient2.name} (ID: ${patient2.id})`);
  console.log(`   ${patient3.name} (ID: ${patient3.id})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
