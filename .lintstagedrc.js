export default {
	"apps/amp/**/*.{js,ts,mts,cjs,mjs,json}": "pnpm --filter ./apps/amp exec eslint --fix --cache",
	"apps/claude/**/*.{js,ts,mts,cjs,mjs,json}": "pnpm --filter ./apps/claude exec eslint --fix --cache",
	"apps/codex/**/*.{js,ts,mts,cjs,mjs,json}": "pnpm --filter ./apps/codex exec eslint --fix --cache",
	"apps/mcp/**/*.{js,ts,mts,cjs,mjs,json}": "pnpm --filter ./apps/mcp exec eslint --fix --cache",
	"apps/opencode/**/*.{js,ts,mts,cjs,mjs,json}": "pnpm --filter ./apps/opencode exec eslint --fix --cache",
	"apps/pi/**/*.{js,ts,mts,cjs,mjs,json}": "pnpm --filter ./apps/pi exec eslint --fix --cache",
	"packages/internal/**/*.{js,ts,mts,cjs,mjs,json}": "pnpm --filter ./packages/internal exec eslint --fix --cache",
	"packages/terminal/**/*.{js,ts,mts,cjs,mjs,json}": "pnpm --filter ./packages/terminal exec eslint --fix --cache",
	"*.{js,ts,mts,cjs,mjs,json}": "eslint --fix --cache"
};
