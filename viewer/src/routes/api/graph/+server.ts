import { json } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { findRepoRoot } from '$lib/server/repo';

export async function GET() {
	const repoRoot = findRepoRoot();
	const graphPath = join(repoRoot, 'repo-graph.json');

	try {
		const content = await readFile(graphPath, 'utf-8');
		const graph = JSON.parse(content);
		return json(graph);
	} catch {
		return json({ nodes: [], edges: [] });
	}
}
