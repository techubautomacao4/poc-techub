import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, addMonths, subMonths, isSameMonth,
    isToday, isBefore, startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ChevronLeft, ChevronRight, Loader2, RefreshCw, X,
    Calendar, Clock, Building2, User, FileText, Server,
    Phone, Mail, MapPin, Tag, ChevronRight as ArrowRight,
    CheckCircle2, Cpu, Package, Upload
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type DayStatus = 'AVAILABLE' | 'RESERVED' | 'UNAVAILABLE' | 'WEEKEND' | 'PAST';


interface DayInfo { status: DayStatus; analystCount?: number; }
interface PocType {
    id: string;
    name: string;
    duration_hours: number;
    color_theme: string;
    description: string;
}

// ─── Field Component ──────────────────────────────────────────
const Field: React.FC<{ label: string; icon?: React.ReactNode; required?: boolean; children: React.ReactNode }> = ({ label, icon, required, children }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            {icon}<span>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
        </label>
        {children}
    </div>
);

// ─── Multi-step Request Modal ─────────────────────────────────
interface RequestModalProps {
    date: Date;
    pocType: PocType;
    onClose: () => void;
    onSuccess: () => void;
}

interface FormData {
    // Step 1
    client_name: string;
    commercial_owner: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    address: string;
    requested_time: string;
    has_commercial_presence: boolean;
    commercial_contact_name: string;
    commercial_contact_email: string;
    has_manufacturer_presence: boolean;
    manufacturer_contact_name: string;
    manufacturer_contact_email: string;
    equipment_model: string;
    serial_number: string;
    client_environment_notes: string;
    duration_hours: number;
    // Step 2 (common)
    technical_proposal_notes: string;
    // Step 2 (software only)
    software_scope: string;
    server_responsible: string;
    licenses: string[];
}

const LICENSE_OPTIONS = ['NDD', 'PaperCut', 'DocService', 'Outra'];

const emptyForm = (): FormData => ({
    client_name: '', commercial_owner: '', contact_name: '',
    contact_phone: '', contact_email: '', address: '',
    requested_time: '09:00', has_commercial_presence: false,
    commercial_contact_name: '', commercial_contact_email: '',
    has_manufacturer_presence: false,
    manufacturer_contact_name: '', manufacturer_contact_email: '',
    equipment_model: '', serial_number: '',
    client_environment_notes: '', duration_hours: 4,
    technical_proposal_notes: '', software_scope: '',
    server_responsible: '', licenses: [],
});

const RequestModal: React.FC<RequestModalProps> = ({ date, pocType, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>({ ...emptyForm(), duration_hours: pocType.duration_hours || 4 });
    const [submitting, setSubmitting] = useState(false);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const totalSteps = 3;
    const isSoftware = pocType.name.includes('+') || pocType.name.toLowerCase().includes('software');

    const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
        setForm(p => ({ ...p, [k]: v }));

    const toggleLicense = (lic: string) =>
        set('licenses', form.licenses.includes(lic)
            ? form.licenses.filter(l => l !== lic)
            : [...form.licenses, lic]);

    const validateStep1 = () => {
        if (!form.client_name.trim()) return 'Nome do cliente é obrigatório';
        if (!form.commercial_owner.trim()) return 'Responsável comercial é obrigatório';
        if (!form.contact_name.trim()) return 'Nome do contato é obrigatório';
        if (!form.contact_phone.trim()) return 'Telefone do contato é obrigatório';
        if (!form.contact_email.trim()) return 'Email do contato é obrigatório';
        if (!form.address.trim()) return 'Endereço completo é obrigatório';
        if (!form.equipment_model.trim()) return 'Modelo do equipamento é obrigatório';
        if (!form.serial_number.trim()) return 'Número de série é obrigatório';

        if (form.has_commercial_presence) {
            if (!form.commercial_contact_name.trim()) return 'Nome do comercial é obrigatório';
            if (!form.commercial_contact_email.trim()) return 'Email do comercial é obrigatório';
        }
        if (form.has_manufacturer_presence) {
            if (!form.manufacturer_contact_name.trim()) return 'Nome do fabricante é obrigatório';
            if (!form.manufacturer_contact_email.trim()) return 'Email do fabricante é obrigatório';
        }
        return null;
    };

    const validateStep2 = () => {
        if (isSoftware) {
            if (!form.software_scope.trim()) return 'Descreva os softwares conforme proposta técnica';
            if (!form.server_responsible.trim()) return 'Informe o responsável pelo servidor';
            if (form.licenses.length === 0) return 'Selecione ao menos uma licença prevista';
        }
        return null;
    };

    const handleNext = () => {
        setError(null);
        const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null;
        if (err) { setError(err); return; }
        setStep(s => s + 1);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        const { data: lastPoc } = await supabase
            .from('pocs')
            .select('poc_code')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let nextNumber = 1;
        const pocCodeStr = (lastPoc as any)?.poc_code;
        if (pocCodeStr && typeof pocCodeStr === 'string' && pocCodeStr.startsWith('POC')) {
            const parsed = parseInt(pocCodeStr.replace('POC', ''), 10);
            if (!isNaN(parsed)) nextNumber = parsed + 1;
        }

        const pocCode = `POC${nextNumber.toString().padStart(5, '0')}`;

        const { data: pocData, error: err } = await (supabase.from('pocs') as any).insert({
            poc_code: pocCode,
            poc_type_id: pocType.id,
            client_name: form.client_name,
            commercial_owner: form.commercial_owner,
            contact_name: form.contact_name,
            contact_phone: form.contact_phone,
            contact_email: form.contact_email,
            address: form.address,
            scheduled_date: format(date, 'yyyy-MM-dd'),
            requested_time: form.requested_time,
            has_commercial_presence: form.has_commercial_presence,
            commercial_contact_name: form.commercial_contact_name,
            commercial_contact_email: form.commercial_contact_email,
            has_manufacturer_presence: form.has_manufacturer_presence,
            manufacturer_contact_name: form.manufacturer_contact_name,
            manufacturer_contact_email: form.manufacturer_contact_email,
            equipment_model: form.equipment_model,
            serial_number: form.serial_number,
            client_environment_notes: form.client_environment_notes,
            duration_hours: form.duration_hours,
            software_scope: isSoftware ? form.software_scope : null,
            server_responsible: isSoftware ? form.server_responsible : null,
            licenses: isSoftware ? form.licenses.join(', ') : null,
            technical_proposal_notes: form.technical_proposal_notes,
            status: 'PENDING_POC',
            requester_id: user?.id || null,
        } as any).select().single();
        if (err) { setError(err.message); setSubmitting(false); return; }

        if (attachment && pocData) {
            const fileExt = attachment.name.split('.').pop();
            const fileName = `${pocData.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${pocData.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('poc-attachments')
                .upload(filePath, attachment);

            if (!uploadError) {
                await (supabase.from('poc_attachments') as any).insert({
                    poc_id: pocData.id,
                    file_name: attachment.name,
                    file_path: filePath
                });
            } else {
                console.error("Erro no upload do anexo:", uploadError);
            }
        }

        onSuccess();
        onClose();
    };

    const progressW = `${(step / totalSteps) * 100}%`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-xl border border-zinc-800
                flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-zinc-800 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full`}
                                style={{ backgroundColor: `${pocType.color_theme}20`, color: pocType.color_theme }}
                            >
                                {isSoftware ? <Server className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />} {pocType.name}
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-zinc-100">Solicitar Homologação</h2>
                        <p className="text-sm text-zinc-500 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-techub-green" />
                            {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Progress */}
                <div className="px-6 pt-4 shrink-0">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                        {['Informações Gerais', 'Anexo Escopo Técnico', 'Confirmação'].map((s, i) => (
                            <span key={s} className={`font-semibold ${step === i + 1 ? 'text-techub-green' : step > i + 1 ? 'text-zinc-300' : ''}`}>
                                {step > i + 1 ? '✓ ' : ''}{s}
                            </span>
                        ))}
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-techub-green rounded-full transition-all duration-500" style={{ width: progressW }} />
                    </div>
                </div>

                {/* Body (scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* STEP 1 */}
                    {step === 1 && (
                        <>
                            <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-techub-green" /> Dados do Cliente & Logística
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Field label="Nome do Cliente" icon={<Building2 className="w-3.5 h-3.5" />} required>
                                        <input className="input-field" placeholder="Ex: Empresa XPTO Ltda" value={form.client_name} onChange={e => set('client_name', e.target.value)} />
                                    </Field>
                                </div>
                                <div className="col-span-2">
                                    <Field label="Responsável Comercial" icon={<User className="w-3.5 h-3.5" />} required>
                                        <input className="input-field" placeholder="Nome do responsável" value={form.commercial_owner} onChange={e => set('commercial_owner', e.target.value)} />
                                    </Field>
                                </div>
                                <Field label="Contato do Cliente" icon={<User className="w-3.5 h-3.5" />} required>
                                    <input className="input-field" placeholder="Nome" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
                                </Field>
                                <Field label="Telefone" icon={<Phone className="w-3.5 h-3.5" />} required>
                                    <input className="input-field" placeholder="(11) 99999-0000" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
                                </Field>
                                <div className="col-span-2">
                                    <Field label="Email do Contato" icon={<Mail className="w-3.5 h-3.5" />} required>
                                        <input type="email" className="input-field" placeholder="contato@cliente.com" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
                                    </Field>
                                </div>
                                <div className="col-span-2">
                                    <Field label="Endereço Completo" icon={<MapPin className="w-3.5 h-3.5" />} required>
                                        <input className="input-field" placeholder="Rua, número, bairro, cidade, estado" value={form.address} onChange={e => set('address', e.target.value)} />
                                    </Field>
                                </div>
                                <Field label="Horário Solicitado" icon={<Clock className="w-3.5 h-3.5" />} required>
                                    <input type="time" className="input-field" value={form.requested_time} onChange={e => set('requested_time', e.target.value)} />
                                </Field>
                                <Field label="Duração (horas)" icon={<Clock className="w-3.5 h-3.5" />}>
                                    <input type="number" className="input-field opacity-60 cursor-not-allowed" value={form.duration_hours} readOnly />
                                    <p className="text-[10px] text-zinc-500 mt-1">A duração é fixa conforme o tipo de POC selecionado.</p>
                                </Field>
                            </div>

                            {/* Presença Comercial */}
                            <div className="space-y-3 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-950/30">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Presença do Comercial?</span>
                                    <button type="button" onClick={() => set('has_commercial_presence', !form.has_commercial_presence)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.has_commercial_presence ? 'bg-techub-green' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.has_commercial_presence ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                {form.has_commercial_presence && (
                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <input className="input-field" placeholder="Nome do Comercial" value={form.commercial_contact_name} onChange={e => set('commercial_contact_name', e.target.value)} />
                                        <input type="email" className="input-field" placeholder="Email do Comercial" value={form.commercial_contact_email} onChange={e => set('commercial_contact_email', e.target.value)} />
                                    </div>
                                )}
                            </div>

                            {/* Presença Fabricante */}
                            <div className="space-y-3 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-950/30">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Presença do Fabricante?</span>
                                    <button type="button" onClick={() => set('has_manufacturer_presence', !form.has_manufacturer_presence)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.has_manufacturer_presence ? 'bg-techub-green' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.has_manufacturer_presence ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                {form.has_manufacturer_presence && (
                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <input className="input-field" placeholder="Nome do Fabricante" value={form.manufacturer_contact_name} onChange={e => set('manufacturer_contact_name', e.target.value)} />
                                        <input type="email" className="input-field" placeholder="Email do Fabricante" value={form.manufacturer_contact_email} onChange={e => set('manufacturer_contact_email', e.target.value)} />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Modelo do Equipamento" icon={<Package className="w-3.5 h-3.5" />} required>
                                    <input className="input-field" placeholder="Ex: HP LaserJet 4502" value={form.equipment_model} onChange={e => set('equipment_model', e.target.value)} />
                                </Field>
                                <Field label="Número de Série" icon={<Tag className="w-3.5 h-3.5" />} required>
                                    <input className="input-field" placeholder="S/N do equipamento" value={form.serial_number} onChange={e => set('serial_number', e.target.value)} />
                                </Field>
                            </div>

                            <Field label="Particularidades do Ambiente" icon={<FileText className="w-3.5 h-3.5" />}>
                                <textarea className="input-field min-h-[72px] resize-none" placeholder="Tipo de papel, aplicação específica, restrições de rede, etc." value={form.client_environment_notes} onChange={e => set('client_environment_notes', e.target.value)} />
                            </Field>
                        </>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                        <>
                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-techub-green" /> Anexo Escopo Técnico
                            </p>

                            <Field label="Proposta Técnica / Observações" icon={<FileText className="w-3.5 h-3.5" />}>
                                <textarea className="input-field min-h-[80px] resize-none" placeholder="Cole aqui o link da proposta técnica ou descreva o escopo aprovado" value={form.technical_proposal_notes} onChange={e => set('technical_proposal_notes', e.target.value)} />
                            </Field>

                            <Field label="Anexar Arquivo" icon={<Upload className="w-3.5 h-3.5" />}>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        onChange={e => setAttachment(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                    />
                                    <div className="flex items-center gap-3 p-4 border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-800/20 group-hover:border-techub-green/50 group-hover:bg-techub-green/5 transition-all">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                                            <Upload className="w-5 h-5 text-zinc-400 group-hover:text-techub-green transition-colors" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            {attachment ? (
                                                <p className="text-sm font-medium text-zinc-200 truncate">{attachment.name}</p>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-medium text-zinc-300 group-hover:text-techub-green transition-colors">Clique ou arraste um arquivo</p>
                                                    <p className="text-[10px] text-zinc-500 mt-0.5">PDF, DOC, DOCX, Imagens (Máx: 10MB)</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Field>

                            {isSoftware && (
                                <>
                                    <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
                                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Server className="w-3.5 h-3.5" /> Informações de Software
                                    </p>

                                    <Field label="Softwares conforme proposta técnica" icon={<Server className="w-3.5 h-3.5" />} required>
                                        <textarea className="input-field min-h-[80px] resize-none" placeholder="Liste os softwares a serem instalados/configurados" value={form.software_scope} onChange={e => set('software_scope', e.target.value)} />
                                    </Field>

                                    <Field label="Responsável pelo Servidor" icon={<Server className="w-3.5 h-3.5" />} required>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['Cliente', 'Techub', 'Não aplicável'].map(opt => (
                                                <button key={opt} type="button"
                                                    onClick={() => set('server_responsible', opt)}
                                                    className={`py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all
                                                        ${form.server_responsible === opt
                                                            ? 'bg-techub-green text-black border-techub-green'
                                                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>

                                    <Field label="Licenças Previstas" icon={<Tag className="w-3.5 h-3.5" />} required>
                                        <div className="flex flex-wrap gap-2">
                                            {LICENSE_OPTIONS.map(lic => (
                                                <button key={lic} type="button"
                                                    onClick={() => toggleLicense(lic)}
                                                    className={`py-2 px-4 rounded-full text-sm font-semibold border transition-all
                                                        ${form.licenses.includes(lic)
                                                            ? 'bg-techub-green text-black border-techub-green'
                                                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                                                    {lic}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                </>
                            )}
                        </>
                    )}

                    {/* STEP 3 — Confirmation */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-techub-green/10 border border-techub-green/20 rounded-xl">
                                <CheckCircle2 className="w-6 h-6 text-techub-green shrink-0" />
                                <div>
                                    <p className="font-bold text-white">Revise e confirme a solicitação</p>
                                    <p className="text-sm text-zinc-400">Após o envio, o PUC analisará o chamado em até 5 dias úteis.</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                {[
                                    { label: 'Tipo de POC', value: pocType.name },
                                    { label: 'Data Solicitada', value: `${format(date, "dd/MM/yyyy", { locale: ptBR })} às ${form.requested_time}` },
                                    { label: 'Cliente', value: form.client_name },
                                    { label: 'Comercial', value: form.has_commercial_presence ? `${form.commercial_contact_name} (${form.commercial_contact_email})` : 'Não' },
                                    { label: 'Fabricante', value: form.has_manufacturer_presence ? `${form.manufacturer_contact_name} (${form.manufacturer_contact_email})` : 'Não' },
                                    { label: 'Contato no Cliente', value: `${form.contact_name} — ${form.contact_phone}` },
                                    { label: 'Endereço', value: form.address },
                                    { label: 'Equipamento', value: `${form.equipment_model} (S/N: ${form.serial_number})` },
                                    ...(isSoftware ? [
                                        { label: 'Softwares', value: form.software_scope },
                                        { label: 'Servidor', value: form.server_responsible },
                                        { label: 'Licenças', value: form.licenses.join(', ') },
                                    ] : []),
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex gap-3">
                                        <span className="w-36 shrink-0 text-zinc-500 font-medium">{label}:</span>
                                        <span className="text-zinc-200 font-semibold flex-1">{value || '—'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-400">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-800 flex gap-3 shrink-0">
                    {step > 1 && (
                        <button type="button" onClick={() => { setStep(s => s - 1); setError(null); }}
                            className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors font-semibold">
                            Voltar
                        </button>
                    )}
                    <div className="flex-1" />
                    {step < totalSteps ? (
                        <button type="button" onClick={handleNext}
                            className="flex items-center gap-2 bg-techub-green text-black font-bold px-6 py-2.5 rounded-xl hover:bg-techub-green-hover transition-all">
                            Próximo <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button type="button" onClick={handleSubmit} disabled={submitting}
                            className="flex items-center gap-2 bg-techub-green text-black font-bold px-6 py-2.5 rounded-xl hover:bg-techub-green-hover transition-all disabled:opacity-50">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {submitting ? 'Enviando...' : 'Enviar Solicitação'}
                        </button>
                    )}
                </div>
            </div>
        </div >
    );
};

// ─── Main Calendar Component ───────────────────────────────────
const CalendarView: React.FC = () => {
    const [pocTypes, setPocTypes] = useState<PocType[]>([]);
    const [selectedType, setSelectedType] = useState<PocType | null>(null);
    const [analystCount, setAnalystCount] = useState(0);
    const [availabilityMap, setAvailabilityMap] = useState<Record<string, DayInfo>>({});
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const handleModalSuccess = () => {
        fetchCalendarData();
        setToastMessage("Solicitação de POC enviada para análise");
        setTimeout(() => setToastMessage(null), 5000);
    };

    useEffect(() => {
        const fetchTypes = async () => {
            const { data } = await supabase.from('poc_types').select('*').order('name');
            if (data && data.length > 0) {
                const types = (data as any[]).map(t => ({
                    ...t,
                    description: t.name.includes('+')
                        ? 'Equipamento + softwares, licenças e integração de sistema'
                        : 'Homologação de equipamentos de impressão em campo'
                }));
                setPocTypes(types);
                setSelectedType(types[0]);
            }
        };
        fetchTypes();
    }, []);

    const fetchCalendarData = useCallback(async () => {
        if (!selectedType) return;
        setLoading(true);

        try {
            // Determine today's date in BRT (UTC-3) as 'YYYY-MM-DD'
            const now = new Date();
            const brtOffset = -3 * 60; // minutes
            const brtNow = new Date(now.getTime() + (brtOffset - now.getTimezoneOffset()) * 60000);
            const todayISO = brtNow.toISOString().split('T')[0];

            // Fetch availability from Edge Function.
            // The API applies: 3-business-day buffer, 90-day horizon, and ICS conflict checks.
            const { data: availabilityData, error: availError } = await supabase.functions.invoke('get-availability', {
                body: {
                    month: currentDate.getMonth() + 1,
                    year: currentDate.getFullYear(),
                    poc_type_id: selectedType.id,
                    today_iso: todayISO   // BRT date for accurate buffer + horizon
                }
            });

            if (availError) throw availError;

            // Build the display map – trust the API's AVAILABLE/UNAVAILABLE, only
            // override to 'WEEKEND' and 'PAST' for rendering purposes.
            const today = startOfDay(new Date());
            const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
            const newMap: Record<string, DayInfo> = {};

            days.forEach(day => {
                const key = format(day, 'yyyy-MM-dd');
                const apiInfo = availabilityData?.[key];

                // Weekends: purely visual state
                if (day.getDay() === 0 || day.getDay() === 6) {
                    newMap[key] = { status: 'WEEKEND' };
                    return;
                }

                // Past days: visual state only (API also marks them UNAVAILABLE)
                if (isBefore(day, today)) {
                    newMap[key] = { status: 'PAST' };
                    return;
                }

                // All other days: respect the API response
                if (apiInfo?.status === 'AVAILABLE') {
                    newMap[key] = { status: 'AVAILABLE', analystCount: apiInfo.analystCount };
                } else {
                    newMap[key] = { status: 'UNAVAILABLE', analystCount: 0 };
                }
            });

            const totalAnalysts = Math.max(
                ...Object.values(availabilityData || {}).map((v: any) => v.analystCount || 0),
                0
            );
            setAnalystCount(totalAnalysts);
            setAvailabilityMap(newMap);
        } catch (err) {
            console.error('Error fetching availability:', err);
        } finally {
            setLoading(false);
        }
    }, [currentDate, selectedType]);

    useEffect(() => { fetchCalendarData(); }, [fetchCalendarData]);

    const calendarDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentDate)),
        end: endOfWeek(endOfMonth(currentDate))
    });

    const getDayStyle = (info?: DayInfo, inMonth?: boolean) => {
        if (!inMonth || !info) return 'bg-zinc-950/20';
        switch (info.status) {
            case 'AVAILABLE': return 'bg-techub-green/5 hover:bg-techub-green/15 cursor-pointer border border-techub-green/20';
            case 'UNAVAILABLE': return 'bg-zinc-950/50 opacity-60';
            case 'PAST': return 'opacity-35';
            default: return '';
        }
    };



    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Agenda de Homologações</h1>
                <p className="text-zinc-500 mt-1">Selecione o tipo de POC e clique em uma data disponível para solicitar.</p>
            </div>

            {/* Type Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pocTypes.map(type => (
                    <button key={type.id} type="button" onClick={() => { setSelectedType(type); setSelectedDate(null); }}
                        className={`flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all
                            ${selectedType?.id === type.id
                                ? 'border-zinc-100 bg-zinc-800'
                                : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                            }`}
                        style={selectedType?.id === type.id ? { borderColor: type.color_theme, backgroundColor: `${type.color_theme}10` } : {}}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors
                            ${selectedType?.id === type.id ? 'text-zinc-100' : 'bg-zinc-800 text-zinc-400'}`}
                            style={selectedType?.id === type.id ? { backgroundColor: type.color_theme } : {}}
                        >
                            {type.name.includes('+') ? <Server className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                        </div>
                        <div>
                            <p className="font-bold text-zinc-100">{type.name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{type.description}</p>
                            {selectedType?.id === type.id && analystCount > 0 && (
                                <p className="text-xs font-semibold mt-1.5" style={{ color: type.color_theme }}>
                                    {analystCount} analista(s) monitorado(s)
                                </p>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {/* Calendar */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm overflow-hidden">
                {/* Nav */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                            <ChevronLeft className="w-4 h-4 text-zinc-500" />
                        </button>
                        <span className="font-semibold text-zinc-100 capitalize min-w-[160px] text-center">
                            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </span>
                        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                            <ChevronRight className="w-4 h-4 text-zinc-500" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-zinc-800 text-zinc-100`}
                            style={selectedType ? { backgroundColor: `${selectedType.color_theme}20`, color: selectedType.color_theme } : {}}
                        >
                            {selectedType?.name.includes('+') ? <Server className="w-4 h-4" /> : <Cpu className="w-4 h-4" />} {selectedType?.name}
                        </span>
                        <button onClick={fetchCalendarData} className="p-2 text-zinc-400 hover:text-techub-green transition-colors" title="Atualizar">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 bg-zinc-950/50 border-b border-zinc-800">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">{d}</div>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-3 text-zinc-400">
                            <Loader2 className="w-7 h-7 animate-spin text-techub-green" />
                            <span className="text-sm font-medium">Sincronizando agendas ICS...</span>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-7 auto-rows-[90px]">
                        {calendarDays.map((day, idx) => {
                            const key = format(day, 'yyyy-MM-dd');
                            const info = availabilityMap[key];
                            const inMonth = isSameMonth(day, currentDate);
                            return (
                                <div key={day.toString()}
                                    onClick={() => { if (!inMonth || !info) return; if (info.status === 'AVAILABLE') setSelectedDate(day); }}
                                    className={`border-r border-b border-zinc-800 p-3 transition-all
                                        ${getDayStyle(info, inMonth)}
                                        ${idx % 7 === 6 ? 'border-r-0' : ''}`}>
                                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                        ${isToday(day) ? 'bg-techub-green text-black' : (inMonth ? 'text-zinc-300' : 'text-zinc-600')}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {inMonth && info?.status === 'AVAILABLE' && (
                                        <span className="mt-1 block text-xs font-semibold px-1.5 py-0.5 rounded-full bg-techub-green/20 text-techub-green w-fit">
                                            {info.analystCount} livre(s)
                                        </span>
                                    )}
                                    {inMonth && info?.status === 'UNAVAILABLE' && (
                                        <span className="mt-1 block text-xs text-zinc-400">Indisponível</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-6 text-sm">
                {[
                    { color: 'bg-techub-green', label: 'Disponível — clique para solicitar' },
                    { color: 'bg-zinc-600', label: 'Indisponível / Todos os analistas ocupados' },
                ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <span className="text-zinc-400">{label}</span>
                    </div>
                ))}
            </div>

            {/* Request Modal */}
            {selectedDate && selectedType && (
                <RequestModal
                    date={selectedDate}
                    pocType={selectedType}
                    onClose={() => setSelectedDate(null)}
                    onSuccess={handleModalSuccess}
                />
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 bg-techub-green text-black px-6 py-4 rounded-xl shadow-2xl font-bold flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[60] border border-green-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>{toastMessage}</span>
                    <button onClick={() => setToastMessage(null)} className="ml-2 hover:bg-black/10 rounded-lg p-1 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default CalendarView;
