import "dotenv/config";
import { createLicenseEmailWorker } from "@/lib/license-email";

const worker = createLicenseEmailWorker();

worker.on("completed", (job) => {
  console.log(`license-email job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`license-email job failed: ${job?.id ?? "unknown"}: ${error.message}`);
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
