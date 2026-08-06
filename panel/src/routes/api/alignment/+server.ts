import { json } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { findRepoRoot } from '$lib/server/repo.js';

const REPO_ROOT = findRepoRoot();
const execFileAsync = promisify(execFile);

interface CognitiveContractStatus {
	agents_md: {
		exists: boolean;
		path: string;
		five_layer_coverage: boolean;
		missing_layers: string[];
		has_metacognition: boolean;
		has_knowledge_network: boolean;
	};
	goals_json: {
		exists: boolean;
		path: string;
		has_cognitive_contract: boolean;
		goals_with_layer: number;
		goals_total: number;
		goals_with_network: number;
	};
	alignment_score: number;
	validation_status: 'excellent' | 'good' | 'needs_improvement' | 'poor';
}

export async function GET() {
	try {
		const status: CognitiveContractStatus = {
			agents_md: {
				exists: false,
				path: '',
				five_layer_coverage: false,
				missing_layers: [],
				has_metacognition: false,
				has_knowledge_network: false
			},
			goals_json: {
				exists: false,
				path: '',
				has_cognitive_contract: false,
				goals_with_layer: 0,
				goals_total: 0,
				goals_with_network: 0
			},
			alignment_score: 0,
			validation_status: 'poor'
		};

		// 检查 agents.md
		const agentsPaths = [
			join(REPO_ROOT, 'AGENTS.md'),
			join(REPO_ROOT, 'CLAUDE.md')
		];

		for (const path of agentsPaths) {
			try {
				const content = await readFile(path, 'utf-8');
				status.agents_md.exists = true;
				status.agents_md.path = path;

				// 检查五层完整性
				const layers = ['Purpose', 'Constraints', 'Architecture', 'Glossary', 'Operations'];
				const missingLayers: string[] = [];

				for (const layer of layers) {
					if (!content.includes(`【1】${layer}`) && 
					    !content.includes(`【2】${layer}`) && 
					    !content.includes(`【3】${layer}`) && 
					    !content.includes(`【4】${layer}`) && 
					    !content.includes(`【5】${layer}`)) {
						missingLayers.push(layer);
					}
				}

				status.agents_md.missing_layers = missingLayers;
				status.agents_md.five_layer_coverage = missingLayers.length === 0;
				status.agents_md.has_metacognition = content.includes('元认知自检记录');
				status.agents_md.has_knowledge_network = content.includes('知识三层网络');

				break;
			} catch {
				continue;
			}
		}

		// 检查 goals.json
		const goalsPath = join(REPO_ROOT, '.opencode', 'goals.json');
		try {
			const content = await readFile(goalsPath, 'utf-8');
			const data = JSON.parse(content);

			status.goals_json.exists = true;
			status.goals_json.path = goalsPath;
			status.goals_json.has_cognitive_contract = !!data.cognitive_contract;

			if (Array.isArray(data.goals)) {
				status.goals_json.goals_total = data.goals.length;
				status.goals_json.goals_with_layer = data.goals.filter((g: any) => g.cognitive_layer).length;
				status.goals_json.goals_with_network = data.goals.filter((g: any) => g.knowledge_network).length;
			}
		} catch {
			// goals.json 不存在或解析失败
		}

		// 计算对齐度分数
		let score = 100;

		// agents.md 五层完整性（每缺失一层扣 10 分）
		score -= status.agents_md.missing_layers.length * 10;

		// goals.json cognitive_layer 关联（每个缺失扣 5 分）
		if (status.goals_json.goals_total > 0) {
			const missingRatio = (status.goals_json.goals_total - status.goals_json.goals_with_layer) / status.goals_json.goals_total;
			score -= Math.round(missingRatio * 20);
		}

		// 确保分数在 0-100 之间
		score = Math.max(0, Math.min(100, score));
		status.alignment_score = score;

		// 确定验证状态
		if (score >= 90) {
			status.validation_status = 'excellent';
		} else if (score >= 70) {
			status.validation_status = 'good';
		} else if (score >= 50) {
			status.validation_status = 'needs_improvement';
		} else {
			status.validation_status = 'poor';
		}

		return json(status);
	} catch (e) {
		return json({ error: String(e) }, { status: 500 });
	}
}

export async function POST({ url }) {
	const action = url.searchParams.get('action');

	if (action === 'validate') {
		try {
			const { stdout, stderr } = await execFileAsync(
				join(REPO_ROOT, 'scripts', 'validate-contract.sh'),
				{ cwd: REPO_ROOT }
			);
			return json({ success: true, output: stdout, error: stderr });
		} catch (e: unknown) {
			const err = e as { stderr?: string; message?: string };
			return json({ 
				success: false, 
				error: err.stderr || err.message || String(e) 
			}, { status: 500 });
		}
	}

	return json({ error: 'Unknown action' }, { status: 400 });
}
