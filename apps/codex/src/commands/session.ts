import process from 'node:process';
import {
	addEmptySeparatorRow,
	formatCurrency,
	formatDateCompact,
	formatModelsDisplayMultiline,
	formatNumber,
	ResponsiveTable,
} from '@llm-water-tracker/terminal/table';
import { define } from 'gunshi';
import pc from 'picocolors';
import { DEFAULT_TIMEZONE } from '../_consts.ts';
import { sharedArgs } from '../_shared-args.ts';
import { formatModelsList, splitUsageTokens } from '../command-utils.ts';
import { loadTokenUsageEvents } from '../data-loader.ts';
import {
	formatDisplayDate,
	formatDisplayDateTime,
	normalizeFilterDate,
	toDateKey,
} from '../date-utils.ts';
import { log, logger } from '../logger.ts';
import { CodexPricingSource } from '../pricing.ts';
import { buildSessionReport } from '../session-report.ts';
import {
	calculateWaterMlForEntry,
	formatWaterGallons,
	formatWaterLiters,
	mlToGallons,
	mlToLiters,
} from '@llm-water-tracker/internal/water-calculator';
import { fetchWaterRates } from '@llm-water-tracker/internal/water-rates-fetcher';

const TABLE_COLUMN_COUNT = 13;

export const sessionCommand = define({
	name: 'session',
	description: 'Show Codex token usage grouped by session',
	args: sharedArgs,
	async run(ctx) {
		const jsonOutput = Boolean(ctx.values.json);
		if (jsonOutput) {
			logger.level = 0;
		}

		let since: string | undefined;
		let until: string | undefined;

		try {
			since = normalizeFilterDate(ctx.values.since);
			until = normalizeFilterDate(ctx.values.until);
		} catch (error) {
			logger.error(String(error));
			process.exit(1);
		}

		const { events, missingDirectories } = await loadTokenUsageEvents();

		for (const missing of missingDirectories) {
			logger.warn(`Codex session directory not found: ${missing}`);
		}

		if (events.length === 0) {
			log(
				jsonOutput ? JSON.stringify({ sessions: [], totals: null }) : 'No Codex usage data found.',
			);
			return;
		}

		const waterRates = await fetchWaterRates(Boolean(ctx.values.offline));

		const pricingSource = new CodexPricingSource({
			offline: ctx.values.offline,
		});
		try {
			const rows = await buildSessionReport(events, {
				pricingSource,
				timezone: ctx.values.timezone,
				locale: ctx.values.locale,
				since,
				until,
			});

			if (rows.length === 0) {
				log(
					jsonOutput
						? JSON.stringify({ sessions: [], totals: null })
						: 'No Codex usage data found for provided filters.',
				);
				return;
			}

			const totals = rows.reduce(
				(acc, row) => {
					acc.inputTokens += row.inputTokens;
					acc.cachedInputTokens += row.cachedInputTokens;
					acc.outputTokens += row.outputTokens;
					acc.reasoningOutputTokens += row.reasoningOutputTokens;
					acc.totalTokens += row.totalTokens;
					acc.costUSD += row.costUSD;
					const rowWaterMl = calculateWaterMlForEntry(
						{ inputTokens: row.inputTokens, outputTokens: row.outputTokens, cacheCreationTokens: 0, cacheReadTokens: row.cachedInputTokens },
						Object.keys(row.models),
						waterRates,
					);
					acc.waterLiters += mlToLiters(rowWaterMl);
					acc.waterGallons += mlToGallons(rowWaterMl);
					return acc;
				},
				{
					inputTokens: 0,
					cachedInputTokens: 0,
					outputTokens: 0,
					reasoningOutputTokens: 0,
					totalTokens: 0,
					costUSD: 0,
					waterLiters: 0,
					waterGallons: 0,
				},
			);

			if (jsonOutput) {
				const sessionsWithWater = rows.map((row) => {
					const rowWaterMl = calculateWaterMlForEntry(
						{ inputTokens: row.inputTokens, outputTokens: row.outputTokens, cacheCreationTokens: 0, cacheReadTokens: row.cachedInputTokens },
						Object.keys(row.models),
						waterRates,
					);
					return { ...row, waterLiters: mlToLiters(rowWaterMl), waterGallons: mlToGallons(rowWaterMl) };
				});
				log(
					JSON.stringify(
						{
							sessions: sessionsWithWater,
							totals,
						},
						null,
						2,
					),
				);
				return;
			}

			logger.box(
				`Codex Token Usage Report - Sessions (Timezone: ${ctx.values.timezone ?? DEFAULT_TIMEZONE})`,
			);

			const table: ResponsiveTable = new ResponsiveTable({
				head: [
					'Date',
					'Directory',
					'Session',
					'Models',
					'Input',
					'Output',
					'Reasoning',
					'Cache Read',
					'Total Tokens',
					'Cost (USD)',
					'Water (L)',
					'Water (gal)',
					'Last Activity',
				],
				colAligns: [
					'left',
					'left',
					'left',
					'left',
					'right',
					'right',
					'right',
					'right',
					'right',
					'right',
					'right',
					'right',
					'left',
				],
				compactHead: ['Date', 'Directory', 'Session', 'Input', 'Output', 'Cost (USD)'],
				compactColAligns: ['left', 'left', 'left', 'right', 'right', 'right'],
				compactThreshold: 100,
				forceCompact: ctx.values.compact,
				style: { head: ['cyan'] },
				dateFormatter: (dateStr: string) => formatDateCompact(dateStr),
			});

			const totalsForDisplay = {
				inputTokens: 0,
				outputTokens: 0,
				reasoningTokens: 0,
				cacheReadTokens: 0,
				totalTokens: 0,
				costUSD: 0,
				waterMl: 0,
			};

			for (const row of rows) {
				const split = splitUsageTokens(row);
				totalsForDisplay.inputTokens += split.inputTokens;
				totalsForDisplay.outputTokens += split.outputTokens;
				totalsForDisplay.reasoningTokens += split.reasoningTokens;
				totalsForDisplay.cacheReadTokens += split.cacheReadTokens;
				totalsForDisplay.totalTokens += row.totalTokens;
				totalsForDisplay.costUSD += row.costUSD;

				const dateKey = toDateKey(row.lastActivity, ctx.values.timezone);
				const displayDate = formatDisplayDate(dateKey, ctx.values.locale, ctx.values.timezone);
				const directoryDisplay = row.directory === '' ? '-' : row.directory;
				const sessionFile = row.sessionFile;
				const shortSession = sessionFile.length > 8 ? `…${sessionFile.slice(-8)}` : sessionFile;

				const rowWaterMl = calculateWaterMlForEntry(
					{ inputTokens: row.inputTokens, outputTokens: row.outputTokens, cacheCreationTokens: 0, cacheReadTokens: row.cachedInputTokens },
					Object.keys(row.models),
					waterRates,
				);
				totalsForDisplay.waterMl += rowWaterMl;

				table.push([
					displayDate,
					directoryDisplay,
					shortSession,
					formatModelsDisplayMultiline(formatModelsList(row.models)),
					formatNumber(split.inputTokens),
					formatNumber(split.outputTokens),
					formatNumber(split.reasoningTokens),
					formatNumber(split.cacheReadTokens),
					formatNumber(row.totalTokens),
					formatCurrency(row.costUSD),
					formatWaterLiters(rowWaterMl),
					formatWaterGallons(rowWaterMl),
					formatDisplayDateTime(row.lastActivity, ctx.values.locale, ctx.values.timezone),
				]);
			}

			addEmptySeparatorRow(table, TABLE_COLUMN_COUNT);
			table.push([
				'',
				'',
				pc.yellow('Total'),
				'',
				pc.yellow(formatNumber(totalsForDisplay.inputTokens)),
				pc.yellow(formatNumber(totalsForDisplay.outputTokens)),
				pc.yellow(formatNumber(totalsForDisplay.reasoningTokens)),
				pc.yellow(formatNumber(totalsForDisplay.cacheReadTokens)),
				pc.yellow(formatNumber(totalsForDisplay.totalTokens)),
				pc.yellow(formatCurrency(totalsForDisplay.costUSD)),
				pc.yellow(formatWaterLiters(totalsForDisplay.waterMl)),
				pc.yellow(formatWaterGallons(totalsForDisplay.waterMl)),
				'',
			]);

			log(table.toString());

			if (table.isCompactMode()) {
				logger.info('\nRunning in Compact Mode');
				logger.info(
					'Expand terminal width to see directories, cache metrics, total tokens, and last activity',
				);
			}
		} finally {
			pricingSource[Symbol.dispose]();
		}
	},
});
