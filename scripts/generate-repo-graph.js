#!/usr/bin/env node

import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, dirname } from 'path';

const REPO_ROOT = dirname(dirname(new URL(import.meta.url).pathname));
const OUTPUT_FILE = join(REPO_ROOT, 'repo-graph.json');

const IGNORE_DIRS = new Set(['node_modules', '.git', '.svelte-kit', 'build', 'dist', '.next']);

const nodes = new Map();
const edges = [];

function getRelativePath(absPath) {
	return relative(REPO_ROOT, absPath);
}

function addNode(filePath, type, label, summary) {
	const id = filePath;
	if (!nodes.has(id)) {
		nodes.set(id, { id, type, label: label || id.split('/').pop(), summary: summary || '' });
	}
}

function addEdge(source, target, relation) {
	edges.push({ source, target, relation });
}

async function walk(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (IGNORE_DIRS.has(entry.name)) continue;
		const fullPath = join(dir, entry.name);
		const relPath = getRelativePath(fullPath);

		if (entry.isDirectory()) {
			await walk(fullPath);
		} else if (entry.isFile()) {
			await analyzeFile(fullPath, relPath);
		}
	}
}

async function analyzeFile(fullPath, relPath) {
	const ext = relPath.split('.').pop()?.toLowerCase();
	const fileName = relPath.split('/').pop();

	if (ext === 'ts' || ext === 'js' || ext === 'svelte') {
		await analyzeJsFile(fullPath, relPath);
	} else if (fileName === 'Dockerfile' || fileName.endsWith('.dockerfile')) {
		await analyzeDockerfile(fullPath, relPath);
	} else if (fileName === 'Caddyfile' || fileName.endsWith('.conf')) {
		await analyzeCaddyfile(fullPath, relPath);
	} else if (fileName === 'docker-compose.yml' || fileName === 'docker-compose.yaml') {
		await analyzeComposeFile(fullPath, relPath);
	} else if (fileName === 'package.json') {
		await analyzePackageJson(fullPath, relPath);
	}
}

async function analyzeJsFile(fullPath, relPath) {
	try {
		const content = await readFile(fullPath, 'utf-8');
		const ext = relPath.split('.').pop();
		const type = ext === 'svelte' ? 'component' : 'module';
		const label = relPath.split('/').pop();

		addNode(relPath, type, label, '');

		const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
		let match;
		while ((match = importRegex.exec(content)) !== null) {
			const importPath = match[1];
			if (importPath.startsWith('.') || importPath.startsWith('/')) {
				const resolvedPath = resolveImport(relPath, importPath);
				if (resolvedPath && nodes.has(resolvedPath) && resolvedPath !== relPath) {
					addEdge(resolvedPath, relPath, 'imports');
				}
			}
		}
	} catch (err) {
		console.error(`Error analyzing ${relPath}:`, err.message);
	}
}

function resolveImport(fromPath, importPath) {
	const fromDir = dirname(fromPath);
	let resolved = join(fromDir, importPath);

	if (!resolved.includes('.')) {
		const extensions = ['.ts', '.js', '.svelte', '/index.ts', '/index.js', '/index.svelte'];
		for (const ext of extensions) {
			const candidate = resolved + ext;
			if (nodes.has(candidate)) return candidate;
		}
	}

	return resolved.startsWith('/') ? resolved.slice(1) : resolved;
}

async function analyzeDockerfile(fullPath, relPath) {
	try {
		const content = await readFile(fullPath, 'utf-8');
		addNode(relPath, 'dockerfile', 'Dockerfile', '');

		const fromRegex = /^FROM\s+([^\s]+)/gm;
		let match;
		while ((match = fromRegex.exec(content)) !== null) {
			const image = match[1];
			if (!image.includes(':') || image.startsWith('ghcr.io/neuralj/')) {
				const imageName = image.split('/').pop().split(':')[0];
				const dockerfilePath = `images/${imageName}/Dockerfile`;
				if (nodes.has(dockerfilePath)) {
					addEdge(dockerfilePath, relPath, 'composes');
				}
			}
		}
	} catch (err) {
		console.error(`Error analyzing ${relPath}:`, err.message);
	}
}

async function analyzeCaddyfile(fullPath, relPath) {
	try {
		const content = await readFile(fullPath, 'utf-8');
		const fileName = relPath.split('/').pop();
		addNode(relPath, 'config', fileName, '');

		const proxyRegex = /reverse_proxy\s+(?:localhost|127\.0\.0\.1):(\d+)/g;
		let match;
		while ((match = proxyRegex.exec(content)) !== null) {
			const port = match[1];
			if (port === '3000') {
				addEdge('viewer', relPath, 'references');
			}
		}
	} catch (err) {
		console.error(`Error analyzing ${relPath}:`, err.message);
	}
}

async function analyzeComposeFile(fullPath, relPath) {
	try {
		const content = await readFile(fullPath, 'utf-8');
		addNode(relPath, 'compose', 'docker-compose', '');
	} catch (err) {
		console.error(`Error analyzing ${relPath}:`, err.message);
	}
}

async function analyzePackageJson(fullPath, relPath) {
	try {
		const content = await readFile(fullPath, 'utf-8');
		const pkg = JSON.parse(content);
		const dir = dirname(relPath);
		const label = pkg.name || dir.split('/').pop();
		addNode(dir, 'package', label, pkg.description || '');
	} catch (err) {
		console.error(`Error analyzing ${relPath}:`, err.message);
	}
}

async function main() {
	console.log('Scanning repository...');
	await walk(REPO_ROOT);

	const graph = {
		nodes: Array.from(nodes.values()),
		edges: edges
	};

	await import('fs').then(fs => fs.writeFileSync(OUTPUT_FILE, JSON.stringify(graph, null, 2)));
	console.log(`Generated ${OUTPUT_FILE}`);
	console.log(`  Nodes: ${graph.nodes.length}`);
	console.log(`  Edges: ${graph.edges.length}`);
}

main().catch(console.error);
