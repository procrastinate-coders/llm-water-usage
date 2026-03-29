#!/usr/bin/env node

/**
 * @fileoverview Main entry point for llm-water-tracker CLI tool
 *
 * This is the main entry point for the llm-water-tracker command-line interface tool.
 * It provides analysis of Claude Code usage data from local JSONL files.
 *
 * @module index
 */

import { run } from './commands/index.ts';

await run();
