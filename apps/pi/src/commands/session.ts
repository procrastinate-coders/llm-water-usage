import path from 'node:path';
import process from 'node:process';
import {
	addEmptySeparatorRow,
	createUsageReportTable,
	formatDateCompact,
	formatTotalsRow,
	formatUsageDataRow,
	pushBreakdownRows,
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
import { loadPiAgentSessionData } from '../data-loader.ts';
import { log, logger } from '../logger.ts';

export const sessionCommand = define({
	name: 'session',
	description: 'Show pi-agent usage by session',
	args: {
		json: {
			type: 'boolean',
			description: 'Output as JSON',
			default: false,
		},
		since: {
			type: 'string',
			description: 'Start date (YYYY-MM-DD or YYYYMMDD)',
		},
		until: {
			type: 'string',
			description: 'End date (YYYY-MM-DD or YYYYMMDD)',
		},
		timezone: {
			type: 'string',
			short: 'z',
			description: 'Timezone for date display',
		},
		piPath: {
			type: 'string',
			description: 'Path to pi-agent sessions directory',
		},
		order: {
			type: 'string',
			description: 'Sort order: asc or desc',
			default: 'desc',
		},
		breakdown: {
			type: 'boolean',
			short: 'b',
			description: 'Show model breakdown for each entry',
			default: false,
		},
	},
	async run(ctx) {
		const options = {
			since: ctx.values.since,
			until: ctx.values.until,
			timezone: ctx.values.timezone,
			order: ctx.values.order as 'asc' | 'desc',
			piPath: ctx.values.piPath,
		};

		const piData = await loadPiAgentSessionData(options);

		if (piData.length === 0) {
			if (ctx.values.json) {
				log(JSON.stringify([]));
			} else {
				logger.warn('No usage data found.');
			}
			process.exit(0);
		}

		const waterRates = await fetchWaterRates(false);

		const totals = {
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
			totalCost: 0,
		};

		for (const d of piData) {
			totals.inputTokens += d.inputTokens;
			totals.outputTokens += d.outputTokens;
			totals.cacheCreationTokens += d.cacheCreationTokens;
			totals.cacheReadTokens += d.cacheReadTokens;
			totals.totalCost += d.totalCost;
		}

		if (ctx.values.json) {
			const sessionsWithWater = piData.map((d) => {
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

			const totalWaterMl = sessionsWithWater.reduce((sum, d) => {
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

			log(
				JSON.stringify(
					{
						sessions: sessionsWithWater,
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
		} else {
			logger.box('Pi-Agent Usage Report - Sessions');

			const table = createUsageReportTable({
				firstColumnName: 'Session',
				dateFormatter: (dateStr: string) => formatDateCompact(dateStr),
				extraHeaders: ['Water (L)', 'Water (gal)'],
				extraAligns: ['right', 'right'],
			});

			let totalWaterMl = 0;

			for (const data of piData) {
				const projectName = path.basename(data.projectPath);
				const truncatedName =
					projectName.length > 25 ? `${projectName.slice(0, 22)}...` : projectName;

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

				const row = formatUsageDataRow(truncatedName, {
					inputTokens: data.inputTokens,
					outputTokens: data.outputTokens,
					cacheCreationTokens: data.cacheCreationTokens,
					cacheReadTokens: data.cacheReadTokens,
					totalCost: data.totalCost,
					modelsUsed: data.modelsUsed,
					extraValues: [formatWaterLiters(waterMl), formatWaterGallons(waterMl)],
				});
				table.push(row);

				if (ctx.values.breakdown) {
					pushBreakdownRows(table, data.modelBreakdowns);
				}
			}

			addEmptySeparatorRow(table, 10);

			const totalsRow = formatTotalsRow(
				{
					inputTokens: totals.inputTokens,
					outputTokens: totals.outputTokens,
					cacheCreationTokens: totals.cacheCreationTokens,
					cacheReadTokens: totals.cacheReadTokens,
					totalCost: totals.totalCost,
				},
				false,
				[formatWaterLiters(totalWaterMl), formatWaterGallons(totalWaterMl)],
			);
			table.push(totalsRow);

			log(table.toString());
		}
	},
});
