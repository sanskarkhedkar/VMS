const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vms.com' },
    update: {},
    create: {
      email: 'admin@vms.com',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      department: 'IT',
      designation: 'System Administrator',
      employeeId: 'EMP001',
      approvedAt: new Date()
    }
  });
  console.log('✅ Admin user created:', admin.email);

  // Create Host Employee
  const hostPassword = await bcrypt.hash('Host@123', 12);
  const host = await prisma.user.upsert({
    where: { email: 'host@vms.com' },
    update: {},
    create: {
      email: 'host@vms.com',
      password: hostPassword,
      firstName: 'John',
      lastName: 'Smith',
      role: 'HOST_EMPLOYEE',
      status: 'ACTIVE',
      department: 'Engineering',
      designation: 'Senior Engineer',
      employeeId: 'EMP002',
      phone: '+1234567890',
      approvedBy: admin.id,
      approvedAt: new Date()
    }
  });
  console.log('✅ Host Employee created:', host.email);

  // Create Process Admin
  const processAdminPassword = await bcrypt.hash('Process@123', 12);
  const processAdmin = await prisma.user.upsert({
    where: { email: 'process@vms.com' },
    update: {},
    create: {
      email: 'process@vms.com',
      password: processAdminPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'PROCESS_ADMIN',
      status: 'ACTIVE',
      department: 'Administration',
      designation: 'Process Administrator',
      employeeId: 'EMP003',
      phone: '+1234567891',
      approvedBy: admin.id,
      approvedAt: new Date()
    }
  });
  console.log('✅ Process Admin created:', processAdmin.email);

  // Create Security Guard
  const guardPassword = await bcrypt.hash('Guard@123', 12);
  const guard = await prisma.user.upsert({
    where: { email: 'guard@vms.com' },
    update: {},
    create: {
      email: 'guard@vms.com',
      password: guardPassword,
      firstName: 'Mike',
      lastName: 'Wilson',
      role: 'SECURITY_GUARD',
      status: 'ACTIVE',
      department: 'Security',
      designation: 'Security Officer',
      employeeId: 'EMP004',
      phone: '+1234567892',
      approvedBy: admin.id,
      approvedAt: new Date()
    }
  });
  console.log('✅ Security Guard created:', guard.email);

  // Create Security Manager
  const managerPassword = await bcrypt.hash('Manager@123', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'security.manager@vms.com' },
    update: {},
    create: {
      email: 'security.manager@vms.com',
      password: managerPassword,
      firstName: 'David',
      lastName: 'Brown',
      role: 'SECURITY_MANAGER',
      status: 'ACTIVE',
      department: 'Security',
      designation: 'Security Manager',
      employeeId: 'EMP005',
      phone: '+1234567893',
      approvedBy: admin.id,
      approvedAt: new Date()
    }
  });
  console.log('✅ Security Manager created:', manager.email);

  // Create sample visitors
  const visitors = await Promise.all([
    prisma.visitor.upsert({
      where: { id: 'visitor-1' },
      update: {},
      create: {
        id: 'visitor-1',
        email: 'visitor1@example.com',
        firstName: 'Alice',
        lastName: 'Cooper',
        phone: '+1987654321',
        company: 'Tech Corp',
        designation: 'CEO'
      }
    }),
    prisma.visitor.upsert({
      where: { id: 'visitor-2' },
      update: {},
      create: {
        id: 'visitor-2',
        email: 'visitor2@example.com',
        firstName: 'Bob',
        lastName: 'Martin',
        phone: '+1987654322',
        company: 'Design Inc',
        designation: 'Designer'
      }
    }),
    prisma.visitor.upsert({
      where: { id: 'visitor-3' },
      update: {},
      create: {
        id: 'visitor-3',
        email: 'visitor3@example.com',
        firstName: 'Carol',
        lastName: 'White',
        phone: '+1987654323',
        company: 'Consulting Ltd',
        designation: 'Consultant'
      }
    })
  ]);
  console.log('✅ Sample visitors created:', visitors.length);

  // Create sample visits
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const visits = await Promise.all([
    prisma.visit.create({
      data: {
        visitorId: visitors[0].id,
        hostEmployeeId: host.id,
        purpose: 'MEETING',
        purposeDetails: 'Quarterly review meeting',
        scheduledDate: today,
        scheduledTimeIn: new Date(today.setHours(10, 0, 0)),
        scheduledTimeOut: new Date(today.setHours(12, 0, 0)),
        status: 'APPROVED',
        passNumber: 'VMS-SEED-001',
        approvedById: processAdmin.id,
        approvedAt: new Date()
      }
    }),
    prisma.visit.create({
      data: {
        visitorId: visitors[1].id,
        hostEmployeeId: host.id,
        purpose: 'INTERVIEW',
        purposeDetails: 'Technical interview for senior position',
        scheduledDate: tomorrow,
        scheduledTimeIn: new Date(tomorrow.setHours(14, 0, 0)),
        scheduledTimeOut: new Date(tomorrow.setHours(16, 0, 0)),
        status: 'PENDING_APPROVAL'
      }
    })
  ]);
  console.log('✅ Sample visits created:', visits.length);

  // Create system settings
  const settings = [
    { key: 'company_name', value: 'VMS Corporation', description: 'Company name displayed in the system' },
    { key: 'default_visit_duration', value: '60', description: 'Default visit duration in minutes' },
    { key: 'max_extension_count', value: '3', description: 'Maximum number of visit extensions allowed' },
    { key: 'extension_duration', value: '15', description: 'Default extension duration in minutes' },
    { key: 'require_id_proof', value: 'false', description: 'Whether ID proof is mandatory' },
    { key: 'auto_checkout_enabled', value: 'true', description: 'Enable auto checkout at end of day' },
    { key: 'auto_checkout_time', value: '18:00', description: 'Auto checkout time' }
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting
    });
  }
  console.log('✅ System settings created:', settings.length);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:           admin@vms.com / Admin@123');
  console.log('Host Employee:   host@vms.com / Host@123');
  console.log('Process Admin:   process@vms.com / Process@123');
  console.log('Security Guard:  guard@vms.com / Guard@123');
  console.log('Security Manager: security.manager@vms.com / Manager@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
