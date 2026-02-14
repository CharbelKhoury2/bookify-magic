import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ThemeForm } from '@/components/admin/ThemeForm';
import { useThemes, useThemeMutations, type DbTheme, type ThemeInsert } from '@/hooks/useThemes';
import { toast } from 'sonner';

const AdminThemes: React.FC = () => {
  const { data: themes, isLoading } = useThemes(true);
  const { upsert, remove, toggleActive } = useThemeMutations();
  const [editing, setEditing] = useState<Partial<ThemeInsert> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = (data: ThemeInsert) => {
    upsert.mutate(data, {
      onSuccess: () => {
        toast.success(editing?.id ? 'Theme updated!' : 'Theme created!');
        setEditing(null);
        setIsCreating(false);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this theme?')) return;
    remove.mutate(id, {
      onSuccess: () => toast.success('Theme deleted'),
      onError: (e) => toast.error(e.message),
    });
  };

  const showForm = isCreating || editing;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Themes</h2>
        {!showForm && (
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Theme
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editing?.id ? 'Edit Theme' : 'New Theme'}
          </h3>
          <ThemeForm
            initial={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => { setEditing(null); setIsCreating(false); }}
            loading={upsert.isPending}
          />
        </div>
      )}

      {/* Theme table */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-muted-foreground">Loading themes...</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground bg-muted/30">
                  <th className="p-4">Theme</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 text-center">Active</th>
                  <th className="p-4 text-center">Order</th>
                  <th className="p-4 text-center">Colors</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {themes?.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium text-foreground">
                      <span className="mr-2">{t.emoji}</span>{t.name}
                    </td>
                    <td className="p-4 text-muted-foreground max-w-[200px] truncate">{t.description}</td>
                    <td className="p-4 text-center">
                      <Switch
                        checked={t.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: t.id, is_active: v })}
                      />
                    </td>
                    <td className="p-4 text-center text-muted-foreground">{t.sort_order}</td>
                    <td className="p-4">
                      <div className="flex gap-1 justify-center">
                        {[t.color_primary, t.color_secondary, t.color_accent, t.color_background].map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded-full border border-border/50" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setIsCreating(false); setEditing(t); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminThemes;
