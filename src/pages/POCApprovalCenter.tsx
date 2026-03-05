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
            const smtpServer = import.meta.env.VITE_SMTP_SERVER_URL || 'http://localhost:3002';
            const response = await fetch(`${smtpServer}/approve-poc?poc_id=${pocId}`, { method: 'POST' });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Erro ao processar aprovação no servidor.');
            }

            console.log('POC Approved:', result.message);
            setRequests(requests.filter(r => r.id !== pocId));
        } catch (error: any) {
            console.error('Error approving POC:', error);
            alert('Erro ao aprovar: ' + (error.message || 'Mensagem de rede. Verifique se o servidor Node.js (porta 3002) está operando.'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (pocId: string) => {
        if (!confirm('Deseja realmente rejeitar esta solicitação?')) return;

        setActionLoading(pocId);
        try {
            const smtpServer = import.meta.env.VITE_SMTP_SERVER_URL || 'http://localhost:3002';
            const response = await fetch(`${smtpServer}/reject-poc?poc_id=${pocId}`, { method: 'POST' });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Erro ao processar recusa no servidor.');
            }

            console.log('POC Rejected:', result.message);
            setRequests(requests.filter(r => r.id !== pocId));
        } catch (error: any) {
            console.error('Error rejecting POC:', error);
            alert('Erro ao rejeitar: ' + (error.message || 'Mensagem de rede. Verifique se o servidor Node.js (porta 3002) está operando.'));
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
                <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs">Carregando solicitações</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3 uppercase">
                        <Shield className="w-8 h-8 text-techub-green" />
                        Central de Análise
                    </h1>
                    <p className="text-zinc-500 font-medium tracking-wide mt-2">Valide os requisitos técnicos e aprove para agendamento automático.</p>
                </div>
                <div className="bg-black border border-techub-green/30 px-4 py-2 rounded-sm shadow-[2px_2px_0px_#00D26A]">
                    <span className="text-techub-green font-bold text-sm tracking-wider uppercase">
                        {requests.length} Solicitações Pendentes
                    </span>
                </div>
            </div>

            {requests.length === 0 ? (
                <div className="bg-[#09090b] border border-zinc-800 rounded-sm p-24 text-center hw-accent">
                    <CheckCircle className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Fila Vazia</h3>
                    <p className="text-zinc-500 mt-2 font-medium">Não há novas solicitações aguardando aprovação no momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {requests.map((request, index) => (
                        <div
                            key={request.id}
                            className={`
                                overflow-hidden transition-all duration-300 border rounded-sm animate-fade-in-up stagger-${(index % 4) + 1}
                                ${expandedRequest === request.id
                                    ? 'bg-[#09090b] border-techub-green/50 shadow-[4px_4px_0px_#00D26A20]'
                                    : 'bg-black border-zinc-800 hover:border-zinc-600'}
                            `}
                        >
                            {/* Card Header (Visible) */}
                            <div
                                className="p-6 cursor-pointer flex flex-wrap items-center justify-between gap-6"
                                onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                            >
                                <div className="flex items-center gap-4 min-w-[300px]">
                                    <div className="w-12 h-12 rounded-none bg-black border border-zinc-800 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-techub-green" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-zinc-900 border border-zinc-700 rounded-sm text-zinc-300">
                                                {request.poc_code}
                                            </span>
                                            <span className="text-xs font-black text-techub-green uppercase tracking-widest pl-2 border-l border-zinc-800">
                                                {request.poc_type?.name}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-black text-white mt-2 uppercase tracking-tight">
                                            {request.client_name}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 flex-1">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Consultor Comercial</span>
                                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                                            <User className="w-4 h-4 text-zinc-600" />
                                            {request.commercial_contact_name || request.commercial_owner}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Data Desejada</span>
                                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                                            <Calendar className="w-4 h-4 text-zinc-600" />
                                            {new Date(request.scheduled_date).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Esforço</span>
                                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                                            <Clock className="w-4 h-4 text-zinc-600" />
                                            {request.duration_hours}h
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {expandedRequest === request.id ? <ChevronUp className="w-5 h-5 text-techub-green" /> : <ChevronDown className="w-5 h-5 text-zinc-500 hover:text-white transition-colors" />}
                                </div>
                            </div>

                            {/* Card Body (Expanded) */}
                            {expandedRequest === request.id && (
                                <div className="px-6 pb-6 border-t border-zinc-800 bg-black animate-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                        {/* Questions Column */}
                                        <div className="space-y-6">
                                            <h4 className="font-black text-xs text-techub-green uppercase tracking-widest border-b border-zinc-800 pb-2">Contatos Adicionais</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-[#09090b] rounded-sm border border-zinc-800">
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Comercial</p>
                                                    <p className="text-sm font-bold text-zinc-200">{request.commercial_contact_name || request.commercial_owner}</p>
                                                    <p className="text-xs text-zinc-500 font-medium">{request.commercial_contact_email || "—"}</p>
                                                </div>
                                                <div className="p-4 bg-[#09090b] rounded-sm border border-zinc-800">
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Fabricante</p>
                                                    <p className="text-sm font-bold text-zinc-200">{request.manufacturer_contact_name || "Não informado"}</p>
                                                    <p className="text-xs text-zinc-500 font-medium">{request.manufacturer_contact_email || "—"}</p>
                                                </div>
                                            </div>

                                            <h4 className="font-black text-xs text-techub-green uppercase tracking-widest border-b border-zinc-800 pb-2 mt-8">Questionário Técnico</h4>

                                            <div className="space-y-4">
                                                <div className="p-5 bg-zinc-900 rounded-sm border border-zinc-800 space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Equipamento</p>
                                                            <p className="text-sm font-medium text-zinc-300 mt-1">{request.equipment_model || '—'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">S/N</p>
                                                            <p className="text-sm font-medium text-zinc-300 mt-1">{request.serial_number || '—'}</p>
                                                        </div>
                                                    </div>

                                                    {request.client_environment_notes && (
                                                        <div className="pt-4 border-t border-zinc-800/50">
                                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Ambiente / Restrições</p>
                                                            <p className="text-sm text-zinc-300 leading-relaxed border-l-2 border-zinc-700 pl-3 mt-2">
                                                                {request.client_environment_notes}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-5 bg-zinc-900 rounded-sm border border-zinc-800 space-y-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Escopo Técnico (Proposta)</p>
                                                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap mt-2 font-mono text-xs p-3 bg-black border border-zinc-800 rounded-sm">
                                                            {request.technical_proposal_notes || 'Não informado'}
                                                        </p>
                                                    </div>

                                                    {(request.software_scope || request.server_responsible || request.licenses) && (
                                                        <div className="mt-4 pt-4 border-t border-zinc-800/50 space-y-4">
                                                            <div>
                                                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider">Softwares previstos</p>
                                                                <p className="text-sm text-zinc-300 max-h-32 overflow-y-auto whitespace-pre-wrap mt-2">{request.software_scope || '—'}</p>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Servidor (Responsável)</p>
                                                                    <p className="text-sm text-zinc-300 mt-1">{request.server_responsible || '—'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Licenças</p>
                                                                    <p className="text-sm text-zinc-300 mt-1">{request.licenses || '—'}</p>
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
                                                <h4 className="font-black text-xs text-techub-green uppercase tracking-widest border-b border-zinc-800 pb-2">Documentação de Apoio</h4>
                                                {request.attachments?.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {request.attachments.map((file, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    downloadAttachment(file.file_path, file.file_name);
                                                                }}
                                                                className="w-full flex items-center justify-between p-4 bg-[#09090b] border border-zinc-800 rounded-sm hover:border-zinc-600 transition-colors group btn-push"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <FileText className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
                                                                    <span className="text-sm font-bold text-zinc-300 group-hover:text-white">{file.file_name}</span>
                                                                </div>
                                                                <Download className="w-4 h-4 text-zinc-600 group-hover:text-techub-green" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-8 bg-[#09090b] rounded-sm border border-dashed border-zinc-800">
                                                        <AlertCircle className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                                                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Nenhum anexo fornecido</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-8 mt-auto flex items-center justify-end gap-3 flex-wrap">
                                                <button
                                                    disabled={!!actionLoading}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReject(request.id);
                                                    }}
                                                    className="px-6 py-3 rounded-sm border border-zinc-800 text-red-500 hover:bg-red-500/10 hover:border-red-500/30 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 btn-push"
                                                >
                                                    {actionLoading === request.id ? 'Processando...' : 'Rejeitar Demanda'}
                                                </button>
                                                <button
                                                    disabled={!!actionLoading}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleApprove(request.id);
                                                    }}
                                                    className="bg-techub-green text-black px-8 py-3 rounded-sm font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-colors hover:bg-[#00E676] disabled:opacity-50 btn-push"
                                                >
                                                    {actionLoading === request.id ? (
                                                        <Clock className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="w-4 h-4" />
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
