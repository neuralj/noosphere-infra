import { execFile } from 'child_process';
import { promisify } from 'util';
import type { WorkspaceState } from './types';

const execFileAsync = promisify(execFile);

let resolvedCmd: string[] | null = null;

export async function composeBase(): Promise<string[]> {
	if (resolvedCmd) return resolvedCmd;
	try {
		await execFileAsync('docker', ['compose', 'version'], { timeout: 5000 });
		resolvedCmd = ['docker', 'compose'];
	} catch {
		resolvedCmd = ['docker-compose'];
	}
	return resolvedCmd;
}

function errText(e: unknown): string {
	const err = e as { stderr?: string; message?: string };
	const s = (err.stderr ?? err.message ?? String(e)).trim();
	return s.split('\n').slice(0, 5).join('\n');
}

export async function runCompose(args: string[], timeoutMs = 30_000): Promise<string> {
	const base = await composeBase();
	try {
		const { stdout } = await execFileAsync(base[0], [...base.slice(1), ...args], {
			timeout: timeoutMs,
			maxBuffer: 16 * 1024 * 1024
		});
		return stdout.trim();
	} catch (e) {
		throw new Error(errText(e));
	}
}

export interface PsEntry {
	Service?: string;
	Name?: string;
	State?: string;
	Status?: string;
	StartedAt?: string;
}

export function parsePsJson(text: string): PsEntry[] {
	const trimmed = text.trim();
	if (!trimmed) return [];
	try {
		const parsed = JSON.parse(trimmed);
		if (Array.isArray(parsed)) return parsed as PsEntry[];
		if (parsed && typeof parsed === 'object') return [parsed as PsEntry];
	} catch {
		/* fall through */
	}
	return [];
}

export function parsePsGoTemplate(text: string): PsEntry[] {
	return text
		.trim()
		.split('\n')
		.filter(Boolean)
		.map(line => {
			const [Name, Service, State] = line.split('\t');
			return { Name, Service, State };
		});
}

export function deriveStateFromPs(entries: PsEntry[]): WorkspaceState {
	if (!entries.length) return 'stopped';
	const running = entries.some(
		e => e.State === 'running' || (e.State == null && /^Up\b/.test(e.Status ?? ''))
	);
	return running ? 'running' : 'stopped';
}

export async function psEntries(project: string, composeFile: string): Promise<PsEntry[]> {
	try {
		return parsePsJson(await runCompose(['-p', project, '-f', composeFile, 'ps', '--format', 'json']));
	} catch {
		/* fall through to template format */
	}
	try {
		return parsePsGoTemplate(
			await runCompose([
				'-p',
				project,
				'-f',
				composeFile,
				'ps',
				'--format',
				'{{.Name}}\t{{.Service}}\t{{.State}}'
			])
		);
	} catch {
		return [];
	}
}
