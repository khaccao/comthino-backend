const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  let e = await prisma.payrollEmployee.findFirst();
  if (!e) {
    console.log('No employee, creating...');
    e = await prisma.payrollEmployee.create({ data: { code: 'E01', fullName: 'Test' }});
  }
  
  console.log('Creating attendance...');
  const a = await prisma.attendanceRecord.create({
    data: {
      employeeId: e.id,
      workDate: new Date('2023-01-01T00:00:00Z'),
      clockIn: new Date('2023-01-01T08:00:00Z'),
      clockOut: new Date('2023-01-01T17:00:00Z'),
      breakMinutes: 60,
      hourlyRate: 20000,
      totalHours: 8,
      grossAmount: 160000
    }
  });
  console.log(a);
}

run().catch(console.error).finally(() => prisma.$disconnect());
