import { LiteLLMPricingFetcher } from '@llm-water-tracker/internal/pricing';
import {
	calculateWaterMlForEntry,
	formatWaterGallons,
	formatWaterLiters,
	mlToGallons,
	mlToLiters,
} from '@llm-water-tracker/internal/water-calculator';
import { fetchWaterRates } from '@llm-water-tracker/internal/water-rates-fetcher';
import {
	addEmptySeparatorRow,
	formatCurrency,
	formatDateCompact,
	formatModelsDisplayMultiline,
	formatNumber,
	ResponsiveTable,
} from '@llm-water-tracker/terminal/table';
import { groupBy } from 'es-toolkit';
import { define } from 'gunshi';
import pc from 'picocolors';
import { calculateCostForEntry } from '../cost-utils.ts';
import { loadOpenCodeMessages } from '../data-loader.ts';
import { logger } from '../logger.ts';

const TABLE_COLUMN_COUNT = 10;

export const dailyCommand = define({
	name: 'daily',
	description: 'Show OpenCode token usage grouped by day',
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

		const entries = await loadOpenCodeMessages();

		if (entries.length === 0) {
			const output = jsonOutput
				? JSON.stringify({ daily: [], totals: null })
				: 'No OpenCode usage data found.';
			 
			console.log(output);
			return;
		}

		using fetcher = new LiteLLMPricingFetcher({ offline: false, logger });

		const waterRates = await fetchWaterRates(false);

		const entriesByDate = groupBy(entries, (entry) => entry.timestamp.toISOString().split('T')[0]!);

		const dailyData: Array<{
			date: string;
			inputTokens: number;
			outputTokens: number;
			cacheCreationTokens: number;
			cacheReadTokens: number;
			totalTokens: number;
			totalCost: number;
			modelsUsed: string[];
			waterLiters: number;
			waterGallons: number;
		}> = [];

		for (const [date, dayEntries] of Object.entries(entriesByDate)) {
			let inputTokens = 0;
			let outputTokens = 0;
			let cacheCreationTokens = 0;
			let cacheReadTokens = 0;
			let totalCost = 0;
			const modelsSet = new Set<string>();

			for (const entry of dayEntries) {
				inputTokens += entry.usage.inputTokens;
				outputTokens += entry.usage.outputTokens;
				cacheCreationTokens += entry.usage.cacheCreationInputTokens;
				cacheReadTokens += entry.usage.cacheReadInputTokens;
				totalCost += await calculateCostForEntry(entry, fetcher);
				modelsSet.add(entry.model);
			}

			const totalTokens = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;

			const waterMl = calculateWaterMlForEntry(
				{
					inputTokens,
					outputTokens,
					cacheCreationTokens,
					cacheReadTokens,
				},
				Array.from(modelsSet),
				waterRates,
			);

			dailyData.push({
				date,
				inputTokens,
				outputTokens,
				cacheCreationTokens,
				cacheReadTokens,
				totalTokens,
				totalCost,
				modelsUsed: Array.from(modelsSet),
				waterLiters: mlToLiters(waterMl),
				waterGallons: mlToGallons(waterMl),
			});
		}

		dailyData.sort((a, b) => a.date.localeCompare(b.date));

		const totals = {
			inputTokens: dailyData.reduce((sum, d) => sum + d.inputTokens, 0),
			outputTokens: dailyData.reduce((sum, d) => sum + d.outputTokens, 0),
			cacheCreationTokens: dailyData.reduce((sum, d) => sum + d.cacheCreationTokens, 0),
			cacheReadTokens: dailyData.reduce((sum, d) => sum + d.cacheReadTokens, 0),
			totalTokens: dailyData.reduce((sum, d) => sum + d.totalTokens, 0),
			totalCost: dailyData.reduce((sum, d) => sum + d.totalCost, 0),
			waterLiters: dailyData.reduce((sum, d) => sum + d.waterLiters, 0),
			waterGallons: dailyData.reduce((sum, d) => sum + d.waterGallons, 0),
		};

		if (jsonOutput) {
			 
			console.log(
				JSON.stringify(
					{
						daily: dailyData,
						totals,
					},
					null,
					2,
				),
			);
			return;
		}

		 
		console.log('\n📊 OpenCode Token Usage Report - Daily\n');

		const table: ResponsiveTable = new ResponsiveTable({
			head: [
				'Date',
				'Models',
				'Input',
				'Output',
				'Cache Create',
				'Cache Read',
				'Total Tokens',
				'Cost (USD)',
				'Water (L)',
				'Water (gal)',
			],
			colAligns: ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
			compactHead: ['Date', 'Models', 'Input', 'Output', 'Cost (USD)'],
			compactColAligns: ['left', 'left', 'right', 'right', 'right'],
			compactThreshold: 100,
			forceCompact: Boolean(ctx.values.compact),
			style: { head: ['cyan'] },
			dateFormatter: (dateStr: string) => formatDateCompact(dateStr),
		});

		for (const data of dailyData) {
			table.push([
				data.date,
				formatModelsDisplayMultiline(data.modelsUsed),
				formatNumber(data.inputTokens),
				formatNumber(data.outputTokens),
				formatNumber(data.cacheCreationTokens),
				formatNumber(data.cacheReadTokens),
				formatNumber(data.totalTokens),
				formatCurrency(data.totalCost),
				formatWaterLiters(data.waterLiters),
				formatWaterGallons(data.waterGallons),
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
			pc.yellow(formatCurrency(totals.totalCost)),
			pc.yellow(formatWaterLiters(totals.waterLiters)),
			pc.yellow(formatWaterGallons(totals.waterGallons)),
		]);

		 
		console.log(table.toString());

		if (table.isCompactMode()) {
			 
			console.log('\nRunning in Compact Mode');
			 
			console.log('Expand terminal width to see cache metrics and total tokens');
		}
	},
});
