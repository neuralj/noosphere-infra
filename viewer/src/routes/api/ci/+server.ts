import { json } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { findRepoRoot } from '$lib/server/repo';

const REPO_ROOT = findRepoRoot();
const GITHUB_API = 'https://api.github.com';
const OWNER = 'neuralj';
const REPO = 'openlaputa';

const execFileAsync = promisify(execFile);

interface WorkflowRun {
	id: number;
	name: string;
	head_branch: string;
	status: string;
	conclusion: string | null;
	created_at: string;
	updated_at: string;
	html_url: string;
	run_number: number;
	event: string;
}

interface Job {
	id: number;
	name: string;
	status: string;
	conclusion: string | null;
	started_at: string;
	completed_at: string | null;
	html_url: string;
}

export async function GET({ url }) {
	const action = url.searchParams.get('action') || 'overview';

	try {
		switch (action) {
			case 'overview':
				return json(await getOverview());
			case 'runs':
				return json(await getWorkflowRuns());
			case 'jobs':
				const runId = url.searchParams.get('run_id');
				if (!runId) return json({ error: 'run_id required' }, { status: 400 });
				return json(await getJobs(runId));
			case 'images':
				return json(await getImages());
			default:
				return json({ error: 'unknown action' }, { status: 400 });
		}
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}

export async function POST({ url }) {
	const action = url.searchParams.get('action');

	try {
		switch (action) {
			case 'trigger':
				return json(await triggerBuild());
			default:
				return json({ error: 'unknown action' }, { status: 400 });
		}
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}

async function triggerBuild() {
	const { stdout: token } = await execFileAsync('gh', ['auth', 'token']);
	const cleanToken = token.trim();

	const response = await fetch(
		`${GITHUB_API}/repos/${OWNER}/${REPO}/actions/workflows/build.yml/dispatches`,
		{
			method: 'POST',
			headers: {
				'Accept': 'application/vnd.github.v3+json',
				'Authorization': `Bearer ${cleanToken}`,
				'User-Agent': 'openlaputa-viewer',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ ref: 'main' })
		}
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
	}

	return { success: true, message: 'Build triggered successfully' };
}

async function getOverview() {
	const [runs, images] = await Promise.all([
		getWorkflowRuns(10),
		getImages()
	]);

	const recentRuns = runs.slice(0, 5);
	const successCount = runs.filter(r => r.conclusion === 'success').length;
	const failCount = runs.filter(r => r.conclusion === 'failure').length;

	return {
		workflow: {
			name: 'Build images',
			file: 'build.yml',
			url: `https://github.com/${OWNER}/${REPO}/actions/workflows/build.yml`
		},
		images,
		recentRuns,
		stats: {
			total: runs.length,
			success: successCount,
			failure: failCount,
			successRate: runs.length > 0 ? Math.round((successCount / runs.length) * 100) : 0
		}
	};
}

async function getWorkflowRuns(limit = 30): Promise<WorkflowRun[]> {
	const response = await fetch(
		`${GITHUB_API}/repos/${OWNER}/${REPO}/actions/runs?per_page=${limit}`,
		{
			headers: {
				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': 'openlaputa-viewer'
			}
		}
	);

	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status}`);
	}

	const data = await response.json();
	return data.workflow_runs.map((run: any) => ({
		id: run.id,
		name: run.name,
		head_branch: run.head_branch,
		status: run.status,
		conclusion: run.conclusion,
		created_at: run.created_at,
		updated_at: run.updated_at,
		html_url: run.html_url,
		run_number: run.run_number,
		event: run.event
	}));
}

async function getJobs(runId: string): Promise<Job[]> {
	const response = await fetch(
		`${GITHUB_API}/repos/${OWNER}/${REPO}/actions/runs/${runId}/jobs`,
		{
			headers: {
				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': 'openlaputa-viewer'
			}
		}
	);

	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status}`);
	}

	const data = await response.json();
	return data.jobs.map((job: any) => ({
		id: job.id,
		name: job.name,
		status: job.status,
		conclusion: job.conclusion,
		started_at: job.started_at,
		completed_at: job.completed_at,
		html_url: job.html_url
	}));
}

async function getImages(): Promise<string[]> {
	const imagesDir = join(REPO_ROOT, 'images');
	const entries = await readdir(imagesDir, { withFileTypes: true });
	return entries
		.filter(e => e.isDirectory())
		.map(e => e.name)
		.sort();
}
