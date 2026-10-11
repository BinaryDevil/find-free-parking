import { getDbPool } from "./seed_utils";
import { checkCoverageRequests, runGithub } from "./coverage_requests";

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--dry-run")) {
    throw new Error("Usage: pnpm check-requests [--dry-run]");
  }
  const pool = getDbPool();
  try {
    await checkCoverageRequests({
      query: (sql, values) => pool.query(sql, values),
      github: runGithub,
      log: console.log,
    }, args.includes("--dry-run"));
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  console.error("Coverage request check failed. Check database and GitHub CLI configuration.");
  process.exitCode = 1;
});
