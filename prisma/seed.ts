import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin';
const BCRYPT_ROUNDS = 10;

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (existing) {
      console.log(`[seed] Admin user "${ADMIN_EMAIL}" already exists — skipping.`);
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        name: 'Admin',
        role: 'ADMIN',
      },
    });

    console.log(`[seed] Created default admin user "${ADMIN_EMAIL}".`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] Failed to seed admin user:', error);
  process.exit(1);
});
