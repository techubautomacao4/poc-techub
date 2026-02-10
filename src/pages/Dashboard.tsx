import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

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
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Bem-vindo, {user?.email}
                </h1>
                <p className="text-zinc-500 mt-2">Visão geral da operação de POCs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'POCs Ativas', value: '12', icon: Clock, color: 'text-blue-500' },
                    { label: 'Agendadas', value: '5', icon: CheckCircle2, color: 'text-techub-green' },
                    { label: 'SLA Crítico', value: '1', icon: AlertTriangle, color: 'text-red-500' },
                    { label: 'Total Mês', value: '24', icon: BarChart3, color: 'text-purple-500' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                                <h3 className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">{stat.value}</h3>
                            </div>
                            <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">POCs Recentes</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-950/50">
                            <tr>
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Responsável</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {loading ? (
                                <tr><td colSpan={4} className="p-6 text-center text-zinc-500">Carregando...</td></tr>
                            ) : pocs.length === 0 ? (
                                <tr><td colSpan={4} className="p-6 text-center text-zinc-500">Nenhuma POC encontrada.</td></tr>
                            ) : (
                                pocs.map((poc) => (
                                    <tr key={poc.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{poc.poc_code}</td>
                                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{poc.client_name}</td>
                                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{poc.commercial_owner}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-techub-green/10 text-techub-green-dark dark:text-techub-green">
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
