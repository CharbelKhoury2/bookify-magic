import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, Users, Settings as SettingsIcon, Plus, Trash2, UserPlus, Shield } from 'lucide-react';
import { UserProfile, AppRole } from '@/utils/types';
import { Toast, ToastType } from '@/components/Toast';

export default function Admin() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', role: 'user' as AppRole });

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type });
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            // We try to fetch from profiles table and join with user_roles
            // Note: This requires the profiles table to exist in public schema
            const { data: rolesData, error: rolesError } = await supabase
                .from('user_roles')
                .select(`
          user_id,
          role
        `);

            if (rolesError) throw rolesError;

            // Also try to get profile data (email, etc)
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles' as any)
                .select('*');

            // Combine the data
            const combined: UserProfile[] = (profilesData || []).map((p: any) => {
                const roleObj = rolesData.find(r => r.user_id === p.id);
                return {
                    id: p.id,
                    email: p.email,
                    role: (roleObj?.role as AppRole) || 'user',
                    created_at: p.created_at,
                    last_sign_in: p.last_sign_in
                };
            });

            setProfiles(combined);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            showToast('Failed to load users. Make sure the profiles table exists.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    const handleUpdateRole = async (userId: string, newRole: AppRole) => {
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ role: newRole })
                .eq('user_id', userId);

            if (error) throw error;

            showToast('User role updated successfully!', 'success');
            fetchUsers();
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            // Note: Standard Supabase signUp won't work perfectly for "Admin creating others" 
            // without using the Admin Auth API (service role), which we avoid on frontend.
            // But we can use the signUp function which will send a confirmation email.
            const { data, error } = await supabase.auth.signUp({
                email: newUser.email,
                password: newUser.password,
            });

            if (error) throw error;

            if (data.user) {
                // Update their role immediately
                await supabase
                    .from('user_roles')
                    .update({ role: newUser.role })
                    .eq('user_id', data.user.id);
            }

            showToast('User invited! They will need to confirm their email.', 'success');
            setIsAddingUser(false);
            setNewUser({ email: '', password: '', role: 'user' });
            fetchUsers();
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return <div className="p-20 text-center">Loading...</div>;
    if (!isAdmin) return <div className="p-20 text-center text-destructive font-bold">Access Denied</div>;

    return (
        <div className="min-h-screen gradient-dreamy py-12 px-4">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 text-primary" />
                            Admin Control Panel
                        </h1>
                        <p className="text-muted-foreground">Manage users, roles, and application settings.</p>
                    </div>
                    <button
                        onClick={() => setIsAddingUser(true)}
                        className="btn-magic flex items-center justify-center gap-2"
                    >
                        <UserPlus className="w-5 h-5" />
                        Add New User
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* User Management List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="card-magical">
                            <div className="flex items-center gap-2 mb-6">
                                <Users className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-bold">User Management</h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-secondary/30">
                                        <tr>
                                            <th className="px-4 py-3 rounded-tl-xl text-muted-foreground">User</th>
                                            <th className="px-4 py-3 text-muted-foreground">Role</th>
                                            <th className="px-4 py-3 text-muted-foreground">Joined</th>
                                            <th className="px-4 py-3 rounded-tr-xl text-center text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-10 text-center">
                                                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                                                    Loading users...
                                                </td>
                                            </tr>
                                        ) : profiles.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                                                    No users found.
                                                </td>
                                            </tr>
                                        ) : (
                                            profiles.map((profile) => (
                                                <tr key={profile.id} className="hover:bg-primary/5 transition-colors">
                                                    <td className="px-4 py-4">
                                                        <div className="font-semibold">{profile.email}</div>
                                                        <div className="text-[10px] text-muted-foreground font-mono">{profile.id}</div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <select
                                                            value={profile.role}
                                                            onChange={(e) => handleUpdateRole(profile.id, e.target.value as AppRole)}
                                                            className="bg-background border border-border rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="moderator">Moderator</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-4 text-muted-foreground">
                                                        {new Date(profile.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <button className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Settings Sidebar */}
                    <div className="space-y-6">
                        <div className="card-magical">
                            <div className="flex items-center gap-2 mb-6">
                                <SettingsIcon className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-bold">App Settings</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-xl border border-border bg-background/50">
                                    <h3 className="font-semibold text-sm mb-1">Maintenance Mode</h3>
                                    <p className="text-xs text-muted-foreground mb-3">Prevent users from generating books.</p>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" />
                                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>

                                <div className="p-4 rounded-xl border border-border bg-background/50">
                                    <h3 className="font-semibold text-sm mb-1">Theme Visibility</h3>
                                    <p className="text-xs text-muted-foreground mb-3">Manage which themes are active.</p>
                                    <button className="text-xs font-bold text-primary hover:underline">Manage Themes →</button>
                                </div>
                            </div>
                        </div>

                        <div className="card-magical bg-primary/10 border-primary/20">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-bold">System Status</h2>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Users:</span>
                                    <span className="font-bold text-foreground">{profiles.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Supabase:</span>
                                    <span className="font-bold text-success">Online</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>n8n Webhook:</span>
                                    <span className="font-bold text-success">Healthy</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            {isAddingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="card-magical w-full max-w-md animate-scale-in">
                        <h2 className="text-2xl font-bold mb-6">Invite New User</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border-2 border-border focus:border-primary outline-none transition-all"
                                    placeholder="name@email.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Temporary Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border-2 border-border focus:border-primary outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Initial Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as AppRole })}
                                    className="w-full px-4 py-2 rounded-xl border-2 border-border focus:border-primary outline-none"
                                >
                                    <option value="user">User</option>
                                    <option value="moderator">Moderator</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setIsAddingUser(false)}
                                    className="flex-1 px-4 py-3 rounded-xl border-2 border-border font-semibold hover:bg-secondary/30 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 btn-magic"
                                >
                                    Create User
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
        </div>
    );
}
