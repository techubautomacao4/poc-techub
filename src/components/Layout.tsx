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
        <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside
                className={cn(
                    "bg-zinc-900 border-r border-zinc-800 transition-all duration-300 flex flex-col z-20",
                    isSidebarOpen ? "w-64" : "w-20"
                )}
            >
                <div className="h-16 flex items-center px-6 border-b border-zinc-800">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-techub-green flex items-center justify-center shrink-0">
                            <span className="font-bold text-black text-sm">T</span>
                        </div>
                        <span className={cn(
                            "font-bold text-lg tracking-tight whitespace-nowrap transition-opacity duration-300",
                            isSidebarOpen ? "opacity-100" : "opacity-0 invisible"
                        )}>
                            Techub <span className="text-techub-green">POC</span>
                        </span>
                    </div>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1">
                    {navItems.map((item) => {
                        if (role && !item.roles.includes(role)) return null;

                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                                    isActive
                                        ? "bg-techub-green/10 text-techub-green"
                                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                                )}
                                title={!isSidebarOpen ? item.label : undefined}
                            >
                                <Icon className={cn(
                                    "w-5 h-5 shrink-0 transition-colors",
                                    isActive ? "text-techub-green" : "text-zinc-500 group-hover:text-zinc-100"
                                )} />
                                <span className={cn(
                                    "whitespace-nowrap transition-all duration-300",
                                    isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 invisible absolute"
                                )}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <div className={cn("flex items-center gap-3", !isSidebarOpen && "justify-center")}>
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div className={cn("flex-1 overflow-hidden transition-all duration-300", isSidebarOpen ? "opacity-100" : "opacity-0 w-0 invisible")}>
                            <p className="text-sm font-medium truncate">{user?.email}</p>
                            <p className="text-xs text-zinc-500 truncate">{role || 'Carregando...'}</p>
                        </div>
                        {isSidebarOpen && (
                            <button
                                onClick={handleSignOut}
                                className="p-1.5 rounded-md hover:bg-red-900/30 text-zinc-500 hover:text-red-400 transition-colors"
                                title="Sair"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <header className="h-16 px-8 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 -ml-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Breadcrumb or Page Title could go here */}
                    <div className="flex items-center gap-4">
                        {/* Notifications or other header items */}
                    </div>
                </header>

                <div className="flex-1 p-8 overflow-auto">
                    <div className="max-w-7xl mx-auto h-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
