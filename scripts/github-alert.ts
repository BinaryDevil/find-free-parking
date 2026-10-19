type Github = (args: string[], input?: string) => Promise<string>;
const repository = 'BinaryDevil/find-free-parking';

/** Only pass reviewed, non-sensitive text. Never pass caught errors or payloads. */
export async function reportFailure(github: Github, marker: string, title: string, body: string) {
  const pages: { number: number; body?: string; pull_request?: unknown }[][] = JSON.parse(await github([
    'api', `repos/${repository}/issues?state=open&per_page=100`, '--paginate', '--slurp',
  ]));
  const existing = pages.flat().find(issue => !issue.pull_request && issue.body?.includes(marker));
  const content = `${marker}\n\n${body}`;
  await github(['api', `repos/${repository}/issues${existing ? `/${existing.number}` : ''}`, '--method', existing ? 'PATCH' : 'POST', '--input', '-'],
    JSON.stringify(existing ? { body: content } : { title, body: content, labels: ['needs-triage'] }));
}
