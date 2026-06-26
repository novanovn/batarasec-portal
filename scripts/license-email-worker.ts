import "dotenv/config";
import { createLicenseEmailWorker } from "@/lib/license-email";
import { runPortalExpirySchedulerWorker } from "@/lib/expiry-scheduler";

const worker = createLicenseEmailWorker();

runPortalExpirySchedulerWorker();

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
