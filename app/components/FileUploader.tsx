'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { toast } from 'sonner';

interface FileUploaderProps {
  value?: string;
  onChange?: (url: string) => void;
}

export function FileUploader({ value, onChange }: FileUploaderProps) {
  const [preview, setPreview] = useState<string | undefined>(value || undefined);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    setPreview(value || undefined);
  }, [value]);

  useEffect(() => {
    return () => {
      if (preview && !preview.startsWith('http') && !preview.startsWith('/api/')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const uploadFile = useCallback(
    async (file: File, localUrl: string) => {
      setUploading(true);
      setProgress(0);
      setError(false);
      try {
        const { url } = await new Promise<{ url: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const resp = JSON.parse(xhr.responseText) as { asset?: { url?: string }; error?: string };
                if (resp.asset?.url) resolve({ url: resp.asset.url });
                else reject(new Error(resp.error || 'Upload failed'));
              } catch {
                reject(new Error('Invalid response'));
              }
            } else {
              let message = `Upload failed: ${xhr.status}`;
              try {
                const resp = JSON.parse(xhr.responseText) as { error?: string };
                if (resp?.error) message = resp.error;
              } catch {}
              reject(new Error(message));
            }
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          const fd = new FormData();
          fd.append('file', file);
          xhr.open('POST', '/api/admin/resources');
          xhr.send(fd);
        });
        URL.revokeObjectURL(localUrl);
        setPreview(url);
        onChange?.(url);
        toast.success('File uploaded successfully');
      } catch (e) {
        console.error('Upload error:', e);
        toast.error(e instanceof Error ? e.message : 'Failed to upload file');
        setError(true);
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);
      uploadFile(file, localUrl);
    },
    [uploadFile],
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    if (rejections.length === 0) return;
    const code = rejections[0].errors[0]?.code;
    if (code === 'file-too-large') toast.error('File is too large, maximum size is 5MB');
    else if (code === 'too-many-files') toast.error('Select a single file');
    else toast.error('Only JPEG, PNG, WebP, GIF, SVG images allowed');
  }, []);

  const removeFile = useCallback(async () => {
    if (!preview) return;
    try {
      const match = preview.match(/\/api\/resources\/([A-Za-z0-9-]+)/);
      if (match) {
        await fetch('/api/admin/resources', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: match[1] }),
        }).catch(() => {});
      } else if (!preview.startsWith('http')) {
        URL.revokeObjectURL(preview);
      }
    } catch {}
    setPreview(undefined);
    onChange?.('');
    toast.success('File removed');
  }, [preview, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { 'image/*': [] },
    maxFiles: 1,
    multiple: false,
    maxSize: 5 * 1024 * 1024,
    disabled: uploading || !!preview,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-xl transition-colors w-full h-44 flex items-center justify-center overflow-hidden cursor-pointer ${
        isDragActive ? 'border-blue bg-blue/10' : error ? 'border-red/50' : 'border-border hover:border-blue/60'
      } ${uploading || preview ? 'cursor-default' : ''}`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="flex flex-col items-center gap-3 px-6 w-full">
          <span className="text-xs font-semibold text-text">Uploading… {progress}%</span>
          <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
            <div className="h-full rounded-full bg-blue transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : error && !preview ? (
        <div className="flex flex-col items-center gap-2 px-6 text-center">
          <span className="text-xs font-semibold text-red">Upload failed — click or drop to retry</span>
        </div>
      ) : preview ? (
        <>
          <img src={preview} alt="upload" className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeFile();
            }}
            title="Remove"
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-background/80 backdrop-blur border border-border flex items-center justify-center text-text hover:text-red transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 px-6 text-center">
          <svg className="w-8 h-8 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-semibold text-text">Drop image here or click to browse</span>
          <span className="text-[10px] text-text-dark">JPEG · PNG · WebP · GIF · SVG, max 5MB</span>
        </div>
      )}
    </div>
  );
}
