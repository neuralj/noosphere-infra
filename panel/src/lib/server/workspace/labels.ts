export const LABEL = {
	id: 'org.openlaputa.workspace.id',
	name: 'org.openlaputa.workspace.name',
	role: 'org.openlaputa.workspace.role',
	createdAt: 'org.openlaputa.workspace.createdAt'
} as const;

export interface ParsedLabels {
	id?: string;
	name?: string;
	role?: string;
	createdAt?: string;
}

export function toLabels(id: string, ts: number): Record<string, string> {
	return {
		[LABEL.id]: id,
		[LABEL.name]: id,
		[LABEL.role]: 'main',
		[LABEL.createdAt]: String(ts)
	};
}

export function sidecarLabels(): Record<string, string> {
	return { [LABEL.role]: 'sidecar' };
}

export function parseLabels(labels: Record<string, string>): ParsedLabels {
	return {
		id: labels[LABEL.id],
		name: labels[LABEL.name],
		role: labels[LABEL.role],
		createdAt: labels[LABEL.createdAt]
	};
}
