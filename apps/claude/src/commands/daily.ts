import type { UsageReportConfig } from '@llm-water-tracker/terminal/table';
import process from 'node:process';
import {
	addEmptySeparatorRow,
	createUsageReportTable,
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
import {
	calculateCo2GramsForEntry,
	DEFAULT_CO2_RATES,
	formatCo2Grams,
	formatCo2Pounds,
	gramsToPounds,
} from '@llm-water-tracker/internal/co2-calculator';
import { Result } from '@praha/byethrow';
import { define } from 'gunshi';
import pc from 'picocolors';
import { loadConfig, mergeConfigWithArgs } from '../_config-loader-tokens.ts';
import { groupByProject, groupDataByProject } from '../_daily-grouping.ts';
import { formatDateCompact } from '../_date-utils.ts';
import { processWithJq } from '../_jq-processor.ts';
import { formatProjectName } from '../_project-names.ts';
import { sharedCommandConfig } from '../_shared-args.ts';
import { calculateTotals, createTotalsObject, getTotalTokens } from '../calculate-cost.ts';
import { loadDailyUsageData } from '../data-loader.ts';
import { detectMismatches, printMismatchReport } from '../debug.ts';
import { log, logger } from '../logger.ts';

export const dailyCommand = define({
	name: 'daily',
	description: 'Show usage report grouped by date',
	...sharedCommandConfig,
	args: {
		...sharedCommandConfig.args,
		instances: {
			type: 'boolean',
			short: 'i',
			description: 'Show usage breakdown by project/instance',
			default: false,
		},
		project: {
			type: 'string',
			short: 'p',
			description: 'Filter to specific project name',
		},
		projectAliases: {
			type: 'string',
			description:
				"Comma-separated project aliases (e.g., 'llm-water-tracker=Usage Tracker,myproject=My Project')",
			hidden: true,
		},
	},
	async run(ctx) {
		// Load configuration and merge with CLI arguments
		const config = loadConfig(ctx.values.config, ctx.values.debug);
		const mergedOptions = mergeConfigWithArgs(ctx, config, ctx.values.debug);

		// Convert projectAliases to Map if it exists
		// Parse comma-separated key=value pairs
		let projectAliases: Map<string, string> | undefined;
		if (mergedOptions.projectAliases != null && typeof mergedOptions.projectAliases === 'string') {
			projectAliases = new Map();
			const pairs = mergedOptions.projectAliases
				.split(',')
				.map((pair) => pair.trim())
				.filter((pair) => pair !== '');
			for (const pair of pairs) {
				const parts = pair.split('=').map((s) => s.trim());
				const rawName = parts[0];
				const alias = parts[1];
				if (rawName != null && alias != null && rawName !== '' && alias !== '') {
					projectAliases.set(rawName, alias);
				}
			}
		}

		// --jq implies --json
		const useJson = Boolean(mergedOptions.json) || mergedOptions.jq != null;
		if (useJson) {
			logger.level = 0;
		}

		const dailyData = await loadDailyUsageData({
			...mergedOptions,
			groupByProject: mergedOptions.instances,
		});

		// Fetch water rates (with offline fallback)
		const waterRates = await fetchWaterRates(Boolean(mergedOptions.offline));
		const co2Rates = waterRates.co2 ?? DEFAULT_CO2_RATES;

		if (dailyData.length === 0) {
			if (useJson) {
				log(JSON.stringify([]));
			} else {
				logger.warn('No Claude usage data found.');
			}
			process.exit(0);
		}

		// Calculate totals
		const totals = calculateTotals(dailyData);

		// Show debug information if requested
		if (mergedOptions.debug && !useJson) {
			const mismatchStats = await detectMismatches(undefined);
			printMismatchReport(mismatchStats, mergedOptions.debugSamples as number | undefined);
		}

		if (useJson) {
			// Output JSON format - group by project if instances flag is used
			const jsonOutput =
				Boolean(mergedOptions.instances) && dailyData.some((d) => d.project != null)
					? {
							projects: groupByProject(dailyData),
							totals: createTotalsObject(totals),
						}
					: {
							daily: dailyData.map((data) => ({
								date: data.date,
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
								...(data.project != null && { project: data.project }),
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
			logger.box('LLM Water Tracker - Daily');

			// Create table with compact mode support
			const tableConfig: UsageReportConfig = {
				firstColumnName: 'Date',
				dateFormatter: (dateStr: string) =>
					formatDateCompact(dateStr, mergedOptions.timezone, mergedOptions.locale ?? undefined),
				forceCompact: ctx.values.compact,
				extraHeaders: ['Water (L)', 'Water (gal)', 'CO2 (g)', 'CO2 (lbs)'],
			};
			const table = createUsageReportTable(tableConfig);

			// Add daily data - group by project if instances flag is used
			if (Boolean(mergedOptions.instances) && dailyData.some((d) => d.project != null)) {
				// Group data by project for visual separation
				const projectGroups = groupDataByProject(dailyData);

				let isFirstProject = true;
				for (const [projectName, projectData] of Object.entries(projectGroups)) {
					// Add project section header
					if (!isFirstProject) {
						// Add empty row for visual separation between projects
						table.push(['', '', '', '', '', '', '', '', '', '', '', '']);
					}

					// Add project header row
					table.push([
						pc.cyan(`Project: ${formatProjectName(projectName, projectAliases)}`),
						'',
						'',
						'',
						'',
						'',
						'',
						'',
						'',
						'',
						'',
						'',
					]);

					// Add data rows for this project
					for (const data of projectData) {
						const row = formatUsageDataRow(data.date, {
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

					isFirstProject = false;
				}
			} else {
				// Standard display without project grouping
				for (const data of dailyData) {
					// Main row
					const row = formatUsageDataRow(data.date, {
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
			}

			// Add empty row for visual separation before totals
			addEmptySeparatorRow(table, 12);

			// Add totals
			const totalWaterMl = dailyData.reduce((sum, data) => sum + calculateWaterMlForEntry(
				{ inputTokens: data.inputTokens, outputTokens: data.outputTokens, cacheCreationTokens: data.cacheCreationTokens, cacheReadTokens: data.cacheReadTokens },
				data.modelsUsed ?? [],
				waterRates,
			), 0);
			const totalCo2Grams = dailyData.reduce((sum, data) => sum + calculateCo2GramsForEntry(
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
