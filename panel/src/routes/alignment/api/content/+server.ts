import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAlignmentContent } from '$lib/server/alignment-store.js';

export const GET: RequestHandler = async () => {
	try {
		const content = await getAlignmentContent();
		return json(content);
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
};
