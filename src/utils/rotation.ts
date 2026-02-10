import { supabase } from '../lib/supabase';
import { MOCK_ANALYSTS } from './calendar';

export const findAvailableAnalyst = async (_date: string, _durationHours: number): Promise<string | null> => {
    // 1. Get all analysts (active)
    const { data: analysts, error } = await (supabase.from('analysts') as any)
        .select('id, name')
        .eq('active', true);

    if (error || !analysts || analysts.length === 0) {
        // Fallback to mock if DB is empty for demo
        return MOCK_ANALYSTS[0].id;
    }

    // 2. Check load (active POCs) for each analyst
    // Since we don't have end_date in the schema provided earlier (only scheduled_date + duration), 
    // we might just count recent assignments.
    const { data: activePocs } = await (supabase.from('pocs') as any)
        .select('assigned_analyst_id')
        .gte('scheduled_date', new Date().toISOString().split('T')[0]);

    const analystLoad: Record<string, number> = {};
    (analysts as any[]).forEach(a => analystLoad[a.id] = 0);

    (activePocs as any[])?.forEach(poc => {
        if (poc.assigned_analyst_id) {
            analystLoad[poc.assigned_analyst_id] = (analystLoad[poc.assigned_analyst_id] || 0) + 1;
        }
    });

    // 3. Sort analysts by load (ascending)
    const sortedAnalysts = (analysts as any[]).sort((a, b) => {
        return (analystLoad[a.id] || 0) - (analystLoad[b.id] || 0);
    });

    // 4. Return the ID of the first analyst (least loaded)
    return sortedAnalysts[0]?.id || null;
};
