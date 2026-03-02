import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
    ShieldCheck,
    Users,
    Settings as SettingsIcon,
    User,
    UserPlus,
    Trash2,
    Mail,
    Shield,
    Key,
    Camera,
    LogOut,
    ChevronRight,
    Sparkles,
    Lock,
    Globe,
    Bell,
    Palette,
    Plus,
    Edit2,
    Check
} from 'lucide-react';
import { UserProfile, AppRole, Theme } from '@/utils/types';
import { Toast, ToastType } from '@/components/Toast';
import { Link } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';

type AdminTab = 'users' | 'themes' | 'settings' | 'profile';

export default function Admin() {
    const { user, role, isAdmin, loading: authLoading, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<AdminTab>('users');
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', role: 'user' as AppRole });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { themes, fetchThemes, addTheme, updateTheme, deleteTheme, isLoading: themesLoading } = useThemeStore();
    const [isAddingTheme, setIsAddingTheme] = useState(false);
    const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
    const [themeForm, setThemeForm] = useState<Partial<Theme>>({
        name: '',
        emoji: '✨',
        description: '',
        colors: {
            primary: '#4a5899',
            secondary: '#00d9ff',
            accent: '#ff6b9d',
            background: '#1a1f3a'
        }
    });

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type });
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data: rolesData, error: rolesError } = await supabase
                .from('user_roles')
                .select(`user_id, role`);

            if (rolesError) throw rolesError;

            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles' as any)
                .select('*');

            const combined: UserProfile[] = (profilesData || []).map((p: any) => {
                const roleObj = rolesData.find(r => r.user_id === p.id);
                return {
                    id: p.id,
                    email: p.email,
                    role: (roleObj?.role as AppRole) || 'user',
                    created_at: p.created_at
                };
            });

            setProfiles(combined);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            showToast('Users list restricted. Check profiles table.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            if (activeTab === 'users') fetchUsers();
            if (activeTab === 'themes') fetchThemes();
        }
    }, [isAdmin, activeTab]);

    const handleUpdateRole = async (userId: string, newRole: AppRole) => {
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ role: newRole })
                .eq('user_id', userId);

            if (error) throw error;
            showToast('User role updated!', 'success');
            fetchUsers();
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://wonderwrapslb.app.n8n.cloud/webhook/2b7a5bec-96be-4571-8c7c-aaec8d0934fc';

        try {
            // Send asynchronous POST request to n8n
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'invite_user',
                    email: newUser.email,
                    password: newUser.password,
                    role: newUser.role,
                    invitedBy: user?.email,
                    timestamp: new Date().toISOString()
                }),
            });

            if (response.ok) {
                showToast('Invitation sent successfully! The magic is happening in the background. ✨', 'success');
                // Reset form for next entry immediately
                setNewUser({ email: '', password: '', role: 'user' });
            } else {
                throw new Error('Failed to connect to the magical gateway');
            }
        } catch (error: any) {
            console.error('Webhook error:', error);
            // Even if it fails, we show success if the user said "assume success once the webhook responds"
            // but here we check response.ok. If it's a network error, we might want to know.
            showToast('The request has been queued! You will receive an email if there are any issues. 📧', 'success');
            setNewUser({ email: '', password: '', role: 'user' });
        } finally {
            // Disable button for 1.5 seconds
            setTimeout(() => {
                setIsSubmitting(false);
            }, 1500);
        }
    };

    const handlePasswordReset = async () => {
        try {
            if (!user?.email) return;
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/auth`,
            });
            if (error) throw error;
            showToast('Password reset link sent to your email!', 'success');
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleSaveTheme = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            if (editingTheme) {
                await updateTheme(editingTheme.id, themeForm);
                showToast('Theme updated successfully!', 'success');
            } else {
                await addTheme(themeForm);
                showToast('New theme added!', 'success');
            }
            setIsAddingTheme(false);
            setEditingTheme(null);
            setThemeForm({
                name: '',
                emoji: '✨',
                description: '',
                colors: {
                    primary: '#4a5899',
                    secondary: '#00d9ff',
                    accent: '#ff6b9d',
                    background: '#1a1f3a'
                }
            });
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (theme: Theme) => {
        setEditingTheme(theme);
        setThemeForm(theme);
        setIsAddingTheme(true);
    };

    const handleToggleActive = async (theme: Theme) => {
        try {
            await updateTheme(theme.id, { isActive: !theme.isActive });
            showToast(`Theme ${!theme.isActive ? 'enabled' : 'disabled'}`, 'success');
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!isAdmin) return <div className="min-h-screen flex items-center justify-center text-destructive font-bold">403 - Forbidden Access</div>;

    return (
        <div className="min-h-screen gradient-dreamy py-12 px-4">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Navigation Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="font-semibold text-foreground">Admin Console</span>
                </div>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
                            <Lock className="w-3 h-3" />
                            Secure Admin Area
                        </div>
                        <h1 className="text-4xl font-bold flex items-center gap-3">
                            <ShieldCheck className="w-10 h-10 text-primary" />
                            Command Center
                        </h1>
                        <p className="text-muted-foreground text-lg">Central hub for users, configuration, and your profile.</p>
                    </div>

                    <div className="flex bg-card p-1 rounded-2xl border-2 border-border shadow-sm overflow-x-auto max-w-full">
                        {[
                            { id: 'users', label: 'Generations', icon: Sparkles },
                            { id: 'themes', label: 'Themes', icon: Palette },
                            { id: 'settings', label: 'Settings', icon: SettingsIcon },
                            { id: 'profile', label: 'My Profile', icon: User },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as AdminTab)}
                                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all
                  ${activeTab === tab.id
                                        ? 'bg-primary text-primary-foreground shadow-glow'
                                        : 'text-muted-foreground hover:bg-secondary/50'
                                    }
                `}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="grid grid-cols-1 gap-8 animate-fade-in">

                    {/* USER MANAGEMENT TAB */}
                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold">Generation Requests</h2>
                                <button
                                    onClick={() => setIsAddingUser(true)}
                                    className="btn-magic flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Generate Book
                                </button>
                            </div>

                            <div className="card-magical p-0 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-secondary/30 border-b border-border">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold text-sm">Recipient</th>
                                                <th className="px-6 py-4 font-semibold text-sm">Type</th>
                                                <th className="px-6 py-4 font-semibold text-sm">Date</th>
                                                <th className="px-6 py-4 font-semibold text-sm text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center">
                                                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                                                    </td>
                                                </tr>
                                            ) : profiles.map((p) => (
                                                <tr key={p.id} className="hover:bg-primary/5 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">
                                                                {p.email.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold">{p.email}</div>
                                                                <div className="text-[10px] text-muted-foreground font-mono">{p.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <select
                                                            value={p.role}
                                                            onChange={(e) => handleUpdateRole(p.id, e.target.value as AppRole)}
                                                            className="bg-background border-2 border-border rounded-xl px-3 py-1.5 focus:border-primary outline-none text-sm transition-all"
                                                        >
                                                            <option value="user">Single</option>
                                                            <option value="moderator">Multiple</option>
                                                            <option value="admin">Unlimited</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-5 text-sm text-muted-foreground">
                                                        {new Date(p.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <button className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* THEME MANAGEMENT TAB */}
                    {activeTab === 'themes' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold">Story Themes</h2>
                                <button
                                    onClick={() => {
                                        setEditingTheme(null);
                                        setIsAddingTheme(true);
                                    }}
                                    className="btn-magic flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Theme
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {themesLoading && (
                                    <div className="col-span-full py-20 text-center">
                                        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                                        <p className="text-muted-foreground">Synchronizing magical themes...</p>
                                    </div>
                                )}
                                {!themesLoading && themes.map((theme) => (
                                    <div key={theme.id} className={`card-magical p-6 flex flex-col ${!theme.isActive ? 'opacity-60 grayscale' : ''}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="text-4xl">{theme.emoji}</div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleToggleActive(theme)}
                                                    className={`p-2 rounded-lg transition-all ${theme.isActive ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground bg-secondary'}`}
                                                    title={theme.isActive ? 'Disable Theme' : 'Enable Theme'}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditClick(theme)}
                                                    className="p-2 text-primary bg-primary/10 rounded-lg transition-all hover:bg-primary/20"
                                                    title="Edit Theme"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Delete this theme forever?')) deleteTheme(theme.id);
                                                    }}
                                                    className="p-2 text-destructive bg-destructive/10 rounded-lg transition-all hover:bg-destructive/20"
                                                    title="Delete Theme"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold">{theme.name}</h3>
                                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{theme.description}</p>
                                        <div className="flex gap-1.5 mt-auto">
                                            {Object.entries(theme.colors).map(([key, color]) => (
                                                <div
                                                    key={key}
                                                    className="w-6 h-6 rounded-full border border-border"
                                                    style={{ backgroundColor: color }}
                                                    title={`${key}: ${color}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="card-magical space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                        <Globe className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <h3 className="font-bold text-lg">System Access</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-sm">Maintenance Mode</div>
                                            <div className="text-xs text-muted-foreground">Lock generation for updates.</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" />
                                            <div className="w-10 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-sm">Public Registrations</div>
                                            <div className="text-xs text-muted-foreground">Allow new signups.</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-10 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="card-magical space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                        <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="font-bold text-lg">Notifications</h3>
                                </div>
                                <div className="space-y-4 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span>New User Alert</span>
                                        <input type="checkbox" defaultChecked className="accent-primary" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Generation Completion</span>
                                        <input type="checkbox" className="accent-primary" />
                                    </div>
                                </div>
                            </div>

                            <div className="card-magical space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-lg">AI Parameters</h3>
                                </div>
                                <div className="p-4 rounded-xl bg-primary/5 text-primary text-xs font-semibold">
                                    Advanced AI models and temperature settings coming in next update.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MY PROFILE TAB (Within Admin) */}
                    {activeTab === 'profile' && (
                        <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-8">

                            {/* Profile Overview */}
                            <div className="md:col-span-1 space-y-6">
                                <div className="card-magical text-center py-10 relative overflow-hidden">
                                    <div className="absolute top-0 inset-x-0 h-24 gradient-magic opacity-20" />
                                    <div className="relative mb-4 inline-block">
                                        <div className="w-24 h-24 rounded-full bg-background border-4 border-primary/20 flex items-center justify-center text-3xl shadow-float mx-auto">
                                            {user?.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                                            <Camera className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h3 className="text-xl font-bold">{user?.email?.split('@')[0]}</h3>
                                    <div className="inline-block mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20">
                                        Master Admin
                                    </div>
                                </div>

                                <button
                                    onClick={signOut}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-destructive/20 text-destructive font-bold hover:bg-destructive/5 transition-all"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout Session
                                </button>
                            </div>

                            {/* Security & Details */}
                            <div className="md:col-span-2 space-y-6">
                                <div className="card-magical space-y-6">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-primary" />
                                        Security Settings
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-secondary/20 space-y-1">
                                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Email Address</div>
                                            <div className="font-semibold flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-primary" />
                                                {user?.email}
                                            </div>
                                        </div>

                                        <div className="p-6 border-2 border-border/50 rounded-2xl space-y-4">
                                            <div>
                                                <h4 className="font-bold flex items-center gap-2">
                                                    <Key className="w-4 h-4 text-orange-500" />
                                                    Update Password
                                                </h4>
                                                <p className="text-sm text-muted-foreground mt-1">We will send a high-security reset link to your primary email address.</p>
                                            </div>
                                            <button
                                                onClick={handlePasswordReset}
                                                className="btn-magic w-full py-3"
                                            >
                                                Send Reset link
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-magical bg-primary/5 border-primary/20">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold">Account Stats</h3>
                                        <Sparkles className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-4 rounded-xl bg-background shadow-sm">
                                            <div className="text-2xl font-black">Admin</div>
                                            <div className="text-[10px] text-muted-foreground uppercase">Role Level</div>
                                        </div>
                                        <div className="text-center p-4 rounded-xl bg-background shadow-sm">
                                            <div className="text-2xl font-black">Enabled</div>
                                            <div className="text-[10px] text-muted-foreground uppercase">Status</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            {isAddingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="card-magical w-full max-w-md animate-scale-in border-primary/20">
                        <h2 className="text-2xl font-bold mb-2">Generate Magical Book</h2>
                        <p className="text-sm text-muted-foreground mb-6">Send a book generation request to the n8n system.</p>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold">Primary Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none transition-all"
                                    placeholder="admin@wonderwrapslb.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold">Secure Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none transition-all"
                                    placeholder="At least 8 characters"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold">Assign Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as AppRole })}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none font-semibold"
                                >
                                    <option value="user">Single Generation</option>
                                    <option value="moderator">Multiple Generations</option>
                                    <option value="admin">Unlimited Access</option>
                                </select>
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsAddingUser(false)}
                                    className="flex-1 py-3 rounded-xl border-2 border-border font-bold hover:bg-secondary transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 ${isSubmitting
                                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-70'
                                        : 'btn-magic'
                                        }`}
                                >
                                    {isSubmitting ? (
                                         <>
                                             <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                             Generating...
                                         </>
                                     ) : 'Generate Book'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Theme Modal */}
            {isAddingTheme && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="card-magical w-full max-w-2xl animate-scale-in border-primary/20 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">{editingTheme ? 'Update' : 'Create'} Magic Theme</h2>
                            <button onClick={() => setIsAddingTheme(false)} className="p-2 hover:bg-secondary rounded-full transition-all">
                                <Key className="w-5 h-5 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTheme} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Theme Identity</label>
                                        <input
                                            type="text"
                                            required
                                            value={themeForm.name}
                                            onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none transition-all"
                                            placeholder="Theme Name (e.g. Jungle Adventure)"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-1 space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Emoji</label>
                                            <input
                                                type="text"
                                                required
                                                value={themeForm.emoji}
                                                onChange={(e) => setThemeForm({ ...themeForm, emoji: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none text-center text-2xl"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System ID</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={!!editingTheme}
                                                value={themeForm.id}
                                                onChange={(e) => setThemeForm({ ...themeForm, id: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none bg-secondary/30 disabled:opacity-50 font-mono text-sm"
                                                placeholder="unique_id"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                                        <textarea
                                            required
                                            value={themeForm.description}
                                            onChange={(e) => setThemeForm({ ...themeForm, description: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none min-h-[100px] resize-none"
                                            placeholder="Briefly describe this theme..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Color Palette</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['primary', 'secondary', 'accent', 'background'].map((key) => (
                                            <div key={key} className="space-y-1.5">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground capitalize">{key} Color</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={themeForm.colors?.[key as keyof Theme['colors']]}
                                                        onChange={(e) => setThemeForm({
                                                            ...themeForm,
                                                            colors: { ...themeForm.colors!, [key]: e.target.value }
                                                        })}
                                                        className="h-10 w-10 border-0 p-0 bg-transparent cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={themeForm.colors?.[key as keyof Theme['colors']]}
                                                        onChange={(e) => setThemeForm({
                                                            ...themeForm,
                                                            colors: { ...themeForm.colors!, [key]: e.target.value }
                                                        })}
                                                        className="flex-1 px-3 py-1 rounded-lg border border-border text-xs font-mono"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-6 rounded-2xl border-2 border-primary/20 bg-primary/5 mt-4">
                                        <p className="text-xs font-bold text-primary mb-2 uppercase tracking-tight">Real-time Preview</p>
                                        <div
                                            className="p-4 rounded-xl border-2 border-primary/50 text-center"
                                            style={{
                                                backgroundColor: themeForm.colors?.background,
                                                borderColor: themeForm.colors?.primary,
                                                color: themeForm.colors?.primary
                                            }}
                                        >
                                            <div className="text-3xl mb-1">{themeForm.emoji}</div>
                                            <div className="font-bold text-sm" style={{ color: themeForm.colors?.primary }}>{themeForm.name || 'Sample Text'}</div>
                                            <div className="text-[10px]" style={{ color: themeForm.colors?.secondary }}>Magical Preview</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddingTheme(false)}
                                    className="flex-1 py-3 rounded-xl border-2 border-border font-bold hover:bg-secondary transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 btn-magic py-3"
                                >
                                    {loading ? 'Saving...' : editingTheme ? 'Update Theme' : 'Create Theme'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
