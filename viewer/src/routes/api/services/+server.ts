import { json } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { findRepoRoot } from '$lib/server/repo';

const REPO_ROOT = findRepoRoot();
const execFileAsync = promisify(execFile);

interface ServiceInfo {
	name: string;
	status: 'running' | 'stopped';
	port: number;
	pid: number | null;
	logTail: string[];
}

function parsePlist(content: string): Record<string, string> {
	const result: Record<string, string> = {};

	const labelMatch = content.match(/<key>Label<\/key>\s*<string>([^<]+)<\/string>/);
	if (labelMatch) result.label = labelMatch[1];

	const portMatch = content.match(/<key>PORT<\/key>\s*<string>(\d+)<\/string>/);
	if (portMatch) result.port = portMatch[1];

	const logMatch = content.match(/<key>StandardOutPath<\/key>\s*<string>([^<]+)<\/string>/);
	if (logMatch) result.logPath = logMatch[1];

	const binaryMatch = content.match(/<key>ProgramArguments<\/key>\s*<array>\s*<string>([^<]+)<\/string>/);
	if (binaryMatch) result.binary = binaryMatch[1];

	return result;
}

async function readLogTail(logPath: string, lines: number = 30): Promise<string[]> {
	try {
		const content = await readFile(logPath, 'utf-8');
		const allLines = content.trim().split('\n');
		return allLines.slice(-lines);
	} catch {
		return [];
	}
}

export async function GET() {
	try {
		const scriptsDir = join(REPO_ROOT, 'scripts');
		const files = await readdir(scriptsDir);
		const plistFiles = files.filter((f: string) => f.startsWith('com.neuralj.') && f.endsWith('.plist'));

		const { stdout: launchctlOutput } = await execFileAsync('launchctl', ['list']);
		const launchctlLines = launchctlOutput.trim().split('\n');

		const services: ServiceInfo[] = [];

		for (const plistFile of plistFiles) {
			const content = await readFile(join(scriptsDir, plistFile), 'utf-8');
			const parsed = parsePlist(content);

			const label = parsed.label || plistFile.replace('.plist', '');
			const name = label.replace('com.neuralj.', '');
			const port = parseInt(parsed.port || '0', 10);
			const logPath = parsed.logPath || '';
			const binary = parsed.binary || '';

			const launchctlLine = launchctlLines.find((line: string) => line.includes(label));
			let status: 'running' | 'stopped' = 'stopped';
			let pid: number | null = null;
			let lastExitStatus: number | null = null;

			if (launchctlLine) {
				const parts = launchctlLine.split(/\s+/);
				if (parts.length >= 3) {
					const pidStr = parts[0];
					const exitStr = parts[1];

					if (pidStr !== '-') {
						pid = parseInt(pidStr, 10);
						status = 'running';
					}

					if (exitStr !== '-') {
						lastExitStatus = parseInt(exitStr, 10);
					}
				}
			}

			const logTail = logPath ? await readLogTail(logPath) : [];

			services.push({
				name,
				status,
				port,
				pid,
				logTail
			});
		}

		return json({ services });
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}
