import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Settings as SettingsIcon,
    Users,
    User as UserIcon,
    CalendarDays,
    Mail,
    Plus,
    Pencil,
    Trash2,
    Save,
    X,
    Check,
    Loader2,
    Clock,
    ExternalLink,
    AlertCircle,
    RefreshCw
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
interface Role { id: string; name: string; description?: string; }
interface User {
    id: string; email: string; name: string; role_id: string;
    active: boolean; created_at: string;
    roles?: { name: string };
}
interface Analyst {
    id: string; name: string; microsoft_email: string;
    url_ics?: string; active: boolean; type_tag?: string;
}
interface SmtpSettings {
    smtp_host: string; smtp_port: string; smtp_user: string;
    smtp_pass: string; smtp_from: string;
}

interface PocType { id: string; name: string; duration_hours: number; color_theme: string; }
interface Availability { id: string; analyst_id: string; day_of_week: number; lunch_start: string; lunch_end: string; start_time: string; end_time: string; is_active: boolean; }

type Tab = 'users' | 'analysts' | 'poc_types' | 'availability' | 'smtp';

// ─── Sub-components ───────────────────────────────────────────

const SectionCard: React.FC<{ title: string; description: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, description, action, children }) => (
    <div className="bg-[#09090b] border border-zinc-800 rounded-sm overflow-hidden brutal-panel animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-black">
            <div>
                <h3 className="font-black text-white uppercase tracking-tight">{title}</h3>
                <p className="text-xs font-medium text-zinc-500 mt-1 uppercase tracking-wider">{description}</p>
            </div>
            {action}
        </div>
        <div className="p-6">{children}</div>
    </div>
);

// ─── Tab: Users ───────────────────────────────────────────────
const UsersTab: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role_id: '' });
    const [saveLoading, setSaveLoading] = useState(false);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        const [{ data: u }, { data: r }] = await Promise.all([
            (supabase.from('users') as any).select('*, roles(name)').order('created_at', { ascending: false }),
            (supabase.from('roles') as any).select('*')
        ]);
        if (u) setUsers(u);
        if (r) setRoles(r);
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!newUser.name || !newUser.email || !newUser.password || !newUser.role_id) return;
        setSaveLoading(true);
        const { error } = await (supabase.from('users') as any).insert({
            ...newUser,
            password_hash: newUser.password,
            active: true
        });
        if (!error) { setCreating(false); setNewUser({ name: '', email: '', password: '', role_id: '' }); fetchAll(); }
        setSaveLoading(false);
    };

    const handleToggleActive = async (user: User) => {
        await (supabase.from('users') as any).update({ active: !user.active }).eq('id', user.id);
        fetchAll();
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-techub-green" /></div>;

    return (
        <SectionCard
            title="Usuários do Sistema"
            description="Gerencie os acessos e permissões de cada usuário."
            action={
                <button onClick={() => setCreating(true)} className="flex items-center gap-2 bg-techub-green text-black text-xs font-black uppercase tracking-wider px-4 py-2 rounded-sm transition-colors hover:bg-techub-green-hover btn-push">
                    <Plus className="w-4 h-4" /> Novo Usuário
                </button>
            }
        >
            {creating && (
                <div className="mb-6 p-6 border border-techub-green/30 bg-black rounded-sm space-y-4">
                    <h4 className="font-black text-xs text-techub-green uppercase tracking-widest border-b border-zinc-800 pb-2">Novo Usuário</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input className="input-field" placeholder="Nome completo" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
                        <input className="input-field" placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                        <input className="input-field" placeholder="Senha inicial" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                        <select className="input-field" value={newUser.role_id} onChange={e => setNewUser(p => ({ ...p, role_id: e.target.value }))}>
                            <option value="">Selecione um cargo...</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleCreate} disabled={saveLoading} className="flex items-center gap-2 bg-techub-green text-black text-sm font-bold px-4 py-2 rounded-lg">
                            {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
                        </button>
                        <button onClick={() => setCreating(false)} className="flex items-center gap-2 text-sm text-zinc-500 px-4 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                            <X className="w-4 h-4" /> Cancelar
                        </button>
                    </div>
                </div>
            )}

            <div className="divide-y divide-zinc-800">
                {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-sm border border-techub-green/30 bg-black flex items-center justify-center">
                                <span className="text-sm font-black text-techub-green uppercase">{user.name.charAt(0)}</span>
                            </div>
                            <div>
                                <p className="font-bold text-zinc-100 uppercase tracking-tight">{user.name}</p>
                                <p className="text-xs font-medium text-zinc-500">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 border border-zinc-800 bg-zinc-900 rounded-sm text-zinc-400">
                                {user.roles?.name || 'Sem cargo'}
                            </span>
                            <button
                                onClick={() => handleToggleActive(user)}
                                className={`relative inline - flex h - 6 w - 11 items - center rounded - full transition - colors ${user.active ? 'bg-techub-green' : 'bg-zinc-700'} `}
                            >
                                <span className={`inline - block h - 4 w - 4 transform rounded - full bg - white shadow transition - transform ${user.active ? 'translate-x-6' : 'translate-x-1'} `} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
};

// ─── Tab: Analysts ────────────────────────────────────────────
const AnalystsTab: React.FC = () => {
    const [analysts, setAnalysts] = useState<Analyst[]>([]);
    const [pocTypes, setPocTypes] = useState<PocType[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Analyst>>({});
    const [creating, setCreating] = useState(false);
    const [newAnalyst, setNewAnalyst] = useState({ name: '', microsoft_email: '', url_ics: '', type_tag: '' });
    const [saveLoading, setSaveLoading] = useState(false);

    useEffect(() => { fetchAnalystsAndTypes(); }, []);

    const fetchAnalystsAndTypes = async () => {
        setLoading(true);
        const [resAnalysts, resTypes] = await Promise.all([
            supabase.from('analysts').select('*').order('name'),
            supabase.from('poc_types').select('*').order('name')
        ]);
        if (resAnalysts.data) setAnalysts(resAnalysts.data as any[]);
        if (resTypes.data) setPocTypes(resTypes.data as any[]);
        setLoading(false);
    };

    const handleCreate = async () => {
        setErrorMsg(null);
        setSaveLoading(true);
        const { error } = await (supabase.from('analysts') as any).insert({ ...newAnalyst, active: true });
        if (error) {
            setErrorMsg(`Erro ao salvar analista: ${error.message || 'Erro desconhecido'}`);
        } else {
            setCreating(false);
            setNewAnalyst({ name: '', microsoft_email: '', url_ics: '', type_tag: '' });
            fetchAnalystsAndTypes();
        }
        setSaveLoading(false);
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        setErrorMsg(null);
        setSaveLoading(true);
        const { error } = await (supabase.from('analysts') as any).update(editData).eq('id', editingId);
        if (error) {
            setErrorMsg(`Erro ao salvar analista: ${error.message || 'Erro desconhecido'}`);
        } else {
            setEditingId(null);
            fetchAnalystsAndTypes();
        }
        setSaveLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remover este analista?')) return;
        await supabase.from('analysts').delete().eq('id', id);
        fetchAnalystsAndTypes();
    };

    const handleToggleType = (typeName: string, isEdit: boolean) => {
        const currentData = isEdit ? editData : newAnalyst;
        const currentTags = currentData.type_tag ? currentData.type_tag.split(',').map(s => s.trim()).filter(Boolean) : [];
        const newTags = currentTags.includes(typeName)
            ? currentTags.filter(t => t !== typeName)
            : [...currentTags, typeName];

        if (isEdit) {
            setEditData({ ...editData, type_tag: newTags.join(', ') });
        } else {
            setNewAnalyst({ ...newAnalyst, type_tag: newTags.join(', ') });
        }
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-techub-green" /></div>;

    return (
        <SectionCard
            title="Analistas & Agendas ICS"
            description="Cadastre os analistas e configure as URLs ICS de suas agendas."
            action={
                <button onClick={() => setCreating(true)} className="flex items-center gap-2 bg-techub-green text-black text-xs font-black uppercase tracking-wider px-4 py-2 rounded-sm transition-colors hover:bg-techub-green-hover btn-push">
                    <Plus className="w-4 h-4" /> Novo Analista
                </button>
            }
        >
            {creating && (
                <div className="mb-6 p-6 border border-techub-green/30 bg-black rounded-sm space-y-4">
                    <h4 className="font-black text-xs text-techub-green uppercase tracking-widest border-b border-zinc-800 pb-2">Novo Analista</h4>
                    {errorMsg && (
                        <div className="p-3 text-xs font-bold uppercase tracking-wider text-red-500 border border-red-500/30 bg-red-500/10 rounded-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {errorMsg}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input className="input-field" placeholder="Nome do Analista" value={newAnalyst.name} onChange={e => setNewAnalyst(p => ({ ...p, name: e.target.value }))} />
                        <input className="input-field" placeholder="Email corporativo" type="email" value={newAnalyst.microsoft_email} onChange={e => setNewAnalyst(p => ({ ...p, microsoft_email: e.target.value }))} />
                        <input className="input-field md:col-span-2" placeholder="URL da Agenda ICS pública" value={newAnalyst.url_ics} onChange={e => setNewAnalyst(p => ({ ...p, url_ics: e.target.value }))} />
                        <div className="md:col-span-2 space-y-2 mt-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Agendas Atendidas (Tipos de POC)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {pocTypes.map(poc => {
                                    const isSelected = newAnalyst.type_tag?.includes(poc.name);
                                    return (
                                        <label key={poc.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-techub-green/10 border-techub-green' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800'}`}>
                                            <div className="flex items-center h-5">
                                                <input
                                                    type="checkbox"
                                                    checked={!!isSelected}
                                                    onChange={() => handleToggleType(poc.name, false)}
                                                    className="w-4 h-4 text-techub-green bg-zinc-800 border-zinc-700 rounded focus:ring-techub-green focus:ring-2"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-semibold ${isSelected ? 'text-techub-green' : 'text-zinc-300'}`}>{poc.name}</span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleCreate} disabled={saveLoading} className="flex items-center gap-2 bg-techub-green text-black text-sm font-bold px-4 py-2 rounded-lg">
                            {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
                        </button>
                        <button onClick={() => setCreating(false)} className="flex items-center gap-2 text-sm text-zinc-500 px-4 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                            <X className="w-4 h-4" /> Cancelar
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {analysts.map(analyst => (
                    <div key={analyst.id} className="p-5 border border-zinc-800 rounded-sm bg-black">
                        {editingId === analyst.id ? (
                            <div className="space-y-4">
                                {errorMsg && editingId === analyst.id && (
                                    <div className="p-3 text-xs font-bold uppercase tracking-wider text-red-500 border border-red-500/30 bg-red-500/10 rounded-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {errorMsg}
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <input className="input-field" value={editData.name || ''} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} />
                                    <input className="input-field" value={editData.microsoft_email || ''} onChange={e => setEditData(p => ({ ...p, microsoft_email: e.target.value }))} />
                                </div>
                                <input className="input-field w-full" placeholder="URL ICS" value={editData.url_ics || ''} onChange={e => setEditData(p => ({ ...p, url_ics: e.target.value }))} />
                                <div className="space-y-2 mt-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Agendas Atendidas (Tipos de POC)</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {pocTypes.map(poc => {
                                            const isSelected = editData.type_tag?.includes(poc.name);
                                            return (
                                                <label key={poc.id} className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-techub-green/5 border-techub-green/50' : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'}`}>
                                                    <div className="flex items-center h-4 mt-0.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!isSelected}
                                                            onChange={() => handleToggleType(poc.name, true)}
                                                            className="w-3.5 h-3.5 text-techub-green bg-zinc-800 border-zinc-700 rounded focus:ring-techub-green focus:ring-2"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-xs font-semibold ${isSelected ? 'text-techub-green' : 'text-zinc-400'}`}>{poc.name}</span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={handleSaveEdit} disabled={saveLoading} className="flex items-center gap-1.5 text-sm bg-techub-green text-black font-bold px-3 py-1.5 rounded-lg">
                                        {saveLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Salvar
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="text-sm text-zinc-500 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <p className="font-bold text-zinc-100 uppercase tracking-tight">{analyst.name}</p>
                                        <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 border rounded-sm ${analyst.active ? 'bg-techub-green/10 border-techub-green/30 text-techub-green' : 'bg-black border-zinc-800 text-zinc-500'} `}>
                                            {analyst.active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-zinc-500 mt-0.5">{analyst.microsoft_email}</p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {analyst.type_tag?.split(',').map(tag => tag.trim()).filter(Boolean).map((tag, idx) => (
                                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 font-medium">
                                                {tag}
                                            </span>
                                        ))}
                                        {(!analyst.type_tag || analyst.type_tag.trim() === '') && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-md border border-red-900/30 bg-red-900/10 text-red-400 font-medium">
                                                Nenhuma agenda associada
                                            </span>
                                        )}
                                    </div>
                                    {analyst.url_ics ? (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <CalendarDays className="w-3 h-3 text-techub-green" />
                                            <span className="text-xs text-techub-green font-mono truncate max-w-[320px]">{analyst.url_ics}</span>
                                            <a href={analyst.url_ics} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 text-zinc-400 hover:text-techub-green" /></a>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 mt-1 text-amber-600 dark:text-amber-400">
                                            <AlertCircle className="w-3 h-3" />
                                            <span className="text-xs font-medium">Sem URL ICS configurada</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { setEditingId(analyst.id); setEditData(analyst); }} className="p-2 text-zinc-400 hover:text-techub-green hover:bg-techub-green/10 rounded-lg transition-colors">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(analyst.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </SectionCard>
    );
};

// ─── Tab: SMTP ────────────────────────────────────────────────
// ─── Tab: POC Types ───────────────────────────────────────────
const PocTypesTab: React.FC = () => {
    const [types, setTypes] = useState<PocType[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<PocType>>({});

    useEffect(() => { fetchTypes(); }, []);

    const fetchTypes = async () => {
        setLoading(true);
        const { data } = await (supabase.from('poc_types') as any).select('*').order('name');
        if (data) setTypes(data as any[]);
        setLoading(false);
    };

    const handleSave = async (id: string) => {
        await (supabase.from('poc_types') as any).update(editData).eq('id', id);
        setEditingId(null);
        fetchTypes();
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-techub-green" /></div>;

    return (
        <SectionCard
            title="Configuração de Eventos"
            description="Defina a duração padrão e as cores para cada tipo de POC."
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {types.map(type => (
                    <div key={type.id} className="p-4 border border-zinc-800 rounded-sm bg-black flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-10" style={{ backgroundColor: type.color_theme }} />
                            <div>
                                <p className="font-black text-zinc-100 uppercase tracking-tight">{type.name}</p>
                                <p className="text-xs text-zinc-500">{type.duration_hours} horas • Rodízio</p>
                            </div>
                        </div>
                        {editingId === type.id ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    className="w-16 input-field py-1"
                                    value={editData.duration_hours || ''}
                                    onChange={e => setEditData(p => ({ ...p, duration_hours: parseInt(e.target.value) }))}
                                />
                                <button onClick={() => handleSave(type.id)} className="p-2 bg-techub-green text-black rounded-sm hover:bg-techub-green-hover transition-colors btn-push">
                                    <Check className="w-3 h-3 font-black" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => { setEditingId(type.id); setEditData(type); }}
                                className="p-2 text-zinc-400 hover:text-techub-green hover:bg-zinc-800 border border-transparent hover:border-techub-green/30 rounded-sm transition-all"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </SectionCard>
    );
};

// ─── Tab: Availability ────────────────────────────────────────
const AvailabilityTab: React.FC = () => {
    const [analysts, setAnalysts] = useState<Analyst[]>([]);
    const [selectedAnalyst, setSelectedAnalyst] = useState<string>('');
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [loading, setLoading] = useState(true);

    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    useEffect(() => {
        fetchAnalysts();
    }, []);

    useEffect(() => {
        if (selectedAnalyst) fetchAvailability(selectedAnalyst);
    }, [selectedAnalyst]);

    const fetchAnalysts = async () => {
        const { data } = await (supabase.from('analysts') as any).select('*').eq('active', true).order('name');
        if (data && data.length > 0) {
            setAnalysts(data as any[]);
            setSelectedAnalyst(data[0].id);
        }
        setLoading(false);
    };

    const fetchAvailability = async (id: string) => {
        const { data } = await (supabase.from('analyst_availability') as any).select('*').eq('analyst_id', id).order('day_of_week');
        if (data) setAvailability(data as any[]);
    };

    const handleToggleDay = async (day: Availability) => {
        await (supabase.from('analyst_availability') as any).update({ is_active: !day.is_active }).eq('id', day.id);
        fetchAvailability(selectedAnalyst);
    };

    const handleUpdateTime = async (id: string, field: 'start_time' | 'end_time' | 'lunch_start' | 'lunch_end', value: string) => {
        await (supabase.from('analyst_availability') as any).update({ [field]: value }).eq('id', id);
        fetchAvailability(selectedAnalyst);
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-techub-green" /></div>;

    return (
        <SectionCard
            title="Disponibilidade dos Analistas"
            description="Defina quando os analistas estão normalmente disponíveis para POCs."
            action={
                <select
                    className="input-field py-1.5 text-xs font-black uppercase tracking-widest cursor-pointer min-w-[150px]"
                    value={selectedAnalyst}
                    onChange={e => setSelectedAnalyst(e.target.value)}
                >
                    {analysts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            }
        >
            <div className="space-y-2">
                {availability.map(day => (
                    <div key={day.id} className="flex items-center justify-between p-4 bg-black border border-zinc-800 rounded-sm">
                        <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-sm flex items-center justify-center font-black transition-colors ${day.is_active ? 'bg-techub-green text-black' : 'border border-zinc-800 bg-black text-zinc-600'} `}>
                                {weekDays[day.day_of_week].charAt(0)}
                            </div>
                            <span className={`font - semibold ${day.is_active ? 'text-zinc-100' : 'text-zinc-500'} `}>
                                {weekDays[day.day_of_week]}
                            </span>
                        </div>

                        <div className="flex items-center gap-6">
                            {day.is_active ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 bg-black border border-zinc-800 focus-within:border-techub-green/50 rounded-sm px-2 py-1 transition-colors">
                                            <Clock className="w-3.5 h-3.5 text-techub-green" />
                                            <input
                                                type="time"
                                                className="bg-transparent text-zinc-200 text-sm outline-none font-mono"
                                                value={day.start_time.substring(0, 5)}
                                                onChange={e => handleUpdateTime(day.id, 'start_time', e.target.value)}
                                            />
                                            <span className="text-zinc-600 font-black">-</span>
                                            <input
                                                type="time"
                                                className="bg-transparent text-zinc-200 text-sm outline-none font-mono"
                                                value={day.end_time.substring(0, 5)}
                                                onChange={e => handleUpdateTime(day.id, 'end_time', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button onClick={() => handleToggleDay(day)} className="text-zinc-500 hover:text-red-400 transition-colors ml-4">
                                        <X className="w-5 h-5" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="text-xs text-zinc-600 font-medium uppercase tracking-widest">Indisponível</span>
                                    <button onClick={() => handleToggleDay(day)} className="text-techub-green hover:underline text-xs font-bold transition-all">
                                        ADICIONAR
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
};

const SmtpTab: React.FC = () => {
    const [settings, setSettings] = useState<SmtpSettings>({
        smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: ''
    });
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [testEmailLoading, setTestEmailLoading] = useState(false);
    const [showTestEmailPopup, setShowTestEmailPopup] = useState(false);
    const [testEmailTo, setTestEmailTo] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    useEffect(() => { fetchSmtp(); }, []);

    const fetchSmtp = async () => {
        setLoading(true);
        const { data } = await (supabase.from('system_settings') as any).select('*').in('key', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from']);
        if (data) {
            const map: any = {};
            data.forEach((row: any) => { map[row.key] = row.value; });
            setSettings(map as SmtpSettings);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaveLoading(true);
        const entries = Object.entries(settings).map(([key, value]) => ({
            key, value, updated_at: new Date().toISOString()
        }));
        await (supabase.from('system_settings') as any).upsert(entries, { onConflict: 'key' });
        setSaveLoading(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const SMTP_SERVER = import.meta.env.VITE_SMTP_SERVER_URL || 'http://localhost:3001';

    const handleTestConnection = async () => {
        setTestLoading(true);
        setFeedback(null);
        try {
            const res = await fetch(`${SMTP_SERVER}/test-connection`, { method: 'POST' });
            const data = await res.json();
            if (data?.success) {
                setFeedback({ type: 'success', msg: data.message });
            } else {
                setFeedback({ type: 'error', msg: data?.error || 'Erro na conexão' });
            }
        } catch (err: any) {
            setFeedback({ type: 'error', msg: 'Servidor SMTP local não está rodando. Execute start-node-server.bat.' });
        } finally {
            setTestLoading(false);
        }
    };

    const handleSendTestEmail = async () => {
        if (!testEmailTo) return;
        setTestEmailLoading(true);
        setFeedback(null);
        try {
            const params = new URLSearchParams({ to: testEmailTo });
            const res = await fetch(`${SMTP_SERVER}/send-test-email?${params}`, { method: 'POST' });
            const data = await res.json();
            if (data?.success) {
                setFeedback({ type: 'success', msg: data.message });
                setShowTestEmailPopup(false);
            } else {
                setFeedback({ type: 'error', msg: data?.error || 'Erro ao enviar email' });
            }
        } catch (err: any) {
            setFeedback({ type: 'error', msg: 'Servidor SMTP local não está rodando. Execute start-node-server.bat.' });
        } finally {
            setTestEmailLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-techub-green" /></div>;

    return (
        <SectionCard
            title="Configuração de SMTP"
            description="Configure o servidor de email para o envio de convites aos analistas."
        >
            <div className="space-y-6">
                {feedback && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${feedback.type === 'success'
                        ? 'bg-green-500/10 border-green-500/50 text-green-400'
                        : 'bg-red-500/10 border-red-500/50 text-red-400'
                        }`}>
                        {feedback.type === 'success' ? <Check className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                        <div className="flex-1">
                            <p className="text-sm font-bold uppercase tracking-wider mb-1">
                                {feedback.type === 'success' ? 'Sucesso' : 'Erro'}
                            </p>
                            <p className="text-sm opacity-90 leading-relaxed">{feedback.msg}</p>
                        </div>
                        <button onClick={() => setFeedback(null)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity p-1">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="max-w-2xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Host SMTP</label>
                            <input className="input-field" placeholder="smtp.office365.com" value={settings.smtp_host || ''} onChange={e => setSettings(p => ({ ...p, smtp_host: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Porta</label>
                            <input className="input-field" placeholder="587" value={settings.smtp_port || ''} onChange={e => setSettings(p => ({ ...p, smtp_port: e.target.value }))} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Usuário SMTP</label>
                            <input className="input-field" placeholder="noreply@techub.com.br" value={settings.smtp_user || ''} onChange={e => setSettings(p => ({ ...p, smtp_user: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Senha SMTP</label>
                            <input className="input-field" type="password" placeholder="••••••••••••" value={settings.smtp_pass || ''} onChange={e => setSettings(p => ({ ...p, smtp_pass: e.target.value }))} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Remetente</label>
                        <input className="input-field" placeholder="poc@techub.com.br" value={settings.smtp_from || ''} onChange={e => setSettings(p => ({ ...p, smtp_from: e.target.value }))} />
                    </div>

                    <div className="pt-6 flex flex-col sm:flex-row items-center gap-4 border-t border-zinc-800">
                        <button onClick={handleSave} disabled={saveLoading} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-techub-green text-black font-black text-xs uppercase tracking-wider px-6 py-3 rounded-sm hover:bg-techub-green-hover transition-colors btn-push disabled:opacity-50">
                            {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved ? 'Salvo!' : 'Salvar'}
                        </button>

                        <button onClick={handleTestConnection} disabled={testLoading} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-black text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-sm border border-zinc-800 hover:border-zinc-600 transition-colors btn-push disabled:opacity-50">
                            {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Testar Conexão
                        </button>

                        <div className="relative w-full sm:w-auto">
                            <button onClick={() => setShowTestEmailPopup(!showTestEmailPopup)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-800 text-zinc-100 font-bold px-6 py-2.5 rounded-xl hover:bg-zinc-700 transition-all border border-zinc-700">
                                <Mail className="w-4 h-4" />
                                Enviar Email Teste
                            </button>

                            {showTestEmailPopup && (
                                <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 w-full sm:w-80 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="text-sm font-bold text-zinc-100">Destinatário do Teste</h4>
                                    <input
                                        type="email"
                                        className="input-field text-sm"
                                        placeholder="exemplo@email.com"
                                        value={testEmailTo}
                                        onChange={e => setTestEmailTo(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSendTestEmail}
                                            disabled={testEmailLoading || !testEmailTo}
                                            className="flex-1 bg-techub-green text-black text-xs font-bold py-2 rounded-lg hover:bg-techub-green-hover disabled:opacity-50"
                                        >
                                            {testEmailLoading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Enviar Agora'}
                                        </button>
                                        <button
                                            onClick={() => setShowTestEmailPopup(false)}
                                            className="flex-1 bg-zinc-800 text-zinc-400 text-xs font-bold py-2 rounded-lg hover:bg-zinc-700"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </SectionCard>
    );
};

// ─── Main Component ───────────────────────────────────────────
const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('users');

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'users', label: 'Usuários & Permissões', icon: <Users className="w-4 h-4" /> },
        { id: 'analysts', label: 'Analistas', icon: <UserIcon className="w-4 h-4" /> },
        { id: 'poc_types', label: 'Tipos de Evento', icon: <CalendarDays className="w-4 h-4" /> },
        { id: 'availability', label: 'Disponibilidade', icon: <Clock className="w-4 h-4" /> },
        { id: 'smtp', label: 'SMTP', icon: <Mail className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20 animate-fade-in-up">
            <div className="border-b border-zinc-800 pb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3 uppercase">
                    <SettingsIcon className="w-8 h-8 text-techub-green" />
                    Configurações
                </h1>
                <p className="text-zinc-500 font-medium tracking-wide mt-2">Gerencie usuários, analistas, agendas e integrações do sistema.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-4 w-full">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs font-black uppercase tracking-widest transition-colors ${activeTab === tab.id
                            ? 'bg-techub-green text-black border border-techub-green'
                            : 'bg-black text-zinc-500 border border-zinc-800 hover:text-white hover:border-zinc-700'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'analysts' && <AnalystsTab />}
            {activeTab === 'poc_types' && <PocTypesTab />}
            {activeTab === 'availability' && <AvailabilityTab />}
            {activeTab === 'smtp' && <SmtpTab />}
        </div>
    );
};

export default Settings;
