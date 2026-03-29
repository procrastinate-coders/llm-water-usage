import tseslint from 'typescript-eslint';

export default tseslint.config(
	...tseslint.configs.recommended,
	{
		ignores: ['apps/**', 'packages/**', 'node_modules/**', '.claude/**'],
	},
);
