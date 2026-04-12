import type { UsageReportConfig } from '@llm-water-tracker/terminal/table';
import process from 'node:process';
import {
	addEmptySeparatorRow,
	createUsageReportTable,
	formatTotalsRow,
	formatUsageDataRow,
	pushBreakdownRows,
} from '@llm-water-tracker/terminal/table';
import { Result } from '@praha/byethrow';
import { define } from 'gunshi';
import { loadConfig, mergeConfigWithArgs } from '../_config-loader-tokens.ts';
import { WEEK_DAYS } from '../_consts.ts';
import { formatDateCompact } from '../_date-utils.ts';
import { processWithJq } from '../_jq-processor.ts';
import { sharedArgs } from '../_shared-args.ts';
import { calculateTotals, createTotalsObject, getTotalTokens } from '../calculate-cost.ts';
import { loadWeeklyUsageData } from '../data-loader.ts';
import { detectMismatches, printMismatchReport } from '../debug.ts';
import { log, logger } from '../logger.ts';
import {
	calculateWaterMlForEntry,
	formatWaterGallons,
	formatWaterLiters,
	mlToGallons,
	mlToLiters,
} from '@llm-water-tracker/internal/water-calculator';
import { fetchWaterRates } from '@llm-water-tracker/internal/water-rates-fetcher';
import {
	calculateCo2GramsForEntry,
	DEFAULT_CO2_RATES,
	formatCo2Grams,
	formatCo2Pounds,
	gramsToPounds,
} from '@llm-water-tracker/internal/co2-calculator';

export const weeklyCommand = define({
	name: 'weekly',
	description: 'Show usage report grouped by week',
	args: {
		...sharedArgs,
		startOfWeek: {
			type: 'enum',
			short: 'w',
			description: 'Day to start the week on',
			default: 'sunday' as const,
			choices: WEEK_DAYS,
		},
	},
	toKebab: true,
	async run(ctx) {
		// Load configuration and merge with CLI arguments
		const config = loadConfig(ctx.values.config, ctx.values.debug);
		const mergedOptions = mergeConfigWithArgs(ctx, config, ctx.values.debug);

		// --jq implies --json
		const useJson = Boolean(mergedOptions.json) || mergedOptions.jq != null;
		if (useJson) {
			logger.level = 0;
		}

		const weeklyData = await loadWeeklyUsageData(mergedOptions);

		// Fetch water rates (with offline fallback)
		const waterRates = await fetchWaterRates(Boolean(mergedOptions.offline));
		const co2Rates = waterRates.co2 ?? DEFAULT_CO2_RATES;

		if (weeklyData.length === 0) {
			if (useJson) {
				const emptyOutput = {
					weekly: [],
					totals: {
						inputTokens: 0,
						outputTokens: 0,
						cacheCreationTokens: 0,
						cacheReadTokens: 0,
						totalTokens: 0,
						totalCost: 0,
					},
				};
				log(JSON.stringify(emptyOutput, null, 2));
			} else {
				logger.warn('No Claude usage data found.');
			}
			process.exit(0);
		}

		// Calculate totals
		const totals = calculateTotals(weeklyData);

		// Show debug information if requested
		if (mergedOptions.debug && !useJson) {
			const mismatchStats = await detectMismatches(undefined);
			printMismatchReport(mismatchStats, mergedOptions.debugSamples as number | undefined);
		}

		if (useJson) {
			// Output JSON format
			const jsonOutput = {
				weekly: weeklyData.map((data) => ({
					week: data.week,
					inputTokens: data.inputTokens,
					outputTokens: data.outputTokens,
					cacheCreationTokens: data.cacheCreationTokens,
					cacheReadTokens: data.cacheReadTokens,
					totalTokens: getTotalTokens(data),
					totalCost: data.totalCost,
					modelsUsed: data.modelsUsed,
					modelBreakdowns: data.modelBreakdowns,
					waterLiters: mlToLiters(calculateWaterMlForEntry(
						{ inputTokens: data.inputTokens, outputTokens: data.outputTokens, cacheCreationTokens: data.cacheCreationTokens, cacheReadTokens: data.cacheReadTokens },
						data.modelsUsed ?? [],
						waterRates,
					)),
					waterGallons: mlToGallons(calculateWaterMlForEntry(
						{ inputTokens: data.inputTokens, outputTokens: data.outputTokens, cacheCreationTokens: data.cacheCreationTokens, cacheReadTokens: data.cacheReadTokens },
						data.modelsUsed ?? [],
						waterRates,
					)),
					co2Grams: calculateCo2GramsForEntry(
						{ inputTokens: data.inputTokens, outputTokens: data.outputTokens, cacheCreationTokens: data.cacheCreationTokens, cacheReadTokens: data.cacheReadTokens },
						data.modelsUsed ?? [],
						co2Rates,
					),
					co2Pounds: gramsToPounds(calculateCo2GramsForEntry(
						{ inputTokens: data.inputTokens, outputTokens: data.outputTokens, cacheCreationTokens: data.cacheCreationTokens, cacheReadTokens: data.cacheReadTokens },
						data.modelsUsed ?? [],
						co2Rates,
					)),
				})),
				totals: createTotalsObject(totals),
			};

			// Process with jq if specified
			if (mergedOptions.jq != null) {
				const jqResult = await processWithJq(jsonOutput, mergedOptions.jq);
				if (Result.isFailure(jqResult)) {
					logger.error(jqResult.error.message);
					process.exit(1);
				}
				log(jqResult.value);
			} else {
				log(JSON.stringify(jsonOutput, null, 2));
			}
		} else {
			// Print header
			logger.box('LLM Water Tracker - Weekly');

			// Create table with compact mode support
			const tableConfig: UsageReportConfig = {
				firstColumnName: 'Week',
				dateFormatter: (dateStr: string) =>
					formatDateCompact(dateStr, mergedOptions.timezone, mergedOptions.locale ?? undefined),
				forceCompact: ctx.values.compact,
				extraHeaders: ['Water (L)', 'Water (gal)', 'CO2 (g)', 'CO2 (lbs)'],
			};
			const table = createUsageReportTable(tableConfig);

			// Add weekly data
			for (const data of weeklyData) {
				// Main row
				const row = formatUsageDataRow(data.week, {
					inputTokens: data.inputTokens,
					outputTokens: data.outputTokens,
					cacheCreationTokens: data.cacheCreationTokens,
					cacheReadTokens: data.cacheReadTokens,
					totalCost: data.totalCost,
					modelsUsed: data.modelsUsed,
					extraValues: [
						formatWaterLiters(calculateWaterMlForEntry(
							{ inputTokens: data.inputTokens, outputTokens: data.outputTokens, cacheCreationTokens: data.cacheCreationTokens, cacheReadTokens: data.cacheReadTokens },
							data.modelsUsed ?? [],
							waterRates,
						)),
						formatWaterGallons(calculateWaterMlForEntry(
							{ inputTokens: data.inputTokens, outputTokens: data.outputTokens, cacheCreationTokens: data.cacheCreationTokens, cacheReadTokens: data.cacheReadTokens },
							data.modelsUsed ?? [],
							waterRates,
						)),
						formatCo2Grams(calculateCo2GramsForEntry(
							{ inputTokens: data.inputTokens, outputTokens: data.outputTokens, cacheCreationTokens: data.cacheCreationTokens, cacheReadTokens: data.cacheReadTokens },
							data.modelsUsed ?? [],
							co2Rates,
						)),
						formatCo2Pounds(calculateCo2GramsForEntry(
							{ inputTokens: data.inputTokens, outputTokens: data.outputTokens, cacheCreationTokens: data.cacheCreationTokens, cacheReadTokens: data.cacheReadTokens },
							data.modelsUsed ?? [],
							co2Rates,
						)),
					],
				});
				table.push(row);

				// Add model breakdown rows if flag is set
				if (mergedOptions.breakdown) {
					pushBreakdownRows(table, data.modelBreakdowns);
				}
			}

			// Add empty row for visual separation before totals
			addEmptySeparatorRow(table, 12);

			// Add totals
			const totalWaterMl = weeklyData.reduce((sum, data) => sum + calculateWaterMlForEntry(
				{ inputTokens: data.inputTokens, outputTokens: data.outputTokens, cacheCreationTokens: data.cacheCreationTokens, cacheReadTokens: data.cacheReadTokens },
				data.modelsUsed ?? [],
				waterRates,
			), 0);
			const totalCo2Grams = weeklyData.reduce((sum, data) => sum + calculateCo2GramsForEntry(
				{ inputTokens: data.inputTokens, outputTokens: data.outputTokens, cacheCreationTokens: data.cacheCreationTokens, cacheReadTokens: data.cacheReadTokens },
				data.modelsUsed ?? [],
				co2Rates,
			), 0);
			const totalsRow = formatTotalsRow({
				inputTokens: totals.inputTokens,
				outputTokens: totals.outputTokens,
				cacheCreationTokens: totals.cacheCreationTokens,
				cacheReadTokens: totals.cacheReadTokens,
				totalCost: totals.totalCost,
			}, false, [formatWaterLiters(totalWaterMl), formatWaterGallons(totalWaterMl), formatCo2Grams(totalCo2Grams), formatCo2Pounds(totalCo2Grams)]);
			table.push(totalsRow);

			log(table.toString());
			logger.info(`\nRates: ${waterRates.baseMlPerToken} ml/token (sonnet baseline) · ${waterRates.source} · updated ${waterRates.updated}`);
			logger.info(`CO2: ${co2Rates.baseGramsPerToken} g/token (sonnet baseline) · ${co2Rates.source}`);

			// Show guidance message if in compact mode
			if (table.isCompactMode()) {
				logger.info('\nRunning in Compact Mode');
				logger.info('Expand terminal width to see cache metrics and total tokens');
			}
		}
	},
});
