import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  const email = "admin@tallys.co.ke";
  const password = "Tallys2024!";
  const hash = await bcrypt.hash(password, 10);

  await db
    .insert(usersTable)
    .values({ email, passwordHash: hash, role: "admin", customerId: null })
    .onConflictDoUpdate({ target: usersTable.email, set: { passwordHash: hash, role: "admin" } });

  console.log(`Admin seeded: ${email} / ${password}`);
  process.exit(0);
}

seedAdmin().catch((e) => {
  console.error(e);
  process.exit(1);
});
