'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogHeader, DialogContent } from '@/components/admin/ui/dialog';
import { FileUploader } from '@/app/components/FileUploader';

interface PickerAsset {
  id: string;
  url: string;
  filename: string;
}

export function ResourcePicker({
  title,
  onClose,
  onPick,
}: {
  title: string;
  onClose: () => void;
  onPick: (url: string | null) => void;
}) {
  const [cats, setCats] = useState<Array<{ id: string; name: string; assets: PickerAsset[] }>>([]);
  const [catId, setCatId] = useState<string>('');
  const [showUpload, setShowUpload] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/resources')
      .then((r) => r.json())
      .then((d) => {
        const list = d.categories ?? [];
        setCats(list);
        setCatId((prev) => (list.some((c: { id: string }) => c.id === prev) ? prev : (list[0]?.id ?? '')));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const assets = cats.find((c) => c.id === catId)?.assets ?? [];

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </DialogHeader>
      <DialogContent className="space-y-3">
        {!showUpload ? (
          <>
            <button
              onClick={() => setShowUpload(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-border text-xs font-bold text-text hover:text-foreground hover:border-blue/60 transition-colors"
            >
              + Upload new image
            </button>
            <div className="flex gap-2 flex-wrap">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCatId(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${catId === c.id ? 'border-blue/50 bg-blue/10 text-foreground' : 'border-border text-textDark'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {assets.length === 0 ? (
              <p className="text-xs text-textDark text-center py-6">No images here yet.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
                {assets.map((a) => (
                  <button key={a.id} onClick={() => onPick(a.url)} className="border border-border rounded-lg overflow-hidden hover:border-blue/50 bg-black/40" title={a.filename}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.filename} className="w-full h-16 object-contain" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <FileUploader
              onChange={(url) => {
                if (url) {
                  load();
                  onPick(url);
                }
              }}
            />
            <button
              onClick={() => {
                setShowUpload(false);
                load();
              }}
              className="w-full py-2 rounded-xl text-xs font-bold text-text hover:text-foreground transition-colors"
            >
              ← Back to library
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
