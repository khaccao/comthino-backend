const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function updateAdminPassword() {
  const newPassword = 'Cao@Admin123!';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updatedAdmin = await prisma.user.update({
    where: { email: 'admin@comthino.vn' },
    data: { passwordHash: hashedPassword }
  });

  console.log('Admin password updated to:', newPassword);
}

updateAdminPassword()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
