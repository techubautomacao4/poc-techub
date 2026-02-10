import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    role_id: string;
    roles?: {
        name: string;
    };
}

interface AuthContextType {
    user: UserProfile | null;
    role: string | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        const token = localStorage.getItem('poc_session_token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            // Check if token exists and is not expired
            const { data: sessionData, error: sessionError } = await (supabase.from('sessions') as any)
                .select('user_id, users(*, roles(name))')
                .eq('session_token', token)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (sessionError || !sessionData) {
                console.warn('Session expired or invalid');
                localStorage.removeItem('poc_session_token');
                setUser(null);
                setRole(null);
            } else {
                const userData = sessionData.users;
                setUser(userData);
                const roleName = userData.roles?.name || (Array.isArray(userData.roles) ? userData.roles[0]?.name : null);
                setRole(roleName);
            }
        } catch (err) {
            console.error('Error checking session:', err);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        setLoading(true);
        try {
            // 1. Verify user exists by email only (Avoiding 406 error)
            const { data: userData, error: userError } = await (supabase.from('users') as any)
                .select('*, roles(name)')
                .eq('email', email)
                .eq('active', true)
                .single();

            if (userError || !userData) {
                throw new Error('Usuário não encontrado ou inativo.');
            }

            // 2. Compare password using bcrypt
            const isValid = await bcrypt.compare(password, userData.password_hash);

            if (!isValid) {
                // Fallback for demo: if password matches plain text (for initial setup)
                if (password !== userData.password_hash) {
                    throw new Error('Senha incorreta.');
                }
            }

            // 2. Create session
            const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24h session

            const { error: sessionError } = await (supabase.from('sessions') as any).insert({
                user_id: userData.id,
                session_token: token,
                expires_at: expiresAt.toISOString()
            });

            if (sessionError) throw new Error('Erro ao criar sessão: ' + sessionError.message);

            // 3. Set state and storage
            localStorage.setItem('poc_session_token', token);
            setUser(userData);
            const roleName = userData.roles?.name || (Array.isArray(userData.roles) ? userData.roles[0]?.name : null);
            setRole(roleName);

        } catch (err) {
            setLoading(false);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        const token = localStorage.getItem('poc_session_token');
        if (token) {
            await (supabase.from('sessions') as any).delete().eq('session_token', token);
        }
        localStorage.removeItem('poc_session_token');
        setUser(null);
        setRole(null);
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
