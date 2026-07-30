
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/apply" | "/api/auth" | "/api/auth/login" | "/api/auth/logout" | "/api/auth/verify" | "/api/dean" | "/api/dean/applications" | "/api/departments" | "/api/gate" | "/api/gate/entry" | "/api/gate/exit" | "/api/gate/logs" | "/api/gate/lookup" | "/api/gate/manual" | "/api/gate/stats" | "/api/osa" | "/api/osa/applications" | "/dean" | "/entry" | "/login" | "/osa" | "/osa/dashboard" | "/osa/departments" | "/otp" | "/status";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/api": Record<string, never>;
			"/api/apply": Record<string, never>;
			"/api/auth": Record<string, never>;
			"/api/auth/login": Record<string, never>;
			"/api/auth/logout": Record<string, never>;
			"/api/auth/verify": Record<string, never>;
			"/api/dean": Record<string, never>;
			"/api/dean/applications": Record<string, never>;
			"/api/departments": Record<string, never>;
			"/api/gate": Record<string, never>;
			"/api/gate/entry": Record<string, never>;
			"/api/gate/exit": Record<string, never>;
			"/api/gate/logs": Record<string, never>;
			"/api/gate/lookup": Record<string, never>;
			"/api/gate/manual": Record<string, never>;
			"/api/gate/stats": Record<string, never>;
			"/api/osa": Record<string, never>;
			"/api/osa/applications": Record<string, never>;
			"/dean": Record<string, never>;
			"/entry": Record<string, never>;
			"/login": Record<string, never>;
			"/osa": Record<string, never>;
			"/osa/dashboard": Record<string, never>;
			"/osa/departments": Record<string, never>;
			"/otp": Record<string, never>;
			"/status": Record<string, never>
		};
		Pathname(): "/" | "/api/apply" | "/api/auth/login" | "/api/auth/logout" | "/api/auth/verify" | "/api/dean/applications" | "/api/departments" | "/api/gate/entry" | "/api/gate/exit" | "/api/gate/logs" | "/api/gate/lookup" | "/api/gate/manual" | "/api/gate/stats" | "/api/osa/applications" | "/dean" | "/entry" | "/login" | "/osa" | "/osa/dashboard" | "/osa/departments" | "/otp" | "/status";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | "/uploads/1785383300996-2js0obc-Cainday.png" | "/uploads/1785383300996-6b6n5jv-Screenshot__23_.png" | "/uploads/1785383300998-nsuelbs-Screenshot__1_.png" | "/uploads/1785385643087-xrpqmrw-Cainday.png" | "/uploads/1785385643088-s7bpbvj-Cainday.png" | "/uploads/1785385643090-vr0xd2g-Screenshot__1_.png" | "/uploads/1785385840230-nm1o5dd-Cainday.png" | "/uploads/1785385840230-wb9luiw-Cainday.png" | "/uploads/1785385840231-6ih9fhf-Cainday.png" | "/uploads/qr-1-1785385470270.png" | string & {};
	}
}