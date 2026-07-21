import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, Upload } from 'lucide-react';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** URL input with an optional direct-to-Cloudflare-R2 upload button. */
export default function ImageUrlField({
  value = '',
  onChange,
  lang = 'en',
  placeholder = 'https://...',
  className = '',
}) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setStatus('error');
      setMessage(lang === 'zh' ? '仅支持 JPG、PNG、GIF 或 WebP 图片。' : 'Only JPG, PNG, GIF, or WebP images are supported.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setStatus('error');
      setMessage(lang === 'zh' ? '图片大小不能超过 10 MB。' : 'The image must be 10 MB or smaller.');
      return;
    }

    setStatus('uploading');
    setMessage(lang === 'zh' ? '正在上传…' : 'Uploading…');
    try {
      const form = new FormData();
      form.append('image', file);
      const response = await fetch('/functions/image-upload', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) throw new Error(result.error || `Upload failed (${response.status})`);

      onChange(result.url);
      setStatus('success');
      setMessage(lang === 'zh' ? '上传成功，图片链接已更新。' : 'Upload complete. The image URL has been updated.');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || (lang === 'zh' ? '上传失败，请重试。' : 'Upload failed. Please try again.'));
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 px-3 py-2 rounded border border-gray-300 bg-white text-xs focus:ring-1 focus:ring-primary focus:outline-none"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={uploadImage}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === 'uploading'}
          className="shrink-0 px-3 py-2 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-60 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
        >
          {status === 'uploading' ? (
            <span className="h-3.5 w-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          <span>{status === 'uploading' ? (lang === 'zh' ? '上传中' : 'Uploading') : (lang === 'zh' ? '上传图片' : 'Upload image')}</span>
        </button>
      </div>
      {message && (
        <p className={`text-[10px] flex items-center gap-1 ${status === 'error' ? 'text-red-600' : status === 'success' ? 'text-emerald-600' : 'text-gray-500'}`}>
          {status === 'error' && <AlertTriangle size={11} />}
          {status === 'success' && <CheckCircle size={11} />}
          <span>{message}</span>
        </p>
      )}
      <p className="text-[10px] text-gray-400">
        {lang === 'zh' ? '可粘贴公网链接，或上传最大 10 MB 的图片。' : 'Paste a public URL, or upload an image up to 10 MB.'}
      </p>
    </div>
  );
}
