import type { TokenUsageEvent } from '../_types.ts';
import {
	addEmptySeparatorRow,
	formatCurrency,
	formatDateCompact,
	formatModelsDisplayMultiline,
	formatNumber,
	ResponsiveTable,
} from '@llm-water-tracker/terminal/table';
import {
	calculateWaterMlForEntry,
	formatWaterGallons,
	formatWaterLiters,
	mlToGallons,
	mlToLiters,
} from '@llm-water-tracker/internal/water-calculator';
import { fetchWaterRates } from '@llm-water-tracker/internal/water-rates-fetcher';
import { define } from 'gunshi';
import pc from 'picocolors';
import { loadAmpUsageEvents } from '../data-loader.ts';
import { AmpPricingSource } from '../pricing.ts';

const TABLE_COLUMN_COUNT = 11;

function groupByMonth(events: TokenUsageEvent[]): Map<string, TokenUsageEvent[]> {
	const grouped = new Map<string, TokenUsageEvent[]>();
	for (const event of events) {
		const month = event.timestamp.slice(0, 7); // YYYY-MM
		const existing = grouped.get(month);
		if (existing != null) {
			existing.push(event);
		} else {
			grouped.set(month, [event]);
		}
	}
	return grouped;
}

export const monthlyCommand = define({
	name: 'monthly',
	description: 'Show Amp token usage grouped by month',
	args: {
		json: {
			type: 'boolean',
			short: 'j',
			description: 'Output in JSON format',
		},
		compact: {
			type: 'boolean',
			description: 'Force compact table mode',
		},
	},
	async run(ctx) {
		const jsonOutput = Boolean(ctx.values.json);

		const { events } = await loadAmpUsageEvents();

		if (events.length === 0) {
			const output = jsonOutput
				? JSON.stringify({ monthly: [], totals: null })
				: 'No Amp usage data found.';
			 
			console.log(output);
			return;
		}

		using pricingSource = new AmpPricingSource({ offline: false });

		const waterRates = await fetchWaterRates(false);

		const eventsByMonth = groupByMonth(events);

		const monthlyData: Array<{
			month: string;
			inputTokens: number;
			outputTokens: number;
			cacheCreationTokens: number;
			cacheReadTokens: number;
			totalTokens: number;
			credits: number;
			totalCost: number;
			modelsUsed: string[];
		}> = [];

		for (const [month, monthEvents] of eventsByMonth) {
			let inputTokens = 0;
			let outputTokens = 0;
			let cacheCreationTokens = 0;
			let cacheReadTokens = 0;
			let credits = 0;
			let totalCost = 0;
			const modelsSet = new Set<string>();

			for (const event of monthEvents) {
				inputTokens += event.inputTokens;
				outputTokens += event.outputTokens;
				cacheCreationTokens += event.cacheCreationInputTokens;
				cacheReadTokens += event.cacheReadInputTokens;
				credits += event.credits;

				const cost = await pricingSource.calculateCost(event.model, {
					inputTokens: event.inputTokens,
					outputTokens: event.outputTokens,
					cacheCreationInputTokens: event.cacheCreationInputTokens,
					cacheReadInputTokens: event.cacheReadInputTokens,
				});
				totalCost += cost;
				modelsSet.add(event.model);
			}

			const totalTokens = inputTokens + outputTokens;

			monthlyData.push({
				month,
				inputTokens,
				outputTokens,
				cacheCreationTokens,
				cacheReadTokens,
				totalTokens,
				credits,
				totalCost,
				modelsUsed: Array.from(modelsSet),
			});
		}

		monthlyData.sort((a, b) => a.month.localeCompare(b.month));

		const totals = {
			inputTokens: monthlyData.reduce((sum, d) => sum + d.inputTokens, 0),
			outputTokens: monthlyData.reduce((sum, d) => sum + d.outputTokens, 0),
			cacheCreationTokens: monthlyData.reduce((sum, d) => sum + d.cacheCreationTokens, 0),
			cacheReadTokens: monthlyData.reduce((sum, d) => sum + d.cacheReadTokens, 0),
			totalTokens: monthlyData.reduce((sum, d) => sum + d.totalTokens, 0),
			credits: monthlyData.reduce((sum, d) => sum + d.credits, 0),
			totalCost: monthlyData.reduce((sum, d) => sum + d.totalCost, 0),
		};

		if (jsonOutput) {
			const monthlyWithWater = monthlyData.map((d) => {
				const waterMl = calculateWaterMlForEntry(
					{
						inputTokens: d.inputTokens,
						outputTokens: d.outputTokens,
						cacheCreationTokens: d.cacheCreationTokens,
						cacheReadTokens: d.cacheReadTokens,
					},
					d.modelsUsed,
					waterRates,
				);
				return {
					...d,
					waterLiters: mlToLiters(waterMl),
					waterGallons: mlToGallons(waterMl),
				};
			});

			const totalWaterMl = monthlyData.reduce((sum, d) => {
				const waterMl = calculateWaterMlForEntry(
					{
						inputTokens: d.inputTokens,
						outputTokens: d.outputTokens,
						cacheCreationTokens: d.cacheCreationTokens,
						cacheReadTokens: d.cacheReadTokens,
					},
					d.modelsUsed,
					waterRates,
				);
				return sum + waterMl;
			}, 0);

			 
			console.log(
				JSON.stringify(
					{
						monthly: monthlyWithWater,
						totals: {
							...totals,
							waterLiters: mlToLiters(totalWaterMl),
							waterGallons: mlToGallons(totalWaterMl),
						},
					},
					null,
					2,
				),
			);
			return;
		}

		 
		console.log('\n📊 Amp Token Usage Report - Monthly\n');

		const table: ResponsiveTable = new ResponsiveTable({
			head: [
				'Month',
				'Models',
				'Input',
				'Output',
				'Cache Create',
				'Cache Read',
				'Total Tokens',
				'Credits',
				'Cost (USD)',
				'Water (L)',
				'Water (gal)',
			],
			colAligns: ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
			compactHead: ['Month', 'Models', 'Input', 'Output', 'Credits', 'Cost (USD)'],
			compactColAligns: ['left', 'left', 'right', 'right', 'right', 'right'],
			compactThreshold: 100,
			forceCompact: Boolean(ctx.values.compact),
			style: { head: ['cyan'] },
			dateFormatter: (dateStr: string) => formatDateCompact(dateStr),
		});

		let totalWaterMl = 0;

		for (const data of monthlyData) {
			const waterMl = calculateWaterMlForEntry(
				{
					inputTokens: data.inputTokens,
					outputTokens: data.outputTokens,
					cacheCreationTokens: data.cacheCreationTokens,
					cacheReadTokens: data.cacheReadTokens,
				},
				data.modelsUsed,
				waterRates,
			);
			totalWaterMl += waterMl;

			table.push([
				data.month,
				formatModelsDisplayMultiline(data.modelsUsed),
				formatNumber(data.inputTokens),
				formatNumber(data.outputTokens),
				formatNumber(data.cacheCreationTokens),
				formatNumber(data.cacheReadTokens),
				formatNumber(data.totalTokens),
				data.credits.toFixed(2),
				formatCurrency(data.totalCost),
				formatWaterLiters(waterMl),
				formatWaterGallons(waterMl),
			]);
		}

		addEmptySeparatorRow(table, TABLE_COLUMN_COUNT);
		table.push([
			pc.yellow('Total'),
			'',
			pc.yellow(formatNumber(totals.inputTokens)),
			pc.yellow(formatNumber(totals.outputTokens)),
			pc.yellow(formatNumber(totals.cacheCreationTokens)),
			pc.yellow(formatNumber(totals.cacheReadTokens)),
			pc.yellow(formatNumber(totals.totalTokens)),
			pc.yellow(totals.credits.toFixed(2)),
			pc.yellow(formatCurrency(totals.totalCost)),
			pc.yellow(formatWaterLiters(totalWaterMl)),
			pc.yellow(formatWaterGallons(totalWaterMl)),
		]);

		 
		console.log(table.toString());

		if (table.isCompactMode()) {
			 
			console.log('\nRunning in Compact Mode');
			 
			console.log('Expand terminal width to see cache metrics and total tokens');
		}
	},
});
