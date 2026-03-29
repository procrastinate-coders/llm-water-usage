/**
 * @fileoverview Water consumption calculation utilities for LLM usage
 *
 * Based on research: "Making AI Less Thirsty" (Saraj et al., 2023)
 * Estimate: ~500ml per 50,000 inference tokens (0.01 ml/token baseline for Sonnet)
 * @see https://arxiv.org/abs/2304.03271
 */

export type WaterRates = {
	version: number;
	updated: string;
	source: string;
	sourceUrl: string;
	baseMlPerToken: number;
	modelMultipliers: Record<string, number>;
	cacheReadMultiplier: number;
};

export const DEFAULT_WATER_RATES: WaterRates = {
	version: 1,
	updated: '2026-03-29',
	source: 'Making AI Less Thirsty (Saraj et al., 2023) — 500ml per 50,000 tokens inference estimate',
	sourceUrl: 'https://arxiv.org/abs/2304.03271',
	baseMlPerToken: 0.01,
	modelMultipliers: {
		haiku: 0.5,
		sonnet: 1.0,
		opus: 2.0,
		'gpt-4o-mini': 0.5,
		'gpt-4o': 1.0,
		o1: 2.0,
		o3: 2.0,
		'gpt-5': 1.0,
	},
	cacheReadMultiplier: 0.1,
};

/**
 * Gets the model multiplier for water calculation based on the model name.
 * Larger models use more compute, hence more water.
 */
function getModelMultiplier(model: string, rates: WaterRates): number {
	const lowerModel = model.toLowerCase();
	const matchedKey = Object.keys(rates.modelMultipliers).find((key) =>
		lowerModel.includes(key.toLowerCase()),
	);
	return matchedKey != null ? (rates.modelMultipliers[matchedKey] ?? 1.0) : 1.0;
}

/**
 * Calculates water consumption in milliliters for a given set of token counts and model.
 *
 * Cache read tokens use a reduced multiplier (0.1x) because KV cache hits
 * require minimal compute — the heavy lifting was done at cache creation time.
 */
export function calculateWaterMl(
	tokens: {
		inputTokens: number;
		outputTokens: number;
		cacheCreationTokens: number;
		cacheReadTokens: number;
	},
	model: string,
	rates: WaterRates,
): number {
	const multiplier = getModelMultiplier(model, rates);
	const computeTokens = tokens.inputTokens + tokens.outputTokens + tokens.cacheCreationTokens;
	const cachedTokens = tokens.cacheReadTokens;
	return (
		computeTokens * rates.baseMlPerToken * multiplier +
		cachedTokens * rates.baseMlPerToken * rates.cacheReadMultiplier * multiplier
	);
}

/**
 * Calculates water consumption for aggregated data where modelsUsed is a list
 * and tokens are already totalled. Uses the average multiplier across all models.
 */
export function calculateWaterMlForEntry(
	tokens: {
		inputTokens: number;
		outputTokens: number;
		cacheCreationTokens: number;
		cacheReadTokens: number;
	},
	modelsUsed: string[],
	rates: WaterRates,
): number {
	if (modelsUsed.length === 0) {
		return calculateWaterMl(tokens, '', rates);
	}
	// Average multiplier across all models used
	const avgMultiplier =
		modelsUsed.reduce((sum, model) => sum + getModelMultiplier(model, rates), 0) /
		modelsUsed.length;
	const computeTokens = tokens.inputTokens + tokens.outputTokens + tokens.cacheCreationTokens;
	const cachedTokens = tokens.cacheReadTokens;
	return (
		computeTokens * rates.baseMlPerToken * avgMultiplier +
		cachedTokens * rates.baseMlPerToken * rates.cacheReadMultiplier * avgMultiplier
	);
}

/** Convert milliliters to liters */
export function mlToLiters(ml: number): number {
	return ml / 1000;
}

/** Convert milliliters to US gallons */
export function mlToGallons(ml: number): number {
	return ml * 0.000264172;
}

/** Format water in liters with 4 decimal places */
export function formatWaterLiters(ml: number): string {
	return `${mlToLiters(ml).toFixed(4)} L`;
}

/** Format water in gallons with 6 decimal places */
export function formatWaterGallons(ml: number): string {
	return `${mlToGallons(ml).toFixed(6)} gal`;
}
