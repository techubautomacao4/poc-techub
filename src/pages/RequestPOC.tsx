import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { findAvailableAnalyst } from '../utils/rotation';

const RequestPOC: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pocTypes, setPocTypes] = useState<{ id: string, name: string }[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        poc_type_id: '',
        client_name: '',
        commercial_owner: '',
        scheduled_date: '',
        duration_hours: 4,
    });

    useEffect(() => {
        // Fetch POC types
        const fetchTypes = async () => {
            const { data } = await supabase.from('poc_types').select('id, name');
            if (data) setPocTypes(data);
        };
        fetchTypes();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            const pocCode = `POC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            // Automatic rotation logic
            let assignedAnalystId = null;
            try {
                assignedAnalystId = await findAvailableAnalyst(formData.scheduled_date, Number(formData.duration_hours));
            } catch (err) {
                console.warn('Could not assign analyst automatically:', err);
            }

            const { data, error } = await supabase
                .from('pocs')
                .insert({
                    poc_code: pocCode,
                    poc_type_id: formData.poc_type_id,
                    client_name: formData.client_name,
                    commercial_owner: formData.commercial_owner,
                    scheduled_date: formData.scheduled_date,
                    duration_hours: Number(formData.duration_hours),
                    assigned_analyst_id: assignedAnalystId,
                })
                .select()
                .single();

            if (error) throw error;

            navigate('/'); // Redirect to dashboard
        } catch (error: any) {
            console.error('Error requesting POC:', error);
            setErrorMsg('Erro ao solicitar POC. ' + (error.message || 'Verifique os dados.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Solicitar Nova POC</h1>
                <p className="text-zinc-500 mt-2">Preencha os dados abaixo para agendar uma nova Prova de Conceito.</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {errorMsg && (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tipo de POC</label>
                            <select
                                name="poc_type_id"
                                required
                                value={formData.poc_type_id}
                                onChange={handleChange}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-techub-green focus:border-transparent outline-none transition-all dark:text-white"
                            >
                                <option value="">Selecione um tipo...</option>
                                {pocTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Cliente</label>
                            <input
                                type="text"
                                name="client_name"
                                required
                                value={formData.client_name}
                                onChange={handleChange}
                                placeholder="Nome da empresa"
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-techub-green focus:border-transparent outline-none transition-all dark:text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Responsável Comercial</label>
                            <input
                                type="text"
                                name="commercial_owner"
                                required
                                value={formData.commercial_owner}
                                onChange={handleChange}
                                placeholder="Nome do Executivo de Contas"
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-techub-green focus:border-transparent outline-none transition-all dark:text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Data Desejada</label>
                            <input
                                type="date"
                                name="scheduled_date"
                                required
                                value={formData.scheduled_date}
                                onChange={handleChange}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-techub-green focus:border-transparent outline-none transition-all dark:text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Duração Estimada (horas)</label>
                            <input
                                type="number"
                                name="duration_hours"
                                min="1"
                                max="40"
                                required
                                value={formData.duration_hours}
                                onChange={handleChange}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-techub-green focus:border-transparent outline-none transition-all dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Anexos (Arquitetura, Escopo, etc)</label>
                        <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                            <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                            <p className="text-sm text-zinc-500">Clique para enviar ou arraste arquivos aqui</p>
                            <p className="text-xs text-zinc-400 mt-1">PDF, DOCX, PNG (Max 10MB)</p>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-techub-green hover:bg-techub-green-hover text-black font-bold py-3 px-8 rounded-lg shadow-lg shadow-techub-green/10 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            <span>Confirmar Solicitação</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RequestPOC;
