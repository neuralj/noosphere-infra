export type WorkspaceState = 'created' | 'running' | 'stopped' | 'error';
export type SidecarName = 'postgres' | 'qdrant' | 'ollama';

export interface WorkspaceSpec {
	id: string;
	image: string;
	repoPath: string | null;
	services: SidecarName[];
	env: Record<string, string>;
}

export interface Workspace extends WorkspaceSpec {
	state: WorkspaceState;
	containerIds: Record<string, string>;
	ports: Record<string, number>;
	composeFile: string;
	createdAt: number;
	startedAt: number | null;
}
