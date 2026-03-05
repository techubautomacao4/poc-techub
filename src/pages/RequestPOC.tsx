import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Loader2, CheckCircle, AlertCircle, FileText, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RequestPOC: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pocTypes, setPocTypes] = useState<{ id: string, name: string }[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        poc_type_id: '',
        client_name: '',
        commercial_owner: '',
        scheduled_date: '',
        duration_hours: 4,
    });

    const [questions, setQuestions] = useState({
        justification: '',
        objectives: '',
        success_criteria: '',
        current_infra: '',
    });

    useEffect(() => {
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

    const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setQuestions({
            ...questions,
            [e.target.name]: e.target.value
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            const pocCode = `POC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            // 1. Insert and get POC ID
            const { data: pocData, error: pocError } = await supabase
                .from('pocs')
                .insert({
                    poc_code: pocCode,
                    poc_type_id: formData.poc_type_id,
                    client_name: formData.client_name,
                    commercial_owner: formData.commercial_owner,
                    scheduled_date: formData.scheduled_date,
                    duration_hours: Number(formData.duration_hours),
                    status: 'PENDING_POC',
                })
                .select()
                .single();

            if (pocError) throw pocError;

            // 2. Insert Questionnaire Answers
            const questionnaireData = [
                { poc_id: pocData.id, question: 'Justificativa do Projeto', answer: questions.justification },
                { poc_id: pocData.id, question: 'Objetivos Técnicos', answer: questions.objectives },
                { poc_id: pocData.id, question: 'Critérios de Sucesso', answer: questions.success_criteria },
                { poc_id: pocData.id, question: 'Infraestrutura Atual', answer: questions.current_infra },
            ];

            const { error: qError } = await supabase
                .from('poc_questionnaire_answers')
                .insert(questionnaireData);

            if (qError) throw qError;

            // 3. Handle File Upload if exists
            if (uploadFile) {
                const fileExt = uploadFile.name.split('.').pop();
                const fileName = `${pocData.id}/${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('poc-attachments')
                    .upload(filePath, uploadFile);

                if (uploadError) throw uploadError;

                const { error: attachError } = await supabase
                    .from('poc_attachments')
                    .insert({
                        poc_id: pocData.id,
                        file_path: filePath,
                        file_name: uploadFile.name,
                        file_type: uploadFile.type
                    });

                if (attachError) throw attachError;
            }

            navigate('/'); // Redirect to dashboard
        } catch (error: any) {
            console.error('Error requesting POC:', error);
            setErrorMsg('Erro ao solicitar POC. ' + (error.message || 'Verifique os dados.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Solicitar Nova POC</h1>
                <p className="text-zinc-500 mt-2">Preencha os dados e o questionário técnico para análise da Central de Projetos.</p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-10">
                    {errorMsg && (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Basic Info Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                            <FileText className="w-5 h-5 text-techub-green" />
                            <h2 className="text-xl font-semibold">Informações Gerais</h2>
                        </div>
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
                    </div>

                    {/* Technical Questionnaire Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                            <CheckCircle className="w-5 h-5 text-techub-green" />
                            <h2 className="text-xl font-semibold">Questionário Técnico</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Justificativa do Projeto</label>
                                <textarea
                                    name="justification"
                                    required
                                    rows={3}
                                    value={questions.justification}
                                    onChange={handleQuestionChange}
                                    placeholder="Por que esta POC é necessária agora?"
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-techub-green focus:border-transparent outline-none transition-all dark:text-white resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Principais Objetivos Técnicos</label>
                                <textarea
                                    name="objectives"
                                    required
                                    rows={3}
                                    value={questions.objectives}
                                    onChange={handleQuestionChange}
                                    placeholder="Quais features/tecnologias serão validadas?"
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-techub-green focus:border-transparent outline-none transition-all dark:text-white resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Critérios de Sucesso</label>
                                    <textarea
                                        name="success_criteria"
                                        required
                                        rows={4}
                                        value={questions.success_criteria}
                                        onChange={handleQuestionChange}
                                        placeholder="O que define que a POC foi bem sucedida?"
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-techub-green focus:border-transparent outline-none transition-all dark:text-white resize-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Infraestrutura Atual</label>
                                    <textarea
                                        name="current_infra"
                                        required
                                        rows={4}
                                        value={questions.current_infra}
                                        onChange={handleQuestionChange}
                                        placeholder="Descreva o ambiente atual do cliente"
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-techub-green focus:border-transparent outline-none transition-all dark:text-white resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attachments Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                            <Upload className="w-5 h-5 text-techub-green" />
                            <h2 className="text-xl font-semibold">Anexos Técnicos</h2>
                        </div>

                        {!uploadFile ? (
                            <div className="relative border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-10 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer group">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    accept=".pdf,.docx,.png,.jpg,.jpeg"
                                />
                                <Upload className="w-10 h-10 text-zinc-400 mx-auto mb-3 group-hover:text-techub-green transition-colors" />
                                <p className="text-base text-zinc-600 dark:text-zinc-300 font-medium">Clique para enviar ou arraste arquivos aqui</p>
                                <p className="text-sm text-zinc-400 mt-1">PDF, DOCX, Imagens (Max 10MB)</p>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-4 bg-techub-green/10 border border-techub-green/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-6 h-6 text-techub-green" />
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{uploadFile.name}</p>
                                        <p className="text-xs text-zinc-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setUploadFile(null)}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="pt-8 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-techub-green hover:bg-techub-green-hover text-black font-bold py-4 px-12 rounded-xl shadow-xl shadow-techub-green/10 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg"
                        >
                            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                            <span>Enviar Solicitação para Análise</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RequestPOC;
