import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { User, Mail, Shield, Calendar, LogOut, Key, Camera, Sparkles } from 'lucide-react';
import { Toast, ToastType } from '@/components/Toast';
import { supabase } from '@/integrations/supabase/client';

export default function Profile() {
    const { user, role, signOut, loading } = useAuth();
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type });
    };

    const handlePasswordReset = async () => {
        try {
            if (!user?.email) return;
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/auth`,
            });
            if (error) throw error;
            showToast('Password reset email sent!', 'success');
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    if (loading) return <div className="p-20 text-center">Loading profile...</div>;

    return (
        <div className="min-h-screen gradient-dreamy py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Profile Card */}
                <div className="card-magical overflow-hidden p-0 relative">
                    <div className="h-32 gradient-magic relative">
                        <div className="absolute -bottom-12 left-8 p-1 bg-background rounded-full border-4 border-background shadow-float">
                            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-4xl overflow-hidden">
                                {user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white border-2 border-background shadow-lg hover:scale-110 transition-transform">
                                <Camera className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="pt-16 pb-8 px-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold flex items-center gap-2">
                                    {user?.email?.split('@')[0]}
                                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20">
                                        {role}
                                    </span>
                                </h1>
                                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                                    <Mail className="w-4 h-4" />
                                    {user?.email}
                                </p>
                            </div>

                            <button
                                onClick={signOut}
                                className="px-6 py-2.5 rounded-xl border-2 border-destructive/30 text-destructive font-semibold hover:bg-destructive/10 transition-all flex items-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Account Details */}
                    <div className="card-magical space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            Account Details
                        </h2>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-muted-foreground" />
                                    <span className="font-medium">User Role</span>
                                </div>
                                <span className="font-bold text-primary capitalize">{role}</span>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-muted-foreground" />
                                    <span className="font-medium">Member Since</span>
                                </div>
                                <span className="font-bold">
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                                    <span className="font-medium">Total Books Created</span>
                                </div>
                                <span className="font-bold">Check My Library →</span>
                            </div>
                        </div>
                    </div>

                    {/* Security & Password */}
                    <div className="card-magical space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Key className="w-5 h-5 text-primary" />
                            Security
                        </h2>

                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                To update your password, we will send a secure reset link to your email address associated with this account.
                            </p>

                            <button
                                onClick={handlePasswordReset}
                                className="w-full btn-magic flex items-center justify-center gap-2"
                            >
                                <Key className="w-4 h-4" />
                                Reset Password via Email
                            </button>

                            <div className="pt-4 border-t border-border">
                                <h3 className="font-semibold text-sm mb-2">Two-Factor Authentication</h3>
                                <p className="text-xs text-muted-foreground mb-4">Add an extra layer of security to your magical account.</p>
                                <button disabled className="text-xs font-bold text-muted-foreground cursor-not-allowed opacity-50">
                                    Coming Soon...
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
