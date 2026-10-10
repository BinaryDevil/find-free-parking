import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ESLint } from 'eslint';
import ts from 'typescript';

const kind = process.argv[2];
if (!['lint', 'typecheck'].includes(kind)) {
  throw new Error('Usage: node scripts/check-diagnostics.mjs lint|typecheck [--record]');
}
const root = process.cwd();
const normalize = (text) => text.replaceAll('\\', '/').replaceAll(root.replaceAll('\\', '/'), '.');
const entry = (file, code, message, source) => ({
  file: normalize(path.relative(root, file)), code, message: normalize(message), source: source.replaceAll('\r\n', '\n').trim(),
});
let diagnostics;
if (kind === 'lint') {
  const results = await new ESLint().lintFiles(['.']);
  diagnostics = (await Promise.all(results.map(async (result) => {
    const lines = (await readFile(result.filePath, 'utf8')).split(/\r?\n/);
    return result.messages.map((message) => {
      if (message.fatal) throw new Error(`${result.filePath}: ${message.message}`);
      return entry(result.filePath, `${message.severity}:${message.ruleId ?? 'eslint-directive'}`, message.message,
        lines.slice(message.line - 1, message.endLine ?? message.line).join('\n'));
    });
  }))).flat();
} else {
  const configFile = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
  if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
  const program = ts.createProgram(config.fileNames, { ...config.options, noEmit: true, incremental: false });
  diagnostics = [...config.errors, ...ts.getPreEmitDiagnostics(program)].map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    if (!diagnostic.file || diagnostic.start === undefined) throw new Error(message);
    const source = diagnostic.file.text.slice(diagnostic.start, diagnostic.start + (diagnostic.length ?? 0));
    return entry(diagnostic.file.fileName, `TS${diagnostic.code}`, message, source);
  });
}

const baselinePath = `config/diagnostics-${kind}.json`;
const signatures = diagnostics.map((diagnostic) => JSON.stringify(diagnostic)).sort();
if (process.argv[3] === '--record') {
  await writeFile(baselinePath, `${JSON.stringify(signatures.map((signature) => JSON.parse(signature)), null, 2)}\n`);
  console.log(`Recorded ${signatures.length} ${kind} diagnostics. Review every baseline change.`);
} else {
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  const remaining = baseline.map((diagnostic) => JSON.stringify(diagnostic));
  const unexpected = signatures.filter((signature) => {
    const index = remaining.indexOf(signature);
    if (index === -1) return true;
    remaining.splice(index, 1);
    return false;
  });
  for (const signature of unexpected) console.error(`New ${kind} diagnostic: ${signature}`);
  if (unexpected.length) process.exitCode = 1;
  console.log(`${signatures.length - unexpected.length} recorded ${kind} diagnostics; ${unexpected.length} new; ${remaining.length} resolved baseline entries.`);
}
