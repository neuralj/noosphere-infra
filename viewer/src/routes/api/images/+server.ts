import { json } from '@sveltejs/kit';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { findRepoRoot } from '$lib/server/repo';

const REPO_ROOT = findRepoRoot();

interface ImageStats {
	lines: number;
	runCount: number;
	envCount: number;
	copyCount: number;
	argCount: number;
	multiStage: boolean;
	hasHealthcheck: boolean;
	hasEntrypoint: boolean;
	complexity: 'simple' | 'moderate' | 'complex';
}

interface ImageInfo {
	name: string;
	dockerfile: string;
	fromImage: string;
	ports: string[];
	description: string;
	stats: ImageStats;
	pullCommand: string;
	mirrorPullCommand: string;
	isInternal: boolean;
	dependsOn: string[];
}

export async function GET() {
	try {
		const imagesDir = join(REPO_ROOT, 'images');
		const dirs = await readdir(imagesDir, { withFileTypes: true });
		const images: ImageInfo[] = [];

		// First pass: collect all image names to determine internal dependencies
		const imageNames = new Set<string>();
		for (const dir of dirs) {
			if (dir.isDirectory()) {
				imageNames.add(dir.name);
			}
		}

		// Second pass: parse Dockerfiles
		for (const dir of dirs) {
			if (!dir.isDirectory()) continue;
			const dockerfilePath = join(imagesDir, dir.name, 'Dockerfile');
			try {
				const content = await readFile(dockerfilePath, 'utf-8');
				const fromMatch = content.match(/^FROM\s+(.+?)(?:\s+AS\s+\S+)?$/im);
				const fromImage = fromMatch ? fromMatch[1].trim() : 'unknown';
				const portMatches = [...content.matchAll(/EXPOSE\s+(\d+(?:\s+\d+)*)/gim)];
				const ports = portMatches.flatMap((m) => m[1].split(/\s+/));
				const allLines = content.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
				const runCount = [...content.matchAll(/^RUN\s/gim)].length;
				const envCount = [...content.matchAll(/^ENV\s/gim)].length;
				const copyCount = [...content.matchAll(/^COPY\s/gim)].length;
				const argCount = [...content.matchAll(/^ARG\s/gim)].length;
				const fromCount = [...content.matchAll(/^FROM\s/gim)].length;
				const hasHealthcheck = /^HEALTHCHECK\s/gim.test(content);
				const hasEntrypoint = /^ENTRYPOINT\s/gim.test(content);
				const lineCount = allLines.length;
				const complexity: ImageStats['complexity'] =
					lineCount <= 10 && runCount <= 1 ? 'simple' : lineCount <= 40 && runCount <= 5 ? 'moderate' : 'complex';

				// Determine if this image depends on an internal image
				const fromBase = fromImage.split(':')[0].split('/').pop() || fromImage;
				const isInternal = imageNames.has(fromBase);
				const dependsOn = isInternal ? [fromBase] : [];

				images.push({
					name: dir.name,
					dockerfile: content,
					fromImage,
					ports,
					description: '',
					stats: {
						lines: lineCount,
						runCount,
						envCount,
						copyCount,
						argCount,
						multiStage: fromCount > 1,
						hasHealthcheck,
						hasEntrypoint,
						complexity
					},
					pullCommand: `docker pull ghcr.io/neuralj/${dir.name}:latest`,
					mirrorPullCommand: `./scripts/ghcr-pull ghcr.io/neuralj/${dir.name}:latest`,
					isInternal,
					dependsOn
				});
			} catch {
				// skip dirs without Dockerfile
			}
		}

		// Sort: internal dependencies first (devshell before a-bulletin/a-market)
		images.sort((a, b) => {
			if (a.dependsOn.length === 0 && b.dependsOn.length > 0) return -1;
			if (a.dependsOn.length > 0 && b.dependsOn.length === 0) return 1;
			return a.name.localeCompare(b.name);
		});

		return json({ images });
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}
