import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/prisma/client.js";

let client: PrismaClient | null = null;

async function getPrismaClient() {
  let dbUrl = Bun.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL environment variable is not set");
  if (!client) {
    const connectionString = `${dbUrl}`;
    const adapter = new PrismaPg({ connectionString });
    client = new PrismaClient({ adapter });
  }
  return client;
}

export { getPrismaClient };
