import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    Calendar,
    LogOut,
    User,
    BarChart3,
    Menu,
    Shield,
    Settings
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const Layout: React.FC = () => {
    const { user, role, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const navItems = [
        {
            label: 'Dashboard',
            path: '/',
            icon: LayoutDashboard,
            roles: ['ADM', 'ANALISTA', 'COMERCIAL']
        },
        {
            label: 'Agenda',
            path: '/calendar',
            icon: Calendar,
            roles: ['ADM', 'ANALISTA', 'COMERCIAL']
        },
        {
            label: 'Central de Análise',
            path: '/approval-center',
            icon: Shield,
            roles: ['ADM']
        },
        {
            label: 'SLA e Relatórios',
            path: '/sla',
            icon: BarChart3,
            roles: ['ADM']
        },
        {
            label: 'Configurações',
            path: '/settings',
            icon: Settings,
            roles: ['ADM']
        },
    ];

    return (
        <div className="flex h-screen bg-black text-zinc-100 overflow-hidden font-sans">
            {/* Sidebar - Brutalist Dark */}
            <aside
                className={cn(
                    "bg-[#09090b] border-r border-zinc-800 transition-all duration-300 flex flex-col z-20",
                    isSidebarOpen ? "w-64" : "w-16" // Tighter collapsed width
                )}
            >
                <div className="h-16 flex items-center px-4 border-b border-zinc-800 bg-black">
                    <div className="flex items-center gap-3 overflow-hidden ml-1">
                        <div className="w-8 h-8 bg-techub-green flex items-center justify-center shrink-0 rounded-sm">
                            <span className="font-extrabold text-black text-sm tracking-tighter">TB</span>
                        </div>
                        <span className={cn(
                            "font-bold text-lg tracking-tight whitespace-nowrap transition-opacity duration-300 uppercase",
                            isSidebarOpen ? "opacity-100" : "opacity-0 invisible"
                        )}>
                            Techub <span className="text-techub-green">POC</span>
                        </span>
                    </div>
                </div>

                <nav className="flex-1 py-6 px-0 space-y-0.5 mt-2">
                    {navItems.map((item, index) => {
                        if (role && !item.roles.includes(role)) return null;

                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={cn(
                                    "w-full flex items-center px-4 py-3 text-sm font-medium transition-colors group relative animate-fade-in-up",
                                    `stagger-${(index % 4) + 1}`,
                                    isActive
                                        ? "bg-zinc-900 text-techub-green hw-accent" // Sharp hardware tab indicator
                                        : "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-100"
                                )}
                                title={!isSidebarOpen ? item.label : undefined}
                            >
                                <Icon className={cn(
                                    "w-5 h-5 shrink-0 transition-colors mr-3",
                                    isActive ? "text-techub-green" : "text-zinc-500 group-hover:text-zinc-300"
                                )} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={cn(
                                    "whitespace-nowrap transition-all duration-300 text-left w-full",
                                    isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 invisible absolute"
                                )}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-800 bg-[#09090b]">
                    <div className={cn("flex items-center gap-3", !isSidebarOpen && "justify-center")}>
                        <div className="w-8 h-8 rounded-sm bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                            <User className="w-4 h-4 text-techub-green" />
                        </div>
                        <div className={cn("flex-1 overflow-hidden transition-all duration-300", isSidebarOpen ? "opacity-100" : "opacity-0 w-0 invisible")}>
                            <p className="text-sm font-bold truncate text-zinc-300">{user?.email}</p>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 truncate">{role || 'Carregando...'}</p>
                        </div>
                        {isSidebarOpen && (
                            <button
                                onClick={handleSignOut}
                                className="p-2 rounded-sm bg-zinc-900 border border-zinc-800 hover:border-red-500/50 text-zinc-500 hover:text-red-400 transition-all btn-push flex-shrink-0"
                                title="Sair do Sistema"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 bg-black">
                {/* Header - Solid Black, no glassmorphism */}
                <header className="h-16 px-6 flex items-center justify-between border-b border-zinc-800 bg-[#09090b] sticky top-0 z-10">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-sm border border-zinc-800 bg-black hover:border-techub-green text-zinc-400 hover:text-techub-green transition-all btn-push"
                    >
                        <Menu className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-4">
                        {/* System Status Indicator - Brutalist detail */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-black border border-zinc-800 rounded-sm">
                            <span className="w-2 h-2 rounded-full bg-techub-green animate-pulse"></span>
                            <span className="text-xs font-bold tracking-widest uppercase text-zinc-500">System Online</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-6 md:p-8 overflow-auto">
                    <div className="max-w-7xl mx-auto h-full animate-fade-in-up">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
