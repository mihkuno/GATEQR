
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
		Asset(): "/robots.txt" | "/uploads/1783246685498-u3llsof-image.png" | "/uploads/1783246685505-chb0cs1-My_Birthcertificate.jpg" | "/uploads/1783246685556-b1v8iw4-consent-form.jpg" | "/uploads/1783247102591-npes9o0-image.png" | "/uploads/1783247102594-ubffq9s-IMG_2332.jpg" | "/uploads/1783247102595-3z5sxup-My_Birthcertificate.jpg" | "/uploads/1783250643560-rmlavg5-image.png" | "/uploads/1783250643562-ccaqnoc-IMG_2332.jpg" | "/uploads/1783250643563-3b0rha1-My_Birthcertificate.jpg" | "/uploads/1783252575941-qgz65si-IMG_2332.jpg" | "/uploads/1783252575942-dwsl78x-image.png" | "/uploads/1783252575943-rixgaiy-My_Birthcertificate.jpg" | "/uploads/1783258922524-hblzj33-image.png" | "/uploads/1783258922525-nczl3mp-IMG_2332.jpg" | "/uploads/1783258922527-78waqwi-My_Birthcertificate.jpg" | "/uploads/1783259489075-d6ile9o-image.png" | "/uploads/1783259489077-xopi71e-IMG_2332.jpg" | "/uploads/1783259489091-sxjqk66-consent-form.jpg" | "/uploads/1783260510191-uaasleu-image.png" | "/uploads/1783260510194-dz7z6an-IMG_2332.jpg" | "/uploads/1783260510207-iwmujiu-consent-form.jpg" | "/uploads/1783261393423-lgivguw-image.png" | "/uploads/1783261393424-1hrw1lj-My_Birthcertificate.jpg" | "/uploads/1783261393424-mqa96rd-IMG_2332.jpg" | "/uploads/1783262237870-tpnya09-image.png" | "/uploads/1783262237871-bldjjnh-IMG_2332.jpg" | "/uploads/1783262237872-atut0tg-qr-1-1782467275983.png" | "/uploads/1783263023048-hn639e8-IMG_2332.jpg" | "/uploads/1783263023048-nyvrim7-image.png" | "/uploads/1783263023049-ld7mtvh-My_Birthcertificate.jpg" | "/uploads/gate/guest_in_1783258426013_988d33d3.jpg" | "/uploads/gate/in_1_1783248965977_9b2bd43e.jpg" | "/uploads/gate/in_1_1783249066564_2ffad989.jpg" | "/uploads/gate/in_1_1783250689733_c18637e2.jpg" | "/uploads/gate/in_1_1783258032149_59d85647.jpg" | "/uploads/gate/in_1_1783258081792_66211129.jpg" | "/uploads/gate/in_1_1783258123614_36bce499.jpg" | "/uploads/gate/in_1_1783258184054_f2de27f5.jpg" | "/uploads/gate/in_1_1783258229714_2b6065b4.jpg" | "/uploads/gate/in_1_1783259133162_0ccc444d.jpg" | "/uploads/gate/in_1_1783259230688_67a1fc4a.jpg" | "/uploads/gate/in_1_1783259238338_a1c5af83.jpg" | "/uploads/gate/in_1_1783259433156_79acd947.jpg" | "/uploads/gate/in_1_1783260536199_11c7bf30.jpg" | "/uploads/gate/in_1_1783260562923_52074280.jpg" | "/uploads/gate/in_1_1783260657932_f930b20c.jpg" | "/uploads/gate/in_1_1783261431461_d73b84b8.jpg" | "/uploads/gate/in_1_1783261484046_65ee07f1.jpg" | "/uploads/gate/in_1_1783261962711_9faa4780.jpg" | "/uploads/gate/in_1_1783263046530_83b17ce6.jpg" | "/uploads/gate/in_2_1783259657436_91b7106e.jpg" | "/uploads/gate/in_2_1783262265487_0e8bbff5.jpg" | "/uploads/gate/in_2_1783262325237_01448619.jpg" | "/uploads/gate/in_2_1783262346691_de7a2320.jpg" | "/uploads/gate/in_2_1783262433650_d58de4db.jpg" | "/uploads/gate/out_1_1783249038560_cc980b19.jpg" | "/uploads/gate/out_1_1783258145907_b1ffb8d1.jpg" | "/uploads/gate/out_1_1783258192049_c648dea5.jpg" | "/uploads/gate/out_1_1783258284865_85d3b79f.jpg" | "/uploads/gate/out_1_1783258311734_701c9011.jpg" | "/uploads/gate/out_1_1783258317803_ea7e8e98.jpg" | "/uploads/gate/out_1_1783259172187_0b535183.jpg" | "/uploads/gate/out_1_1783259267139_c37e906a.jpg" | "/uploads/gate/out_1_1783260596035_074e277e.jpg" | "/uploads/gate/out_1_1783260629089_5176fd26.jpg" | "/uploads/gate/out_1_1783261456556_7a400c53.jpg" | "/uploads/gate/out_1_1783261898771_7c6e4de8.jpg" | "/uploads/gate/out_2_1783259513467_de2d10b1.jpg" | "/uploads/gate/out_2_1783259562424_13164cb3.jpg" | "/uploads/gate/out_2_1783259691111_90d76f38.jpg" | "/uploads/gate/out_2_1783262293312_675d78db.jpg" | "/uploads/gate/out_2_1783262371331_349a430c.jpg" | "/uploads/gate/out_2_1783262390722_c6a05f1f.jpg" | "/uploads/qr-1-1783247139600.png" | "/uploads/qr-1-1783250658070.png" | "/uploads/qr-1-1783252591762.png" | "/uploads/qr-1-1783258932895.png" | "/uploads/qr-1-1783260519039.png" | "/uploads/qr-1-1783261403711.png" | "/uploads/qr-1-1783263032246.png" | "/uploads/qr-2-1783259499608.png" | "/uploads/qr-2-1783262246736.png" | string & {};
	}
}