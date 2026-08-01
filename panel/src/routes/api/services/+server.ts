import { json } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { findRepoRoot } from '$lib/server/repo';

const REPO_ROOT = findRepoRoot();
const SUPERVISOR_CONF = join(REPO_ROOT, 'supervisor', 'supervisord.conf');
const PROGRAMS_DIR = join(REPO_ROOT, 'supervisor', 'programs');
const execFileAsync = promisify(execFile);

interface ServiceInfo {
	name: string;
	status: 'RUNNING' | 'STOPPED' | 'STARTING' | 'BACKOFF' | 'FATAL' | 'EXITED';
	pid: number | null;
	uptime: string;
	port: number;
	command: string;
	directory: string;
	logFile: string;
	logTail: string[];
}

interface ConfData {
	command: string;
	directory: string;
	port: number;
	logFile: string;
}

function parseConf(content: string, envRepoRoot: string): ConfData {
	const command = content.match(/^command=(.+)$/m)?.[1] || '';
	const directory = content.match(/^directory=(.+)$/m)?.[1] || '';
	const logFile = content.match(/^stdout_logfile=(.+)$/m)?.[1] || '';
	const envMatch = content.match(/^environment=(.+)$/m)?.[1] || '';
	const portMatch = envMatch.match(/PORT="(\d+)"/);
	const port = portMatch ? parseInt(portMatch[1], 10) : 0;

	return {
		command: command.replace(/\%\(ENV_REPO_ROOT\)s/g, envRepoRoot),
		directory: directory.replace(/\%\(ENV_REPO_ROOT\)s/g, envRepoRoot),
		port,
		logFile: logFile.replace(/\%\(ENV_REPO_ROOT\)s/g, envRepoRoot)
	};
}

async function parseCaddyPort(): Promise<number> {
	try {
		const caddyfile = await readFile(join(REPO_ROOT, 'caddy', 'Caddyfile'), 'utf-8');
		const matches = [...caddyfile.matchAll(/^:(\d+)\s*\{/gm)];
		for (const match of matches) {
			if (match[1] === '443') return 443;
		}
		return 443;
	} catch {
		return 443;
	}
}

async function readLogTail(logPath: string, lines: number = 20): Promise<string[]> {
	try {
		const content = await readFile(logPath, 'utf-8');
		const allLines = content.trim().split('\n');
		return allLines.slice(-lines);
	} catch {
		return [];
	}
}

async function getSupervisorStatus(): Promise<Map<string, { status: string; pid: number | null; uptime: string }>> {
	const result = new Map();
	try {
		const { stdout } = await execFileAsync('supervisorctl', ['-c', SUPERVISOR_CONF, 'status']);
		const lines = stdout.trim().split('\n');
		for (const line of lines) {
			const match = line.match(/^(\S+)\s+(\S+)\s*(?:pid\s+(\d+),\s*uptime\s+(.+))?/);
			if (match) {
				result.set(match[1], {
					status: match[2],
					pid: match[3] ? parseInt(match[3], 10) : null,
					uptime: match[4] || '-'
				});
			}
		}
	} catch {
	}
	return result;
}

export async function GET() {
	try {
		const files = await readdir(PROGRAMS_DIR);
		const confFiles = files.filter((f: string) => f.endsWith('.conf'));
		const envRepoRoot = REPO_ROOT;
		const supervisorStatus = await getSupervisorStatus();
		const caddyPort = await parseCaddyPort();

		const services: ServiceInfo[] = [];

		for (const confFile of confFiles) {
			const content = await readFile(join(PROGRAMS_DIR, confFile), 'utf-8');
			const nameMatch = content.match(/^\[program:(\S+)\]/m);
			const name = nameMatch ? nameMatch[1] : confFile.replace('.conf', '');
			const conf = parseConf(content, envRepoRoot);

			const statusInfo = supervisorStatus.get(name) || { status: 'UNKNOWN', pid: null, uptime: '-' };

			let port = conf.port;
			if (name === 'caddy' && port === 0) {
				port = caddyPort;
			}

			const logTail = conf.logFile ? await readLogTail(conf.logFile) : [];

			services.push({
				name,
				status: statusInfo.status as ServiceInfo['status'],
				pid: statusInfo.pid,
				uptime: statusInfo.uptime,
				port,
				command: conf.command,
				directory: conf.directory,
				logFile: conf.logFile,
				logTail
			});
		}

		return json({ services });
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}

export async function POST({ url }: { url: URL }) {
	const action = url.searchParams.get('action');
	const name = url.searchParams.get('label');

	if (!action || !name) {
		return json({ error: 'Missing action or label parameter' }, { status: 400 });
	}

	try {
		switch (action) {
			case 'start':
				await execFileAsync('supervisorctl', ['-c', SUPERVISOR_CONF, 'start', name]);
				return json({ success: true, action: 'start', name });
			case 'stop':
				await execFileAsync('supervisorctl', ['-c', SUPERVISOR_CONF, 'stop', name]);
				return json({ success: true, action: 'stop', name });
			case 'restart':
				await execFileAsync('supervisorctl', ['-c', SUPERVISOR_CONF, 'restart', name]);
				return json({ success: true, action: 'restart', name });
			default:
				return json({ error: `Unknown action: ${action}` }, { status: 400 });
		}
	} catch (e: unknown) {
		const err = e as { stderr?: string; message?: string };
		return json({ error: err.stderr || err.message || String(e) }, { status: 500 });
	}
}
