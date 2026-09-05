'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/admin/ui/card';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Skeleton } from '@/components/admin/ui/skeleton';

type Asset = {
  id: string;
  url: string;
  filename: string;
  mime: string;
  size: number;
  createdAt: string;
};

type Category = {
  id: string;
  name: string;
  _count: { assets: number };
  assets: Asset[];
};

export default function ResourcesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/resources');
      const data = await res.json();
      const list: Category[] = data.categories ?? [];
      setCategories(list);
      setSelectedId((cur) => cur ?? list[0]?.id ?? null);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const selected = categories.find((c) => c.id === selectedId) ?? null;

  const createCategory = async () => {
    const name = newName.trim();
    if (name.length < 2) return;
    setError('');
    try {
      const res = await fetch('/api/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create category');
        return;
      }
      setNewName('');
      setSelectedId(data.category.id);
      fetchAll();
    } catch {
      setError('Failed to create category');
    }
  };

  const deleteCategory = async (c: Category) => {
    if (!confirm(`Delete "${c.name}" and its ${c._count.assets} file(s)?`)) return;
    await fetch('/api/admin/resources', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, categoryId: c.id }),
    });
    setSelectedId(null);
    fetchAll();
  };

  const upload = async (file: File) => {
    if (!selected) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('categoryId', selected.id);
      form.append('file', file);
      const res = await fetch('/api/admin/resources', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }
      fetchAll();
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteAsset = async (a: Asset) => {
    if (!confirm(`Delete "${a.filename}"? URLs using it will break.`)) return;
    await fetch('/api/admin/resources', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id }),
    });
    fetchAll();
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Resources</h1>
        <p className="text-sm text-textDark">Media library for payment logos and QR codes. Click a file to copy its URL.</p>
      </div>

      {error && <p className="text-xs text-red font-semibold">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              categories.map((c) => (
                <div key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border ${selectedId === c.id ? 'border-blue/50 bg-blue/5' : 'border-border'}`}>
                  <button onClick={() => setSelectedId(c.id)} className="flex-1 text-left text-sm font-semibold text-white truncate">
                    {c.name} <span className="text-textDark font-normal">({c._count.assets})</span>
                  </button>
                  <button onClick={() => deleteCategory(c)} className="text-[11px] text-red hover:text-red-hover font-bold px-1">✕</button>
                </div>
              ))
            )}
            <div className="flex gap-2 pt-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category" />
              <Button size="sm" onClick={createCategory}>Add</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selected ? selected.name : 'Files'}</CardTitle>
              <label className={`text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors ${uploading ? 'opacity-50 bg-surface text-textDark' : 'bg-blue text-white hover:bg-blue-hover'}`}>
                {uploading ? 'Uploading...' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  disabled={uploading || !selected}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-textDark text-center py-8">Create a category first.</p>
            ) : selected.assets.length === 0 ? (
              <p className="text-sm text-textDark text-center py-8">No files yet. Upload logos or QR codes.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {selected.assets.map((a) => (
                  <div key={a.id} className="border border-border rounded-xl overflow-hidden bg-background">
                    <button onClick={() => copyUrl(a.url)} className="block w-full h-28 bg-black/40" title="Click to copy URL">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt={a.filename} className="w-full h-full object-contain" />
                    </button>
                    <div className="p-2 flex items-center gap-2">
                      <p className="flex-1 text-[10px] text-textDark truncate" title={a.filename}>{a.filename}</p>
                      <button onClick={() => deleteAsset(a)} className="text-[11px] text-red hover:text-red-hover font-bold">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
