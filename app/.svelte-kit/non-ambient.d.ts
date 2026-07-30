
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
		RouteId(): "/" | "/api" | "/api/apply" | "/api/auth" | "/api/auth/login" | "/api/auth/logout" | "/api/auth/verify" | "/api/complaints" | "/api/complaints/[id]" | "/api/dean" | "/api/dean/applications" | "/api/departments" | "/api/gate" | "/api/gate/entry" | "/api/gate/exit" | "/api/gate/logs" | "/api/gate/lookup" | "/api/gate/manual" | "/api/gate/stats" | "/api/osa" | "/api/osa/applications" | "/complaints" | "/dean" | "/entry" | "/login" | "/osa" | "/osa/complaints" | "/osa/dashboard" | "/osa/departments" | "/otp" | "/status";
		RouteParams(): {
			"/api/complaints/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string | undefined };
			"/api": { id?: string | undefined };
			"/api/apply": Record<string, never>;
			"/api/auth": Record<string, never>;
			"/api/auth/login": Record<string, never>;
			"/api/auth/logout": Record<string, never>;
			"/api/auth/verify": Record<string, never>;
			"/api/complaints": { id?: string | undefined };
			"/api/complaints/[id]": { id: string };
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
			"/complaints": Record<string, never>;
			"/dean": Record<string, never>;
			"/entry": Record<string, never>;
			"/login": Record<string, never>;
			"/osa": Record<string, never>;
			"/osa/complaints": Record<string, never>;
			"/osa/dashboard": Record<string, never>;
			"/osa/departments": Record<string, never>;
			"/otp": Record<string, never>;
			"/status": Record<string, never>
		};
		Pathname(): "/" | "/api/apply" | "/api/auth/login" | "/api/auth/logout" | "/api/auth/verify" | "/api/complaints" | `/api/complaints/${string}` & {} | "/api/dean/applications" | "/api/departments" | "/api/gate/entry" | "/api/gate/exit" | "/api/gate/logs" | "/api/gate/lookup" | "/api/gate/manual" | "/api/gate/stats" | "/api/osa/applications" | "/complaints" | "/dean" | "/entry" | "/login" | "/osa" | "/osa/complaints" | "/osa/dashboard" | "/osa/departments" | "/otp" | "/status";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | "/uploads/1785383300996-2js0obc-Cainday.png" | "/uploads/1785383300996-6b6n5jv-Screenshot__23_.png" | "/uploads/1785383300998-nsuelbs-Screenshot__1_.png" | "/uploads/1785385643087-xrpqmrw-Cainday.png" | "/uploads/1785385643088-s7bpbvj-Cainday.png" | "/uploads/1785385643090-vr0xd2g-Screenshot__1_.png" | "/uploads/1785385840230-nm1o5dd-Cainday.png" | "/uploads/1785385840230-wb9luiw-Cainday.png" | "/uploads/1785385840231-6ih9fhf-Cainday.png" | "/uploads/1785388702906-0wle14p-Screenshot__10_.png" | "/uploads/1785388702906-ubzebw2-Cainday.png" | "/uploads/1785388702907-lbkhmrv-Screenshot__1_.png" | "/uploads/1785388878168-edrtv6o-Screenshot__10_.png" | "/uploads/1785388878168-jyrci3b-Cainday.png" | "/uploads/1785388878169-w34ihpa-Screenshot__1_.png" | "/uploads/1785389031381-ez8wu7v-Screenshot__10_.png" | "/uploads/1785389031382-58qyxy8-Cainday.png" | "/uploads/1785389031383-0j9tw1a-Screenshot__1_.png" | "/uploads/1785389237141-k033rgk-Cainday.png" | "/uploads/1785389237142-gdmym98-Cainday.png" | "/uploads/1785389237142-nx557wx-Cainday.png" | "/uploads/1785400834143-33sek0e-Cainday.png" | "/uploads/1785400834143-901fh5b-Cainday.png" | "/uploads/1785400834143-dwx1naw-Cainday.png" | "/uploads/qr-1-1785385470270.png" | "/uploads/qr-1-1785405020563.png" | "/uploads/qr-4-1785388901425.png" | "/uploads/qr-5-1785389043772.png" | "/uploads/qr-6-1785389251428.png" | string & {};
	}
}