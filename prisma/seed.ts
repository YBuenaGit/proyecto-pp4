import { Prisma, PrismaClient } from "@prisma/client";
import { syncCatalogSelectors } from "./catalog-selector-sync";

const prisma = new PrismaClient();

async function main() {
  const summary = await prisma.$transaction(
    (transaction) => syncCatalogSelectors(transaction),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 60_000,
    },
  );

  console.log("Selectores sincronizados de forma segura:", summary);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
