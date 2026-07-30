import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch }) => {
    if (!locals.user || (locals.user.role !== 'osa' && locals.user.role !== 'security')) {
        throw redirect(303, '/login');
    }

    try {
        const [statsRes, logsRes] = await Promise.all([
            fetch('/api/gate/stats'),
            fetch('/api/gate/logs?limit=25&page=1'),
        ]);
        
        let stats = { currentlyIn: 0, visitsToday: 0, registeredIn: 0, guestsIn: 0, anomaliesToday: 0 };
        let hourlyChart: number[] = [];
        let roleBreakdown: Record<string, number> = { student: 0, employee: 0, visitor: 0, concessionaire: 0, guest: 0 };
        let logs: any[] = [];
        let total = 0, page = 1, totalPages = 1;

        if (statsRes.ok) {
            const data = await statsRes.json();
            stats = data.stats || stats;
            hourlyChart = data.hourlyChart || [];
            roleBreakdown = data.roleBreakdown || roleBreakdown;
        }
        
        if (logsRes.ok) {
            const data = await logsRes.json();
            logs = data.logs || [];
            total = data.total ?? 0;
            page = data.page ?? 1;
            totalPages = data.totalPages ?? 1;
        }

        return { stats, logs, hourlyChart, roleBreakdown, total, page, totalPages, userRole: locals.user.role };
    } catch (e) {
        console.error('Failed to load dashboard data:', e);
        return {
            stats: { currentlyIn: 0, visitsToday: 0, registeredIn: 0, guestsIn: 0, anomaliesToday: 0 },
            logs: [],
            hourlyChart: [],
            roleBreakdown: { student: 0, employee: 0, visitor: 0, concessionaire: 0, guest: 0 },
            total: 0, page: 1, totalPages: 1,
            userRole: locals.user.role
        };
    }
};
