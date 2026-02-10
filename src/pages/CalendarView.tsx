import React, { useState, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameMonth,
    isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import {
    checkDayAvailability,
    MOCK_ANALYSTS,
    CalendarEvent,
    parseICS,
    DayAvailability
} from '../utils/calendar';

const CalendarView: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [availabilityMap, setAvailabilityMap] = useState<Record<string, DayAvailability>>({});

    useEffect(() => {
        fetchCalendarData();
    }, [currentDate]);

    const fetchCalendarData = async () => {
        setLoading(true);
        // Simulate fetching ICS data for all analysts
        // In a real implementation we would loop through MOCK_ANALYSTS and call parseICS
        // For now, let's generate some mock availability to demonstrate the UI

        await new Promise(resolve => setTimeout(resolve, 1000)); // Fake network delay

        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const days = eachDayOfInterval({ start, end });

        const newMap: Record<string, DayAvailability> = {};

        days.forEach(day => {
            // Mocking the result of checkDayAvailability for visualization
            // In reality, we would pass the accumulated events here.
            // Let's randomize it a bit to show Green/Gray states.

            // This is where the REAL logic from utils/calendar would run with REAL events
            // const availability = checkDayAvailability(day, allEvents, MOCK_ANALYSTS);

            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const randomAvail = Math.random() > 0.3; // 70% chance of being available

            newMap[format(day, 'yyyy-MM-dd')] = {
                date: day,
                status: isWeekend ? 'WEEKEND' : (randomAvail ? 'AVAILABLE' : 'UNAVAILABLE'),
                availableAnalystsCount: isWeekend ? 0 : (randomAvail ? 3 : 1)
            };
        });

        setAvailabilityMap(newMap);
        setLoading(false);
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Agenda Consolidada</h1>
                    <p className="text-zinc-500 mt-2">Visão unificada da disponibilidade do time de analistas.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchCalendarData}
                        className="p-2 text-zinc-500 hover:text-techub-green transition-colors"
                        title="Atualizar Agenda"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex items-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-1">
                        <button onClick={prevMonth} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
                            <ChevronLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                        </button>
                        <span className="px-4 font-semibold text-zinc-900 dark:text-zinc-100 min-w-[140px] text-center capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </span>
                        <button onClick={nextMonth} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
                            <ChevronRight className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                        <div key={day} className="py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 auto-rows-[120px]">
                    {calendarDays.map((day, idx) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const availability = availabilityMap[dateKey];
                        const isCurrentMonth = isSameMonth(day, currentDate);

                        // Styles based on status
                        let bgClass = "bg-white dark:bg-zinc-900";
                        let statusColor = "text-zinc-400";
                        let statusText = "";

                        if (availability) {
                            if (availability.status === 'AVAILABLE') {
                                bgClass = "bg-techub-green/5 hover:bg-techub-green/10 cursor-pointer";
                                statusColor = "text-techub-green-dark dark:text-techub-green";
                                statusText = "Disponível";
                            } else if (availability.status === 'UNAVAILABLE') {
                                bgClass = "bg-zinc-100 dark:bg-zinc-950/50 cursor-not-allowed"; // Gray for unavailable
                                statusColor = "text-zinc-400";
                                statusText = "Indisponível";
                            } else if (availability.status === 'WEEKEND') {
                                bgClass = "bg-zinc-50/50 dark:bg-zinc-950/30";
                                statusText = "";
                            }
                        }

                        if (!isCurrentMonth) {
                            bgClass = "bg-zinc-50/30 dark:bg-zinc-950/20";
                        }

                        return (
                            <div
                                key={day.toString()}
                                className={`
                            border-r border-b border-zinc-200 dark:border-zinc-800 p-3 transition-colors relative group
                            ${bgClass}
                            ${idx % 7 === 6 ? 'border-r-0' : ''}
                        `}
                            >
                                <div className={`flex justify-between items-start`}>
                                    <span className={`
                                text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                ${isToday(day) ? 'bg-techub-green text-black' : (isCurrentMonth ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-600')}
                            `}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                {isCurrentMonth && availability && availability.status !== 'WEEKEND' && (
                                    <div className="mt-4">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${availability.status === 'AVAILABLE' ? 'bg-techub-green/20 text-techub-green-dark dark:text-techub-green' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
                                            {statusText}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-techub-green"></div>
                    <span className="text-zinc-600 dark:text-zinc-400">Disponível (Min. 2 Analistas)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                    <span className="text-zinc-600 dark:text-zinc-400">Indisponível / Lotado</span>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
