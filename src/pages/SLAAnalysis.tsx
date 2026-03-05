import React, { useState, useEffect } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, AlertCircle } from 'lucide-react';

const SLAAnalysis: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        // Generate mock data for the current month
        // In production, fetch from 'poc_sla' table joined with 'pocs'
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        const days = eachDayOfInterval({ start, end });

        // Mock trend: SLA starts high, dips, then recovers (just for viz)
        const mockData = days.map(day => {
            // Don't show future data in the graph if strictly "current month evolution"
            // But for "current month analysis" we usually show up to today.
            if (day > today) return null;

            return {
                date: format(day, 'dd/MM'),
                sla: 95 + (Math.random() * 5 - 2.5), // Random around 95%
                target: 90
            };
        }).filter(Boolean);

        // Simulate network delay
        setTimeout(() => {
            setData(mockData);
            setLoading(false);
        }, 800);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-techub-green" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-zinc-500">
                <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium">Nenhum dado de SLA disponível neste mês.</h3>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Análise de SLA</h1>
                <p className="text-zinc-500 mt-2">Monitoramento de nível de serviço para o mês atual ({format(new Date(), 'MMMM', { locale: ptBR })}).</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 text-zinc-100">Evolução do SLA (%)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorSla" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00D26A" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#00D26A" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#71717a"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#71717a"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={[80, 100]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#09090b',
                                        borderColor: '#27272a',
                                        borderRadius: '12px',
                                        color: '#f4f4f5'
                                    }}
                                    itemStyle={{ color: '#00D26A' }}
                                />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    formatter={(value) => <span className="text-zinc-400 text-sm">{value}</span>}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sla"
                                    name="SLA Realizado"
                                    stroke="#00D26A"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorSla)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="target"
                                    name="Meta (90%)"
                                    stroke="#3f3f46"
                                    strokeDasharray="5 5"
                                    fill="none"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="space-y-6">
                    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-sm flex flex-col justify-center h-[140px]">
                        <span className="text-zinc-500 text-sm font-medium">SLA Médio (Mês)</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-4xl font-bold text-zinc-100">96.4%</span>
                            <span className="text-sm font-medium text-techub-green">+2.4%</span>
                        </div>
                    </div>

                    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-sm flex flex-col justify-center h-[140px]">
                        <span className="text-zinc-500 text-sm font-medium">POCs com Violação</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-4xl font-bold text-zinc-100">0</span>
                            <span className="text-sm font-medium text-zinc-400">de 24 POCs</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SLAAnalysis;
