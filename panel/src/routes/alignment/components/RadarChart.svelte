<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

	Chart.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

	interface Props {
		scores: {
			value: number;
			rule: number;
			structure: number;
			concept: number;
			perception: number;
		};
		structureCheck: {
			value: number;
			rule: number;
			structure: number;
			concept: number;
			perception: number;
		};
	}

	let { scores, structureCheck }: Props = $props();
	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	onMount(() => {
		chart = new Chart(canvas, {
			type: 'radar',
			data: {
				labels: ['Purpose', 'Constraints', 'Architecture', 'Glossary', 'Operations'],
				datasets: [
					{
						label: '目标完成率',
						data: [scores.value, scores.rule, scores.structure, scores.concept, scores.perception],
						backgroundColor: 'rgba(137, 180, 250, 0.15)',
						borderColor: 'rgba(137, 180, 250, 0.8)',
						borderWidth: 2,
						pointBackgroundColor: 'rgba(137, 180, 250, 1)',
						pointBorderColor: '#1e1e2e',
						pointBorderWidth: 1,
						pointRadius: 4,
						pointHoverRadius: 6,
						pointHoverBackgroundColor: '#fff',
						pointHoverBorderColor: 'rgba(137, 180, 250, 1)'
					},
					{
						label: '结构检查',
						data: [structureCheck.value, structureCheck.rule, structureCheck.structure, structureCheck.concept, structureCheck.perception],
						backgroundColor: 'transparent',
						borderColor: 'rgba(249, 226, 175, 0.5)',
						borderWidth: 2,
						borderDash: [4, 4],
						pointBackgroundColor: 'rgba(249, 226, 175, 0.6)',
						pointBorderColor: '#1e1e2e',
						pointBorderWidth: 1,
						pointRadius: 3,
						pointHoverRadius: 5,
						fill: false
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				scales: {
					r: {
						beginAtZero: true,
						max: 100,
						ticks: {
							stepSize: 20,
							color: '#7f849c',
							backdropColor: 'transparent',
							font: { size: 10 }
						},
						grid: {
							color: 'rgba(127, 132, 156, 0.15)'
						},
						angleLines: {
							color: 'rgba(127, 132, 156, 0.15)'
						},
						pointLabels: {
							color: '#cdd6f4',
							font: {
								size: 11,
								weight: '500' as const
							}
						}
					}
				},
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						backgroundColor: '#363650',
						titleColor: '#cdd6f4',
						bodyColor: '#cdd6f4',
						borderColor: '#3e3e5e',
						borderWidth: 1,
						padding: 10,
						callbacks: {
							label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`
						}
					}
				}
			}
		});
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
			chart = null;
		}
	});
</script>

<div class="w-full">
	<canvas bind:this={canvas}></canvas>
</div>
