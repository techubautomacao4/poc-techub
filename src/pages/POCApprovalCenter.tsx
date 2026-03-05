import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    CheckCircle,
    FileText,
    Download,
    User,
    Calendar,
    Clock,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Shield
} from 'lucide-react';

interface POCRequest {
    id: string;
    poc_code: string;
    client_name: string;
    commercial_owner: string;
    scheduled_date: string;
    duration_hours: number;
    status: string;
    poc_type: { name: string };
    commercial_contact_name?: string;
    commercial_contact_email?: string;
    manufacturer_contact_name?: string;
    manufacturer_contact_email?: string;
    equipment_model?: string;
    serial_number?: string;
    client_environment_notes?: string;
    software_scope?: string;
    server_responsible?: string;
    licenses?: string;
    technical_proposal_notes?: string;
    answers?: { question: string, answer: string }[];
    attachments: { file_path: string, file_name: string }[];
}

const POCApprovalCenter: React.FC = () => {
    const [requests, setRequests] = useState<POCRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('pocs')
            .select(`
                *,
                poc_type:poc_types(name),
                answers:poc_questionnaire_answers(question, answer),
                attachments:poc_attachments(file_path, file_name)
            `)
            .eq('status', 'PENDING_POC')
            .order('created_at', { ascending: false });

        if (data) setRequests(data as any[]);
        setLoading(false);
    };

    const handleApprove = async (pocId: string) => {
        setActionLoading(pocId);
        try {
            // Centralized approval on Node.js Server:
            // 1. Performs Round-Robin analyst assignment
            // 2. Updates database (POC status and Analyst timestamp)
            // 3. Generates ICS and sends calendar invite
            const smtpServer = import.meta.env.VITE_SMTP_SERVER_URL || 'http://localhost:3002';
            const response = await fetch(`${smtpServer}/approve-poc?poc_id=${pocId}`, { method: 'POST' });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Erro ao processar aprovação no servidor.');
            }

            // Success feedback
            console.log('POC Approved:', result.message);
            setRequests(requests.filter(r => r.id !== pocId));
        } catch (error: any) {
            console.error('Error approving POC:', error);
            alert('Erro ao aprovar: ' + (error.message || 'Erro desconhecido.'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (pocId: string) => {
        if (!confirm('Deseja realmente rejeitar esta solicitação?')) return;

        setActionLoading(pocId);
        try {
            const { error } = await (supabase
                .from('pocs') as any)
                .update({ status: 'REJECTED' })
                .eq('id', pocId);

            if (error) throw error;
            setRequests(requests.filter(r => r.id !== pocId));
        } catch (error: any) {
            console.error('Error rejecting POC:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const downloadAttachment = async (path: string, fileName: string) => {
        const { data } = await supabase.storage
            .from('poc-attachments')
            .download(path);

        if (data) {
            const url = window.URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Shield className="w-12 h-12 text-techub-green animate-pulse" />
                <p className="text-zinc-500 font-medium tracking-wide">Carregando solicitações...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-techub-green" />
                        Central de Análise POC
                    </h1>
                    <p className="text-zinc-500 mt-2">Valide os requisitos técnicos e aprove para agendamento automático.</p>
                </div>
                <div className="bg-techub-green/10 border border-techub-green/20 px-4 py-2 rounded-full">
                    <span className="text-techub-green font-semibold">
                        {requests.length} Solicitações Pendentes
                    </span>
                </div>
            </div>

            {requests.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-20 text-center">
                    <CheckCircle className="w-16 h-16 text-techub-green/20 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-zinc-200">Tudo em dia!</h3>
                    <p className="text-zinc-500 mt-2">Não há novas solicitações aguardando aprovação.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {requests.map((request) => (
                        <div
                            key={request.id}
                            className={`
                                overflow-hidden transition-all duration-300 border
                                ${expandedRequest === request.id
                                    ? 'bg-zinc-900 border-techub-green/30 shadow-2xl ring-1 ring-techub-green/10'
                                    : 'bg-zinc-900/70 border-zinc-800 hover:border-techub-green/20 shadow-sm'}
                                rounded-2xl
                            `}
                        >
                            {/* Card Header (Visible) */}
                            <div
                                className="p-6 cursor-pointer flex flex-wrap items-center justify-between gap-6"
                                onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                            >
                                <div className="flex items-center gap-4 min-w-[300px]">
                                    <div className="w-12 h-12 rounded-xl bg-techub-green/10 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-techub-green" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">
                                                {request.poc_code}
                                            </span>
                                            <span className="text-xs font-bold text-techub-green uppercase tracking-wider">
                                                {request.poc_type?.name}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-zinc-100 mt-1">
                                            {request.client_name}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 flex-1">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-bold text-zinc-400">Consultor Comercial</span>
                                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                                            <User className="w-4 h-4" />
                                            {request.commercial_contact_name || request.commercial_owner}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-bold text-zinc-400">Data Desejada</span>
                                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(request.scheduled_date).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-bold text-zinc-400">Esforço</span>
                                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                                            <Clock className="w-4 h-4" />
                                            {request.duration_hours}h
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {expandedRequest === request.id ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                                </div>
                            </div>

                            {/* Card Body (Expanded) */}
                            {expandedRequest === request.id && (
                                <div className="px-6 pb-6 border-t border-zinc-800 animate-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                        {/* Questions Column */}
                                        <div className="space-y-6">
                                            <h4 className="font-bold text-sm text-techub-green uppercase tracking-widest">Contatos Adicionais</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-800">
                                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Comercial</p>
                                                    <p className="text-sm text-zinc-200">{request.commercial_contact_name || request.commercial_owner}</p>
                                                    <p className="text-xs text-zinc-500">{request.commercial_contact_email || "—"}</p>
                                                </div>
                                                <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-800">
                                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Fabricante</p>
                                                    <p className="text-sm text-zinc-200">{request.manufacturer_contact_name || "Não informado"}</p>
                                                    <p className="text-xs text-zinc-500">{request.manufacturer_contact_email || "—"}</p>
                                                </div>
                                            </div>

                                            <h4 className="font-bold text-sm text-techub-green uppercase tracking-widest mt-6">Questionário Técnico</h4>

                                            <div className="space-y-3">
                                                <div className="p-4 bg-zinc-800/50 rounded-xl space-y-3">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-zinc-500 uppercase">Equipamento</p>
                                                            <p className="text-sm text-zinc-300">{request.equipment_model || '—'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-zinc-500 uppercase">S/N</p>
                                                            <p className="text-sm text-zinc-300">{request.serial_number || '—'}</p>
                                                        </div>
                                                    </div>

                                                    {request.client_environment_notes && (
                                                        <div>
                                                            <p className="text-[10px] font-bold text-zinc-500 uppercase">Ambiente / Restrições</p>
                                                            <p className="text-sm text-zinc-300 leading-relaxed italic border-l-2 border-zinc-700 pl-3 mt-1">
                                                                {request.client_environment_notes}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-4 bg-zinc-800/50 rounded-xl space-y-3">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase">Escopo Técnico (Proposta)</p>
                                                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap mt-1">
                                                            {request.technical_proposal_notes || 'Não informado'}
                                                        </p>
                                                    </div>

                                                    {(request.software_scope || request.server_responsible || request.licenses) && (
                                                        <div className="mt-4 pt-4 border-t border-zinc-700 space-y-3">
                                                            <div>
                                                                <p className="text-[10px] font-bold text-blue-400 uppercase">Softwares previstos</p>
                                                                <p className="text-sm text-zinc-300 max-h-32 overflow-y-auto whitespace-pre-wrap mt-1">{request.software_scope || '—'}</p>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Servidor (Responsável)</p>
                                                                    <p className="text-sm text-zinc-300">{request.server_responsible || '—'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Licenças</p>
                                                                    <p className="text-sm text-zinc-300">{request.licenses || '—'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Attachments & Actions Column */}
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-sm text-techub-green uppercase tracking-widest">Documentação de Apoio</h4>
                                                {request.attachments?.length > 0 ? (
                                                    request.attachments.map((file, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                downloadAttachment(file.file_path, file.file_name);
                                                            }}
                                                            className="w-full flex items-center justify-between p-4 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <FileText className="w-5 h-5 text-zinc-400 group-hover:text-techub-green transition-colors" />
                                                                <span className="text-sm font-medium text-zinc-300">{file.file_name}</span>
                                                            </div>
                                                            <Download className="w-4 h-4 text-zinc-400" />
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="text-center p-8 bg-zinc-800/40 rounded-xl border border-dashed border-zinc-700">
                                                        <AlertCircle className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                                                        <p className="text-xs text-zinc-500 font-medium">Nenhum anexo fornecido</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-6 border-t border-zinc-800 flex items-center justify-end gap-4">
                                                <button
                                                    disabled={!!actionLoading}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReject(request.id);
                                                    }}
                                                    className="px-6 py-3 rounded-xl text-red-400 hover:bg-red-900/30 font-bold transition-all disabled:opacity-50"
                                                >
                                                    {actionLoading === request.id ? 'Processando...' : 'Rejeitar Demanda'}
                                                </button>
                                                <button
                                                    disabled={!!actionLoading}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleApprove(request.id);
                                                    }}
                                                    className="bg-techub-green hover:bg-techub-green-hover text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-techub-green/10 transform transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                                >
                                                    {actionLoading === request.id ? (
                                                        <Clock className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="w-5 h-5" />
                                                    )}
                                                    Aprovar e Sortear Analista
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default POCApprovalCenter;
