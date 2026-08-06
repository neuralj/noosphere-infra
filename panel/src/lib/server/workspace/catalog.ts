import type { SidecarName } from './types';

export interface SidecarDef {
	image: string;
	ports: number[];
	env: Record<string, string>;
	volumes: string[];
}

export interface MainImageDef {
	ports: number[];
}

export const SIDECAR_SERVICES: Record<SidecarName, SidecarDef> = {
	postgres: {
		image: 'ghcr.io/neuralj/postgres:latest',
		ports: [5432],
		env: { POSTGRES_PASSWORD: 'laputa' },
		volumes: []
	},
	qdrant: {
		image: 'ghcr.io/neuralj/qdrant:latest',
		ports: [6333],
		env: {},
		volumes: []
	},
	ollama: {
		image: 'ghcr.io/neuralj/ollama:latest',
		ports: [11434],
		env: {},
		volumes: ['ollama:/root/.ollama']
	}
};

export const MAIN_IMAGES: Record<string, MainImageDef> = {
	'ghcr.io/neuralj/devshell:latest': { ports: [22, 8080, 8888] },
	'ghcr.io/neuralj/shell:latest': { ports: [22] },
	'ghcr.io/neuralj/webtest:latest': { ports: [] }
};

export function isKnownSidecar(name: string): name is SidecarName {
	return name in SIDECAR_SERVICES;
}

export function isKnownMainImage(image: string): boolean {
	return image in MAIN_IMAGES;
}
