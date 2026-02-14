import React from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ThemeInsert } from '@/hooks/useThemes';

interface ThemeFormProps {
  initial?: Partial<ThemeInsert>;
  onSubmit: (data: ThemeInsert) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ThemeForm: React.FC<ThemeFormProps> = ({ initial, onSubmit, onCancel, loading }) => {
  const { register, handleSubmit, watch, setValue } = useForm<ThemeInsert>({
    defaultValues: {
      id: initial?.id ?? '',
      name: initial?.name ?? '',
      emoji: initial?.emoji ?? '',
      description: initial?.description ?? '',
      color_primary: initial?.color_primary ?? '#6b46c1',
      color_secondary: initial?.color_secondary ?? '#00d9ff',
      color_accent: initial?.color_accent ?? '#ff6b9d',
      color_background: initial?.color_background ?? '#ffffff',
      is_active: initial?.is_active ?? true,
      sort_order: initial?.sort_order ?? 0,
    },
  });

  const isEdit = !!initial?.id;
  const isActive = watch('is_active');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="id">ID (slug)</Label>
          <Input id="id" {...register('id', { required: true })} disabled={isEdit} placeholder="my_theme" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register('name', { required: true })} placeholder="My Theme" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emoji">Emoji</Label>
          <Input id="emoji" {...register('emoji')} placeholder="🌟" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input id="sort_order" type="number" {...register('sort_order', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...register('description')} placeholder="A short description" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['color_primary', 'color_secondary', 'color_accent', 'color_background'] as const).map((field) => (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={field} className="text-xs capitalize">{field.replace('color_', '')}</Label>
            <div className="flex gap-2 items-center">
              <input type="color" {...register(field)} className="w-8 h-8 rounded border border-border cursor-pointer" />
              <Input id={field} {...register(field)} className="text-xs" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={isActive}
          onCheckedChange={(v) => setValue('is_active', v)}
        />
        <Label>Active</Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {isEdit ? 'Update Theme' : 'Create Theme'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
