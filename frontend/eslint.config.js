import js from '@eslint/js'
import globals from "globals"
const { node } = globals
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{ ignores: ['dist'] },
	{
		extends: [
			js.configs.recommended,
			...tseslint.configs.recommended],
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
			// parser: tsparser,
		},

		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
			// "@typescript-eslint": tseslint,
			// "unused-imports": unusedImports,

		},


		rules: {
			...reactHooks.configs.recommended.rules,
			"react-hooks/exhaustive-deps": "off",

			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true },
			],

			// // Disable the default no-unused-vars as we use unused-imports plugin
			"no-unused-vars": "warn",
			"@typescript-eslint/no-unused-vars": "warn",
			"no-unused-imports": "warn",
			"@typescript-eslint/no-unused-imports": "warn",
			// "@typescript-eslint/no-unused-vars": "off",
			// // "react-hooks/exhaustive-deps": "off",

			// // Enable unused-imports plugin to auto remove unused imports and vars
			// "unused-imports/no-unused-imports": "error",
			// "unused-imports/no-unused-vars": [
			// 	"warn",
			// 	{
			// 		vars: "all",
			// 		varsIgnorePattern: "^_",
			// 		args: "after-used",
			// 		argsIgnorePattern: "^_",
			// 	},
			// ],

			"@typescript-eslint/no-explicit-any": "off", // turn off warning for 'any'

			// Other style rules
			'quotes': ['warn', 'double', { avoidEscape: true }],
			'semi': ['error', 'never'],
			'indent': ['warn', 'tab', { "SwitchCase": 1 }]
		},


	},
)
