import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAlignmentContent, calculateScore } from '$lib/server/alignment-store.js';

export const GET: RequestHandler = async () => {
	try {
		const content = await getAlignmentContent();
		const score = calculateScore(content.layers);
		return json(score);
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
};
