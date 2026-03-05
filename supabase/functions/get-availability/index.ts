import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
    month: number;
    year: number;
    poc_type_id: string;
    today_iso?: string;
}

interface BusySlot {
    start: Date;
    end: Date;
}

const BRAZIL_OFFSET = -3; // UTC-3

function isBusinessDay(dayOfWeek: number): boolean {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
}

function addBusinessDays(from: Date, n: number): Date {
    const result = new Date(from);
    let added = 0;
    while (added < n) {
        result.setUTCDate(result.getUTCDate() + 1);
        if (isBusinessDay(result.getUTCDay())) added++;
    }
    return result;
}

// Weekday name to UTC day index (0=Sun..6=Sat)
const BYDAY_MAP: Record<string, number> = {
    SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6
};

/**
 * Expands an RRULE recurring event into individual BusySlot occurrences
 * within the given window [windowStart, windowEnd].
 * Supports: FREQ=WEEKLY, FREQ=MONTHLY with BYMONTHDAY, INTERVAL, BYDAY, UNTIL.
 */
function expandRRule(
    dtstart: Date,
    dtend: Date,
    rrule: string,
    windowStart: Date,
    windowEnd: Date
): BusySlot[] {
    const slots: BusySlot[] = [];
    const duration = dtend.getTime() - dtstart.getTime();

    const params: Record<string, string> = {};
    rrule.replace(/^RRULE:/, '').split(';').forEach(part => {
        const [k, v] = part.split('=');
        params[k] = v;
    });

    const freq = params['FREQ'];
    const interval = parseInt(params['INTERVAL'] || '1');
    const until = params['UNTIL']
        ? new Date(params['UNTIL'].replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z'))
        : windowEnd;

    const effectiveUntil = until < windowEnd ? until : windowEnd;

    if (freq === 'WEEKLY') {
        // Parse BYDAY — list of weekday codes e.g. "TH", "MO,TH"
        const byDayNames = params['BYDAY'] ? params['BYDAY'].split(',') : [];
        const byDays = byDayNames.map(d => BYDAY_MAP[d.replace(/[-+\d]/g, '')]).filter(d => d !== undefined);

        // If no BYDAY provided, use the day of dtstart
        const activeDays = byDays.length > 0 ? byDays : [dtstart.getUTCDay()];

        // Walk in weekly intervals; each "week" is from the dtstart week
        let weekAnchor = new Date(dtstart);
        weekAnchor.setUTCHours(0, 0, 0, 0);
        // Set to start of that week (according to the event's week)
        const startDow = dtstart.getUTCDay();
        weekAnchor.setUTCDate(weekAnchor.getUTCDate() - startDow); // go to Sunday of event's week

        const maxIterations = 500; // safety limit
        let iterations = 0;

        while (weekAnchor <= effectiveUntil && iterations < maxIterations) {
            iterations++;
            for (const targetDow of activeDays) {
                // Find the actual day in this week
                const candidate = new Date(weekAnchor);
                candidate.setUTCDate(weekAnchor.getUTCDate() + targetDow);
                // Copy time from dtstart
                candidate.setUTCHours(dtstart.getUTCHours(), dtstart.getUTCMinutes(), dtstart.getUTCSeconds(), 0);

                if (candidate < dtstart) continue; // Before original start
                if (candidate > effectiveUntil) continue;
                if (candidate > windowEnd) continue;
                if (new Date(candidate.getTime() + duration) < windowStart) continue;

                slots.push({
                    start: new Date(candidate),
                    end: new Date(candidate.getTime() + duration)
                });
            }
            // Advance by INTERVAL weeks
            weekAnchor.setUTCDate(weekAnchor.getUTCDate() + (7 * interval));
        }
    } else if (freq === 'MONTHLY') {
        // BYMONTHDAY: repeat on a specific day of every N months
        const byMonthDay = params['BYMONTHDAY'] ? parseInt(params['BYMONTHDAY']) : dtstart.getUTCDate();

        const candidate = new Date(dtstart);
        candidate.setUTCDate(1); // start from 1st of the month

        const maxIterations = 60;
        let iterations = 0;

        while (candidate <= effectiveUntil && iterations < maxIterations) {
            iterations++;
            // Set the target day of this month
            const occurrenceDate = new Date(Date.UTC(
                candidate.getUTCFullYear(),
                candidate.getUTCMonth(),
                byMonthDay,
                dtstart.getUTCHours(),
                dtstart.getUTCMinutes(),
                dtstart.getUTCSeconds()
            ));

            // Make sure this is on or after dtstart, and within window
            if (occurrenceDate >= dtstart && occurrenceDate <= effectiveUntil) {
                const occEnd = new Date(occurrenceDate.getTime() + duration);
                if (occurrenceDate <= windowEnd && occEnd >= windowStart) {
                    slots.push({ start: occurrenceDate, end: occEnd });
                }
            }

            // Advance by interval months
            candidate.setUTCMonth(candidate.getUTCMonth() + interval);
        }
    }

    return slots;
}

/**
 * Parses ICS data and extracts all busy slots, including one-time events
 * and expansions of RRULE recurring events.
 *
 * @param icsData Raw ICS string
 * @param windowStart Expand recurring events starting from this date
 * @param windowEnd   Expand recurring events ending at this date
 */
function parseICS(icsData: string, windowStart: Date, windowEnd: Date): BusySlot[] {
    const slots: BusySlot[] = [];

    // RFC 5545 line unfolding (CRLF/LF + space/tab → single line)
    const unfoldedData = icsData.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");

    const events = unfoldedData.split("BEGIN:VEVENT");

    for (let i = 1; i < events.length; i++) {
        const event = events[i];

        // Match DTSTART (with or without TZID, with or without Z suffix)
        const dtstartMatch = event.match(/DTSTART[;:][^\r\n]*:(\d{8}T\d{6}Z?)/);
        const dtendMatch = event.match(/DTEND[;:][^\r\n]*:(\d{8}T\d{6}Z?)/);
        const rruleMatch = event.match(/RRULE:[^\r\n]+/);

        if (!dtstartMatch || !dtendMatch) continue;

        const parseDate = (str: string, isUTC: boolean) => {
            const y = parseInt(str.substring(0, 4));
            const m = parseInt(str.substring(4, 6)) - 1;
            const d = parseInt(str.substring(6, 8));
            const h = parseInt(str.substring(9, 11));
            const min = parseInt(str.substring(11, 13));
            const s = parseInt(str.substring(13, 15));

            if (isUTC) {
                return new Date(Date.UTC(y, m, d, h, min, s));
            } else {
                // Treat as BRT (UTC-3), convert to UTC
                const localDate = new Date(Date.UTC(y, m, d, h, min, s));
                return new Date(localDate.getTime() - (BRAZIL_OFFSET * 60 * 60 * 1000));
            }
        };

        const rawStart = dtstartMatch[1];
        const rawEnd = dtendMatch[1];
        const isUTC = rawStart.endsWith('Z');

        const dtstart = parseDate(rawStart, isUTC);
        const dtend = parseDate(rawEnd, isUTC);

        if (rruleMatch) {
            // Expand recurring events within the scheduling window
            const expanded = expandRRule(dtstart, dtend, rruleMatch[0], windowStart, windowEnd);
            slots.push(...expanded);
        } else {
            // One-time event: include if it overlaps the window
            if (dtstart <= windowEnd && dtend >= windowStart) {
                slots.push({ start: dtstart, end: dtend });
            }
        }
    }

    return slots;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { month, year, poc_type_id, today_iso } = await req.json() as RequestBody;

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // ── Rule parameters ────────────────────────────────────────────
        const BUSINESS_DAY_BUFFER = 3;
        const MAX_FORWARD_DAYS = 90;

        // Establish today as BRT midnight in UTC
        let todayUTC: Date;
        if (today_iso) {
            const [ty, tm, td] = today_iso.split('-').map(Number);
            todayUTC = new Date(Date.UTC(ty, tm - 1, td, 0, 0, 0));
        } else {
            const now = new Date();
            todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        }

        const earliestBookable = addBusinessDays(todayUTC, BUSINESS_DAY_BUFFER);

        const latestBookable = new Date(todayUTC);
        latestBookable.setUTCDate(latestBookable.getUTCDate() + MAX_FORWARD_DAYS);

        // ── Fetch POC Type ─────────────────────────────────────────────
        const { data: pocType, error: pocError } = await supabaseClient
            .from("poc_types")
            .select("duration_hours, name")
            .eq("id", poc_type_id)
            .single();

        if (pocError) throw pocError;

        const duration = pocType?.duration_hours || 4;
        const pocName = pocType?.name || '';

        // ── Fetch Analysts ─────────────────────────────────────────────
        const { data: analysts, error: analystsError } = await supabaseClient
            .from("analysts")
            .select("*, availability:analyst_availability(*)")
            .eq("active", true);

        if (analystsError) throw analystsError;

        const filteredAnalysts = (analysts || []).filter((a: any) => {
            const tags = a.type_tag ? a.type_tag.split(',').map((s: string) => s.trim()) : [];

            // Backward compatibility for old hardcoded tags
            if (tags.includes('HARDWARE') && pocName === 'Hardware') return true;
            if (tags.includes('HARDWARE_SOFTWARE') && (pocName === 'Hardware + Software' || pocName === 'Hardware')) return true;

            // New logic: check if explicit pocName is checked in their tags
            return tags.includes(pocName);
        });

        if (filteredAnalysts.length === 0) {
            return new Response(JSON.stringify({ error: "No analysts matching criteria" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59));
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));

        // Window for RRULE expansion: include the full month requested
        const rruleWindowStart = todayUTC < startOfMonth ? todayUTC : startOfMonth;
        const rruleWindowEnd = endOfMonth > latestBookable ? latestBookable : endOfMonth;

        const availabilityMap: Record<string, { status: string; analystCount: number }> = {};

        // ── Fetch ICS data for all analysts in parallel ────────────────
        const analystsData = await Promise.all(filteredAnalysts.map(async (analyst: any) => {
            let busySlots: BusySlot[] = [];
            if (analyst.url_ics) {
                try {
                    const resp = await fetch(analyst.url_ics);
                    const icsContent = await resp.text();
                    // Pass the scheduling window so RRULE events are expanded for the right date range
                    busySlots = parseICS(icsContent, rruleWindowStart, rruleWindowEnd);
                } catch (e: any) {
                    console.error(`Failed to load ICS for ${analyst.name}: ${e.message}`);
                }
            }
            return { analyst, busySlots };
        }));

        // ── Calculate availability for each day of the month ──────────
        for (let day = 1; day <= endOfMonth.getUTCDate(); day++) {
            const currentDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
            const dateKey = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getUTCDay();

            // Weekend
            if (!isBusinessDay(dayOfWeek)) {
                availabilityMap[dateKey] = { status: 'UNAVAILABLE', analystCount: 0 };
                continue;
            }

            // Within 3-business-day buffer or in the past
            if (currentDate < earliestBookable) {
                availabilityMap[dateKey] = { status: 'UNAVAILABLE', analystCount: 0 };
                continue;
            }

            // Beyond 90-day horizon
            if (currentDate > latestBookable) {
                availabilityMap[dateKey] = { status: 'UNAVAILABLE', analystCount: 0 };
                continue;
            }

            let availableAnalystsCount = 0;

            for (const { analyst, busySlots } of analystsData) {
                const dayAvailability = analyst.availability?.find(
                    (a: any) => a.day_of_week === dayOfWeek && a.is_active
                );
                if (!dayAvailability) continue;

                const [workH, workM] = dayAvailability.start_time.split(':').map(Number);
                const [endH, endM] = dayAvailability.end_time.split(':').map(Number);

                // Convert work hours from BRT to UTC
                const workStart = new Date(currentDate);
                workStart.setUTCHours(workH - BRAZIL_OFFSET, workM, 0, 0);

                const workEnd = new Date(currentDate);
                workEnd.setUTCHours(endH - BRAZIL_OFFSET, endM, 0, 0);

                // Any meeting during work hours = analyst unavailable for the whole day
                const hasMeetingToday = busySlots.some((busy: BusySlot) =>
                    busy.start < workEnd && busy.end > workStart
                );

                if (hasMeetingToday) continue;

                // Check for a contiguous free gap of 'duration' hours
                let foundGap = false;
                for (
                    let h = workStart.getTime();
                    h <= workEnd.getTime() - (duration * 60 * 60 * 1000);
                    h += 60 * 60 * 1000
                ) {
                    const slotStart = new Date(h);
                    const slotEnd = new Date(h + (duration * 60 * 60 * 1000));

                    const isBusy = busySlots.some((busy: BusySlot) =>
                        slotStart < busy.end && slotEnd > busy.start
                    );

                    if (!isBusy) { foundGap = true; break; }
                }

                if (foundGap) availableAnalystsCount++;
            }

            availabilityMap[dateKey] = {
                status: availableAnalystsCount > 0 ? 'AVAILABLE' : 'UNAVAILABLE',
                analystCount: availableAnalystsCount
            };
        }

        return new Response(JSON.stringify(availabilityMap), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error(`Edge Function Error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
