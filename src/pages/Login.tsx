import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, Mail, Eye, EyeOff, ShieldAlert, BadgeCheck } from 'lucide-react';
import backgroundVideo from '../assets/pochero.mp4';
import logoImg from '../assets/logo.jpg';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);
        console.log('Login: Attempting custom sign-in for:', email);

        try {
            await signIn(email, password);
            console.log('Login: Sign-in successful');
            navigate('/');
        } catch (err: any) {
            console.error("Login component error:", err);
            // Map common Supabase auth errors to friendly messages
            let userMessage = 'Erro ao tentar realizar login. Tente novamente.';
            if (err.message?.includes('Invalid login credentials')) {
                userMessage = 'Email ou senha incorretos.';
            } else if (err.message?.includes('Email not confirmed')) {
                userMessage = 'O email ainda não foi confirmado.';
            } else if (err.message?.includes('User not found')) {
                userMessage = 'Usuário não encontrado no sistema.';
            } else if (err.message) {
                userMessage = err.message; // Fallback to raw message if not generic
            }

            setError(userMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAdmin = async () => {
        setIsCreatingAdmin(true);
        setError('');
        setSuccess('');
        try {
            // 1. Ensure ADM role exists
            let adminRoleId: string | null = null;
            const { data: roles, error: rolesError } = await (supabase.from('roles') as any).select('id').eq('name', 'ADM');

            if (rolesError) throw new Error('Erro ao verificar roles: ' + rolesError.message);

            if (roles && roles.length > 0) {
                adminRoleId = roles[0].id;
            } else {
                const { data: newRole, error: createRoleError } = await (supabase.from('roles') as any).insert({
                    name: 'ADM',
                    description: 'Administrador do Sistema'
                }).select().single();

                if (createRoleError) throw new Error('Erro ao criar role ADM: ' + createRoleError.message);
                adminRoleId = newRole.id;
            }

            // 2. Direct insert into public.users (Custom Auth)
            const adminEmail = 'admin@techub.com.br';
            const password = 'admin123';

            // Hash the password before saving
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const { error: profileError } = await (supabase.from('users') as any).upsert({
                email: adminEmail,
                name: 'Admin Techub',
                password_hash: hashedPassword, // Store hashed password
                role_id: adminRoleId,
                active: true
            }, { onConflict: 'email' });

            if (profileError) throw new Error('Erro ao criar perfil Admin: ' + profileError.message);

            setSuccess('Admin criado diretamente no banco! User: ' + adminEmail + ' / Pass: admin123');
            setEmail(adminEmail);
            setPassword('admin123');

        } catch (err: any) {
            console.error('Create Admin error:', err);
            setError(err.message);
        } finally {
            setIsCreatingAdmin(false);
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black font-sans">
            {/* Video Background */}
            <video
                autoPlay
                loop
                muted
                className="absolute w-full h-full object-cover opacity-40 z-0"
            >
                <source src={backgroundVideo} type="video/mp4" />
            </video>

            {/* Overlay for better readability */}
            <div className="absolute inset-0 bg-black/60 z-0"></div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md p-8 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    {/* Logo Image */}
                    <div className="mb-6">
                        <img src={logoImg} alt="Techub Logo" className="h-12 w-auto mb-2" />
                    </div>

                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        TECHUB <span className="text-techub-green">POC</span>
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">Sistema de Gestão de Provas de Conceito</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg text-center flex items-center justify-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg text-center flex items-center justify-center gap-2">
                            <BadgeCheck className="w-4 h-4" />
                            {success}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wide ml-1">Usuário ou Email</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-techub-green transition-colors">
                                <Mail className="h-5 w-5" />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-techub-green/50 focus:border-techub-green transition-all"
                                placeholder="nome@techub.com.br"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wide ml-1">Senha</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-techub-green transition-colors">
                                <Lock className="h-5 w-5" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-10 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-techub-green/50 focus:border-techub-green transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-techub-green/20 text-sm font-bold text-black bg-techub-green hover:bg-techub-green-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-techub-green disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
                    </button>
                </form>

                <div className="mt-6 border-t border-zinc-800 pt-6">
                    <button
                        type="button"
                        onClick={handleCreateAdmin}
                        disabled={isCreatingAdmin}
                        className="w-full text-xs text-zinc-500 hover:text-techub-green transition-colors flex items-center justify-center gap-1"
                    >
                        {isCreatingAdmin ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Criar Admin Padrão (Ambiente Dev)'}
                    </button>
                </div>

                <div className="mt-4 text-center text-xs text-zinc-600">
                    © {new Date().getFullYear()} TECHUB. Todos os direitos reservados.
                </div>
            </div>
        </div>
    );
};

export default Login;
