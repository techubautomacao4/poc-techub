import ICAL from 'ical.js';
import { addMinutes, addDays, format, isSameDay, parse, startOfDay, isWithinInterval, areIntervalsOverlapping, isWeekend } from 'date-fns';

export interface CalendarEvent {
    title: string;
    start: Date;
    end: Date;
    analystId: string;
    source: 'ICS' | 'POC';
}

export interface Analyst {
    id: string;
    name: string;
    icsUrls: string[];
}

export interface DayAvailability {
    date: Date;
    status: 'AVAILABLE' | 'UNAVAILABLE' | 'WEEKEND'; // Green (Available) or Gray (Unavailable/Weekend)
    availableAnalystsCount: number;
}

// Mock analysts for now until we have DB support for ICS URLs
export const MOCK_ANALYSTS: Analyst[] = [
    { id: '1', name: 'Analyst A', icsUrls: [] },
    { id: '2', name: 'Analyst B', icsUrls: [] },
    { id: '3', name: 'Analyst C', icsUrls: [] },
    { id: '4', name: 'Analyst D', icsUrls: [] },
    { id: '5', name: 'Analyst E', icsUrls: [] },
];

export const WORK_START_HOUR = 8;
export const WORK_END_HOUR = 18;
export const REQUIRED_CONTINUOUS_HOURS = 6;
export const REQUIRED_ANALYSTS_COUNT = 2;

export const parseICS = async (icsUrl: string, analystId: string): Promise<CalendarEvent[]> => {
    try {
        // In a real app, we might need a proxy to avoid CORS
        // const response = await fetch(icsUrl);
        // const data = await response.text();

        // Mocking fetching data for demonstration
        const data = ''; // Placeholder
        if (!data) return [];

        const jcalData = ICAL.parse(data);
        const comp = new ICAL.Component(jcalData);
        const vevents = comp.getAllSubcomponents('vevent');

        return vevents.map(vevent => {
            const event = new ICAL.Event(vevent);
            return {
                title: event.summary,
                start: event.startDate.toJSDate(),
                end: event.endDate.toJSDate(),
                analystId,
                source: 'ICS'
            };
        });
    } catch (error) {
        console.error(`Error parsing ICS for ${analystId}:`, error);
        return [];
    }
};

export const checkDayAvailability = (date: Date, allEvents: CalendarEvent[], analysts: Analyst[]): DayAvailability => {
    if (isWeekend(date)) {
        return { date, status: 'WEEKEND', availableAnalystsCount: 0 };
    }

    const dayStart = new Date(date);
    dayStart.setHours(WORK_START_HOUR, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(WORK_END_HOUR, 0, 0, 0);

    // We need to find if there is ANY 6-hour block where at least 2 analysts are available.
    // Algorithm:
    // 1. Discretize the day into minutes or small chunks (e.g., 15 mins).
    // ... Or better: check purely based on intervals.

    // Let's iterate through potential start times for a 6-hour block.
    // Start times: 08:00, 08:15, ..., up to (18:00 - 6 hours) = 12:00.

    let hasValidSlot = false;
    let maxAnalystsAvailable = 0;

    // Iterate every 30 minutes from WORK_START_HOUR up to 12:00 (latest start for a 6h block)
    for (let hour = WORK_START_HOUR; hour <= (WORK_END_HOUR - REQUIRED_CONTINUOUS_HOURS); hour += 0.5) {
        const slotStart = new Date(date);
        slotStart.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

        const slotEnd = addMinutes(slotStart, REQUIRED_CONTINUOUS_HOURS * 60);

        // Count available analysts for this SPECIFIC slot
        let availableAnalysts = 0;

        for (const analyst of analysts) {
            // Find events for this analyst that overlap with this slot
            const analystEvents = allEvents.filter(e => e.analystId === analyst.id);
            const isBusy = analystEvents.some(event => {
                return areIntervalsOverlapping(
                    { start: slotStart, end: slotEnd },
                    { start: event.start, end: event.end }
                );
            });

            if (!isBusy) {
                availableAnalysts++;
            }
        }

        if (availableAnalysts > maxAnalystsAvailable) {
            maxAnalystsAvailable = availableAnalysts;
        }

        if (availableAnalysts >= REQUIRED_ANALYSTS_COUNT) {
            hasValidSlot = true;
            break; // Found a valid slot, day is available
        }
    }

    return {
        date,
        status: hasValidSlot ? 'AVAILABLE' : 'UNAVAILABLE',
        availableAnalystsCount: maxAnalystsAvailable
    };
};
