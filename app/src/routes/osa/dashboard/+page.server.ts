import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch }) => {
    if (!locals.user || locals.user.role !== 'osa') {
        throw redirect(303, '/login');
    }

    try {
        const statsRes = await fetch('/api/gate/stats');
        const logsRes = await fetch('/api/gate/logs');
        
        let stats = { currentlyIn: 0, visitsToday: 0 };
        let hourlyChart = [];
        let logs = [];

        if (statsRes.ok) {
            const data = await statsRes.json();
            stats = data.stats || stats;
            hourlyChart = data.hourlyChart || [];
        }
        
        if (logsRes.ok) {
            const data = await logsRes.json();
            logs = data.logs || [];
        }

        return { stats, logs, hourlyChart };
    } catch (e) {
        console.error('Failed to load dashboard data:', e);
        return {
            stats: { currentlyIn: 0, visitsToday: 0 },
            logs: [],
            hourlyChart: []
        };
    }
};
