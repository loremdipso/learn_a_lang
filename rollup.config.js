import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import scss from 'rollup-plugin-scss';
import replace from "@rollup/plugin-replace";
import smelte from 'smelte/rollup-plugin-smelte';

const production = !process.env.ROLLUP_WATCH;

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

export default {
	input: 'src/main.ts',
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
		file: 'docs/build/bundle.js'
	},
	plugins: [
		replace({
			'isDebug': !production,
			preventAssignment: true
		}),

		svelte({
			preprocess: sveltePreprocess({ sourceMap: !production }),
			compilerOptions: {
				// enable run-time checks when not in production
				dev: !production
			}
		}),

		scss({
			output: 'docs/build/bundle.css',
			failOnError: true,
			exclude: ['**/global.css', '**/tailwind.css']
		}),

		smelte({
			purge: production,
			output: "docs/global.css", // it defaults to static/global.css which is probably what you expect in Sapper
			postcss: [], // Your PostCSS plugins
			whitelist: [], // Array of classnames whitelisted from purging
			whitelistPatterns: [
				// /dark.bg-/,
				/^bg-/,
			], // Same as above, but list of regexes
			whitelistPatternsChildren: [],
			tailwind: {
				colors: {
					primary: "#018786",
					secondary: "#7141ac",
					error: "#cf6679",
					success: "#4caf50",
					alert: "#ff3f80",
					blue: "#2196f3",
					dark: "#212121"
				}, // Object of colors to generate a palette from, and then all the utility classes
				// darkMode: true,
			},
			// Any other props will be applied on top of default Smelte tailwind.config.js
		}),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: true,
			dedupe: ['svelte']
		}),
		commonjs(),
		typescript({
			sourceMap: !production,
			inlineSources: !production
		}),

		// In dev mode, call `npm run start` once
		// the bundle has been generated
		!production && serve(),

		// Watch the `docs` directory and refresh the
		// browser on changes when not in production
		!production && livereload('docs'),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && terser()
	],
	watch: {
		clearScreen: false
	}
};
