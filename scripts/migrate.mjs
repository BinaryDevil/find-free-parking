import { executeMigration, migrationTarget } from './migration-command.mjs';

let targetChecked = false;
try {
  if (process.argv.length !== 3) throw new Error('One guarded migration command is required; down/reset are not provided.');
  const command = process.argv[2];
  migrationTarget(command, process.env);
  targetChecked = true;
  console.log(await executeMigration(command));
} catch (error) {
  // Configuration validation uses fixed messages. Once preparation starts,
  // filesystem/driver errors may contain private reference or connection data.
  console.error(!targetChecked && error instanceof Error ? error.message : 'Migration failed. Inspect the target privately; do not replay historical SQL.');
  process.exitCode = 1;
}
