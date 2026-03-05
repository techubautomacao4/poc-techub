import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type POC = Database['public']['Tables']['pocs']['Row'];

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [pocs, setPocs] = useState<POC[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPocs();
    }, []);

    const fetchPocs = async () => {
        try {
            const { data, error } = await supabase
                .from('pocs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;
            setPocs(data || []);
        } catch (error) {
            console.error('Error fetching POCs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="border-b border-zinc-800 pb-6 mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">
                    Painel <span className="text-techub-green">Operacional</span>
                </h1>
                <p className="text-zinc-500 font-medium tracking-wide mt-2">Visão geral da operação. Módulo: {user?.email}</p>
            </div>

            {/* Stat Cards — Brutalist Solid, no soft shadows, hard accents */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'POCs Ativas', value: '12', icon: Clock, color: 'text-zinc-100', accent: 'border-l-blue-500' },
                    { label: 'Agendadas', value: '5', icon: CheckCircle2, color: 'text-techub-green', accent: 'border-l-techub-green' },
                    { label: 'SLA Crítico', value: '1', icon: AlertTriangle, color: 'text-red-500', accent: 'border-l-red-500' },
                    { label: 'Total Mês', value: '24', icon: BarChart3, color: 'text-zinc-300', accent: 'border-l-zinc-500' },
                ].map((stat, i) => (
                    <div
                        key={i}
                        className={`bg-[#09090b] p-6 rounded-sm border border-zinc-800 border-l-4 ${stat.accent} transition-transform hover:-translate-y-1 duration-200 animate-fade-in-up stagger-${(i % 4) + 1}`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{stat.label}</p>
                                <h3 className="text-4xl font-black mt-2 text-white tracking-tighter">{stat.value}</h3>
                            </div>
                            <div className="p-2 bg-black border border-zinc-800 rounded-sm">
                                <stat.icon className={`w-6 h-6 ${stat.color}`} strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent POCs Table - High Contrast */}
            <div className="bg-[#09090b] rounded-sm border border-zinc-800 overflow-hidden animate-fade-in-up stagger-4">
                <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-black">
                    <h2 className="text-sm font-bold tracking-widest text-zinc-100 uppercase">POCs Recentes</h2>
                    <Link to="/approval-center" className="text-xs font-bold text-techub-green hover:text-white flex items-center gap-1 transition-colors group">
                        VER TODAS <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black tracking-widest text-zinc-500 uppercase bg-[#09090b]">
                            <tr>
                                <th className="px-6 py-4 border-b border-zinc-800">Código</th>
                                <th className="px-6 py-4 border-b border-zinc-800">Cliente</th>
                                <th className="px-6 py-4 border-b border-zinc-800">Responsável</th>
                                <th className="px-6 py-4 border-b border-zinc-800">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 bg-[#000000]">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center">
                                        <div className="flex justify-center items-center space-x-2">
                                            <div className="w-2 h-2 bg-techub-green rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-techub-green rounded-full animate-bounce [animation-delay:-.3s]"></div>
                                            <div className="w-2 h-2 bg-techub-green rounded-full animate-bounce [animation-delay:-.5s]"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : pocs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-zinc-600 font-medium">
                                        NENHUMA POC REGISTRADA NO SISTEMA
                                    </td>
                                </tr>
                            ) : (
                                pocs.map((poc) => (
                                    <tr key={poc.id} className="hover:bg-[#09090b] transition-colors group cursor-pointer">
                                        <td className="px-6 py-4 font-bold text-zinc-100 group-hover:text-techub-green transition-colors">{poc.poc_code}</td>
                                        <td className="px-6 py-4 text-zinc-400 font-medium">{poc.client_name}</td>
                                        <td className="px-6 py-4 text-zinc-500">{poc.commercial_owner}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded-sm text-[10px] font-bold border border-techub-green/30 bg-techub-green/10 text-techub-green uppercase tracking-wider">
                                                Novo
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
