import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RequestPOC from './pages/RequestPOC';
import CalendarView from './pages/CalendarView';
import SLAAnalysis from './pages/SLAAnalysis';
import POCApprovalCenter from './pages/POCApprovalCenter';
import Settings from './pages/Settings';

const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
    const { user, role, loading } = useAuth();

    if (loading) return <div className="flex items-center justify-center h-screen bg-white text-techub-green">Loading...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
        return <div className="flex items-center justify-center h-screen text-red-600">Access Denied</div>;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<Layout />}>
                <Route path="/" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />

                <Route path="/request-poc" element={
                    <ProtectedRoute allowedRoles={['COMERCIAL', 'ADM']}>
                        <RequestPOC />
                    </ProtectedRoute>
                } />

                <Route path="/calendar" element={
                    <ProtectedRoute allowedRoles={['ADM', 'ANALISTA']}>
                        <CalendarView />
                    </ProtectedRoute>
                } />

                <Route path="/sla" element={
                    <ProtectedRoute allowedRoles={['ADM']}>
                        <SLAAnalysis />
                    </ProtectedRoute>
                } />

                <Route path="/approval-center" element={
                    <ProtectedRoute allowedRoles={['ADM']}>
                        <POCApprovalCenter />
                    </ProtectedRoute>
                } />

                <Route path="/settings" element={
                    <ProtectedRoute allowedRoles={['ADM']}>
                        <Settings />
                    </ProtectedRoute>
                } />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
                <div className="min-h-screen bg-white text-black font-sans">
                    <AppRoutes />
                </div>
            </AuthProvider>
        </Router>
    );
}

export default App;
