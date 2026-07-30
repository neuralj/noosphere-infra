#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const WORKFLOW_PATH = join(REPO_ROOT, '.github/workflows/build.yml');
const IMAGES_YML_PATH = join(REPO_ROOT, 'scripts/images.yml');

async function main() {
	console.log('Syncing images.yml with CI workflow...');

	const workflowContent = await readFile(WORKFLOW_PATH, 'utf-8');

	// Extract image names from dorny/paths-filter section
	// Pattern: lines like "            devshell:" under "filters: |"
	const imageNames = [];
	const lines = workflowContent.split('\n');
	let inFilters = false;

	for (const line of lines) {
		if (line.includes('filters: |')) {
			inFilters = true;
			continue;
		}
		if (inFilters) {
			// Match image names (12 spaces indent + name + colon)
			const match = line.match(/^            (\S+):$/);
			if (match) {
				imageNames.push(match[1]);
			} else if (line.trim() && !line.startsWith('            ')) {
				// End of filters section
				break;
			}
		}
	}

	if (imageNames.length === 0) {
		console.error('No images found in workflow');
		process.exit(1);
	}

	console.log(`Found ${imageNames.length} images in workflow:`);
	console.log(imageNames.map(n => `  - ${n}`).join('\n'));

	// Read current images.yml
	const currentContent = await readFile(IMAGES_YML_PATH, 'utf-8');
	const currentImages = [];
	const currentLines = currentContent.split('\n');
	for (const line of currentLines) {
		const match = line.match(/^\s{2}(\S+):/);
		if (match) {
			currentImages.push(match[1]);
		}
	}

	// Find differences
	const missing = imageNames.filter(n => !currentImages.includes(n));
	const extra = currentImages.filter(n => !imageNames.includes(n));

	if (missing.length === 0 && extra.length === 0) {
		console.log('\n✓ images.yml is already in sync');
		return;
	}

	if (missing.length > 0) {
		console.log(`\n⚠ Missing from images.yml: ${missing.join(', ')}`);
	}
	if (extra.length > 0) {
		console.log(`⚠ Extra in images.yml (not in CI): ${extra.join(', ')}`);
	}

	// Generate new images.yml
	const newContent = [
		'registry: ghcr.io/neuralj',
		'mirror: ghcr.nju.edu.cn',
		'',
		'images:'
	];

	// Sort images: base images first, then dependent images
	const dependentImages = ['a-bulletin', 'a-market'];
	const baseImages = imageNames.filter(n => !dependentImages.includes(n));
	const depChanged = imageNames.filter(n => dependentImages.includes(n));

	for (const name of [...baseImages, ...depChanged]) {
		const tag = name === 'postgres' ? '"17"' : 'latest';
		const padding = ' '.repeat(Math.max(0, 12 - name.length));
		newContent.push(`  ${name}:${padding}{ tag: ${tag} }`);
	}

	newContent.push('');

	await writeFile(IMAGES_YML_PATH, newContent.join('\n'));
	console.log(`\n✓ Updated images.yml with ${imageNames.length} images`);
}

main().catch(err => {
	console.error('Error:', err.message);
	process.exit(1);
});
