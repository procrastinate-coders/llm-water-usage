/**
 * @fileoverview Water rates fetcher with caching and offline fallback
 *
 * Fetches water rates JSON from the GitHub repository so that rate updates
 * can be deployed without publishing a new npm package.
 * Falls back to the hardcoded defaults when offline or on fetch failure.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_WATER_RATES } from './water-calculator.ts';
import type { WaterRates } from './water-calculator.ts';

const WATER_RATES_URL =
	'https://raw.githubusercontent.com/Antigravity822/llm-water-tracker/main/water-rates.json';
const CACHE_DIR = path.join(os.homedir(), '.config', 'llm-water-tracker');
const CACHE_FILE = path.join(CACHE_DIR, 'rates-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 2000; // 2 second timeout

type CachedRates = {
	fetchedAt: number;
	rates: WaterRates;
};

function readCache(): WaterRates | null {
	try {
		const raw = fs.readFileSync(CACHE_FILE, 'utf8');
		const cached = JSON.parse(raw) as CachedRates;
		if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
			return cached.rates;
		}
	} catch {
		// Cache miss or corrupt — proceed to fetch
	}
	return null;
}

function writeCache(rates: WaterRates): void {
	try {
		fs.mkdirSync(CACHE_DIR, { recursive: true });
		const cached: CachedRates = { fetchedAt: Date.now(), rates };
		fs.writeFileSync(CACHE_FILE, JSON.stringify(cached, null, 2), 'utf8');
	} catch {
		// Non-critical — best effort write
	}
}

/**
 * Fetches the latest water rates.
 * - If `offline` is true, returns cached rates or fallback.
 * - Otherwise, tries to fetch from GitHub with a 2s timeout.
 * - On failure, returns cached rates or the hardcoded fallback.
 */
export async function fetchWaterRates(offline = false): Promise<WaterRates> {
	// Always check cache first
	const cached = readCache();

	if (offline) {
		return cached ?? DEFAULT_WATER_RATES;
	}

	// Try fetching fresh rates
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => {
			controller.abort();
		}, FETCH_TIMEOUT_MS);

		const response = await fetch(WATER_RATES_URL, { signal: controller.signal });
		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const rates = (await response.json()) as WaterRates;

		// Validate essential fields
		if (
			typeof rates.baseMlPerToken !== 'number' ||
			typeof rates.modelMultipliers !== 'object' ||
			typeof rates.cacheReadMultiplier !== 'number'
		) {
			throw new Error('Invalid rates schema');
		}

		writeCache(rates);
		return rates;
	} catch {
		// Fetch failed — use cache if available, otherwise fallback
		return cached ?? DEFAULT_WATER_RATES;
	}
}
