import { json } from '@sveltejs/kit';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);
const REPO_ROOT = resolve(__dirname, '../../../../../');

export async function GET({ url }) {
	const action = url.searchParams.get('action') || 'log';

	try {
		if (action === 'log') {
			const limit = url.searchParams.get('limit') || '20';
			const { stdout } = await execFileAsync('git', ['log', `--max-count=${limit}`, '--format=%H|%h|%s|%an|%ai|%P'], {
				cwd: REPO_ROOT
			});
			const commits = stdout
				.trim()
				.split('\n')
				.filter(Boolean)
				.map((line: string) => {
					const [hash, short, subject, author, date, ...parents] = line.split('|');
					return { hash, short, subject, author, date, parents: parents.join('|') };
				});
			return json({ commits });
		}

		if (action === 'diff') {
			const hash = url.searchParams.get('hash') || 'HEAD';
			const { stdout } = await execFileAsync('git', ['diff-tree', '--no-commit-id', '-r', '--name-status', hash], {
				cwd: REPO_ROOT
			});
			const files = stdout
				.trim()
				.split('\n')
				.filter(Boolean)
				.map((line: string) => {
					const [status, ...pathParts] = line.split('\t');
					return { status, path: pathParts.join('\t') };
				});
			return json({ files });
		}

		if (action === 'stats') {
			const { stdout: branchOut } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: REPO_ROOT });
			const { stdout: countOut } = await execFileAsync('git', ['rev-list', '--count', 'HEAD'], { cwd: REPO_ROOT });
			const { stdout: lastOut } = await execFileAsync('git', ['log', '-1', '--format=%ai'], { cwd: REPO_ROOT });
			return json({
				branch: branchOut.trim(),
				commitCount: countOut.trim(),
				lastCommit: lastOut.trim()
			});
		}

		return json({ error: 'Unknown action' }, { status: 400 });
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}
