import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof prismaClientSingleton>;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientConnectionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P1001" || error.code === "P1002");
}

async function withConnectionRetry<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientConnectionError(error)) throw error;
    await sleep(350);
    return operation();
  }
}

function prismaClientSingleton() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }).$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          return withConnectionRetry(() => query(args));
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
