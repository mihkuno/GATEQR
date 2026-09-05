
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const DATABASE_URL: string;
	export const GATE_API_KEY: string;
	export const JWT_SECRET: string;
	export const OSA_EMAIL: string;
	export const QR_EXPIRY_MONTHS: string;
	export const REFRESH_JWT_SECRET: string;
	export const SECURITY_EMAIL: string;
	export const SMTP_HOST: string;
	export const SMTP_PASS: string;
	export const SMTP_PORT: string;
	export const SMTP_USER: string;
	export const PYTHON_BASIC_REPL: string;
	export const USER: string;
	export const npm_config_user_agent: string;
	export const GIT_ASKPASS: string;
	export const npm_node_execpath: string;
	export const SHLVL: string;
	export const HOME: string;
	export const OLDPWD: string;
	export const LESS: string;
	export const ANTIGRAVITY_CLI_ALIAS: string;
	export const TERM_PROGRAM_VERSION: string;
	export const VSCODE_IPC_HOOK_CLI: string;
	export const npm_package_json: string;
	export const ZSH: string;
	export const LSCOLORS: string;
	export const PAGER: string;
	export const VSCODE_GIT_ASKPASS_MAIN: string;
	export const FNM_ARCH: string;
	export const VSCODE_GIT_ASKPASS_NODE: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const WSL_DISTRO_NAME: string;
	export const COLORTERM: string;
	export const WAYLAND_DISPLAY: string;
	export const FNM_VERSION_FILE_STRATEGY: string;
	export const FNM_LOGLEVEL: string;
	export const LOGNAME: string;
	export const pnpm_config_verify_deps_before_run: string;
	export const NAME: string;
	export const WSL_INTEROP: string;
	export const PULSE_SERVER: string;
	export const _: string;
	export const FNM_NODE_DIST_MIRROR: string;
	export const TERM: string;
	export const npm_config_node_gyp: string;
	export const PATH: string;
	export const npm_package_name: string;
	export const NODE: string;
	export const XDG_RUNTIME_DIR: string;
	export const DISPLAY: string;
	export const LANG: string;
	export const PYTHONSTARTUP: string;
	export const LS_COLORS: string;
	export const FNM_DIR: string;
	export const TERM_PROGRAM: string;
	export const VSCODE_GIT_IPC_HANDLE: string;
	export const npm_lifecycle_script: string;
	export const FNM_RESOLVE_ENGINES: string;
	export const SHELL: string;
	export const npm_package_version: string;
	export const npm_lifecycle_event: string;
	export const NODE_PATH: string;
	export const VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
	export const VSCODE_NONCE: string;
	export const PWD: string;
	export const FNM_MULTISHELL_PATH: string;
	export const npm_execpath: string;
	export const npm_command: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const FNM_COREPACK_ENABLED: string;
	export const WSL2_GUI_APPS_ENABLED: string;
	export const HOSTTYPE: string;
	export const PNPM_HOME: string;
	export const WSLENV: string;
	export const INIT_CWD: string;
	export const NODE_ENV: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		DATABASE_URL: string;
		GATE_API_KEY: string;
		JWT_SECRET: string;
		OSA_EMAIL: string;
		QR_EXPIRY_MONTHS: string;
		REFRESH_JWT_SECRET: string;
		SECURITY_EMAIL: string;
		SMTP_HOST: string;
		SMTP_PASS: string;
		SMTP_PORT: string;
		SMTP_USER: string;
		PYTHON_BASIC_REPL: string;
		USER: string;
		npm_config_user_agent: string;
		GIT_ASKPASS: string;
		npm_node_execpath: string;
		SHLVL: string;
		HOME: string;
		OLDPWD: string;
		LESS: string;
		ANTIGRAVITY_CLI_ALIAS: string;
		TERM_PROGRAM_VERSION: string;
		VSCODE_IPC_HOOK_CLI: string;
		npm_package_json: string;
		ZSH: string;
		LSCOLORS: string;
		PAGER: string;
		VSCODE_GIT_ASKPASS_MAIN: string;
		FNM_ARCH: string;
		VSCODE_GIT_ASKPASS_NODE: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		WSL_DISTRO_NAME: string;
		COLORTERM: string;
		WAYLAND_DISPLAY: string;
		FNM_VERSION_FILE_STRATEGY: string;
		FNM_LOGLEVEL: string;
		LOGNAME: string;
		pnpm_config_verify_deps_before_run: string;
		NAME: string;
		WSL_INTEROP: string;
		PULSE_SERVER: string;
		_: string;
		FNM_NODE_DIST_MIRROR: string;
		TERM: string;
		npm_config_node_gyp: string;
		PATH: string;
		npm_package_name: string;
		NODE: string;
		XDG_RUNTIME_DIR: string;
		DISPLAY: string;
		LANG: string;
		PYTHONSTARTUP: string;
		LS_COLORS: string;
		FNM_DIR: string;
		TERM_PROGRAM: string;
		VSCODE_GIT_IPC_HANDLE: string;
		npm_lifecycle_script: string;
		FNM_RESOLVE_ENGINES: string;
		SHELL: string;
		npm_package_version: string;
		npm_lifecycle_event: string;
		NODE_PATH: string;
		VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
		VSCODE_NONCE: string;
		PWD: string;
		FNM_MULTISHELL_PATH: string;
		npm_execpath: string;
		npm_command: string;
		PNPM_SCRIPT_SRC_DIR: string;
		FNM_COREPACK_ENABLED: string;
		WSL2_GUI_APPS_ENABLED: string;
		HOSTTYPE: string;
		PNPM_HOME: string;
		WSLENV: string;
		INIT_CWD: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
