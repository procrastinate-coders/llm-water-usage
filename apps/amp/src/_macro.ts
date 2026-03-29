import type { LiteLLMModelPricing } from '@llm-water-tracker/internal/pricing';
import {
	createPricingDataset,
	fetchLiteLLMPricingDataset,
	filterPricingDataset,
} from '@llm-water-tracker/internal/pricing-fetch-utils';

const AMP_MODEL_PREFIXES = ['claude-', 'anthropic/'];

function isAmpModel(modelName: string): boolean {
	return AMP_MODEL_PREFIXES.some((prefix) => modelName.startsWith(prefix));
}

export async function prefetchAmpPricing(): Promise<Record<string, LiteLLMModelPricing>> {
	try {
		const dataset = await fetchLiteLLMPricingDataset();
		return filterPricingDataset(dataset, isAmpModel);
	} catch (error) {
		console.warn('Failed to prefetch Amp pricing data, proceeding with empty cache.', error);
		return createPricingDataset();
	}
}
