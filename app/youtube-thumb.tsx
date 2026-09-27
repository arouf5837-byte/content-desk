'use client';
import {useState,useEffect} from 'react';
import {Image as ImageIcon,Download,Copy,Check,Upload,LoaderCircle,ExternalLink} from 'lucide-react';
import {db} from '@/lib/supabase';
import type {Row} from '@/lib/content';

interface Props {
  thumbnailUrl?: string | null;
  asset?: Row | null;
  contentTitle: string;
  onUpload?: (file: File) => void;
  uploading?: boolean;
}

export default function YouTubeThumbnail({thumbnailUrl,asset,contentTitle,onUpload,uploading}: Props) {
  const [url, setUrl] = useState<string>(thumbnailUrl || '');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (thumbnailUrl) {
      setUrl(thumbnailUrl);
      return;
    }
    if (asset) {
      let active = true;
      db.storage.from(asset.bucket_id || 'content-media').createSignedUrl(asset.storage_path, 3600).then(({data}) => {
        if (active && data?.signedUrl) {
          setUrl(data.signedUrl);
        }
      });
      return () => { active = false; };
    }
    setUrl('');
  }, [thumbnailUrl, asset]);

  async function handleDownload() {
    if (!url) return;
    setDownloading(true);
    try {
      const safeName = (contentTitle || 'youtube-thumbnail').replace(/[^a-zA-Z0-9\u0980-\u09FF_-]/g, '_').slice(0, 50) + '-thumb.jpg';
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    } finally {
      setDownloading(false);
    }
  }

  function handleCopy() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (url) {
    return (
      <div className="yt-thumb-box">
        <div className="yt-thumb-preview">
          <img src={url} alt={contentTitle} loading="lazy" />
          <span className="yt-thumb-badge">YouTube 16:9 Thumbnail</span>
        </div>
        <div className="yt-thumb-actions">
          <button type="button" className="primary small-btn" onClick={handleDownload} disabled={downloading}>
            {downloading ? <LoaderCircle size={14} className="spin" /> : <Download size={14} />}
            {downloading ? 'ডাউনলোড হচ্ছে…' : 'থাম্বনেইল ডাউনলোড'}
          </button>
          <button type="button" className="secondary small-btn" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'লিংক কপি হয়েছে' : 'থাম্বনেইল লিংক কপি'}
          </button>
          {onUpload && (
            <label className="secondary small-btn yt-change-thumb-btn">
              {uploading ? <LoaderCircle size={14} className="spin" /> : <Upload size={14} />}
              {uploading ? 'আপলোড হচ্ছে…' : 'নতুন ছবি আপলোড'}
              <input
                type="file"
                accept="image/*"
                style={{display: 'none'}}
                disabled={uploading}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="yt-thumb-empty">
      <div className="yt-thumb-placeholder">
        <ImageIcon size={28} />
        <div>
          <strong>থাম্বনেইল ছবি যুক্ত নেই</strong>
          <small>AI এজেন্ট দিয়ে পুশ করুন বা নিজে ছবি আপলোড করুন</small>
        </div>
      </div>
      {onUpload && (
        <label className="primary small-btn yt-upload-trigger">
          {uploading ? <LoaderCircle size={14} className="spin" /> : <Upload size={14} />}
          {uploading ? 'আপলোড হচ্ছে…' : '+ থাম্বনেইল ছবি নির্বাচন করো'}
          <input
            type="file"
            accept="image/*"
            style={{display: 'none'}}
            disabled={uploading}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
        </label>
      )}
    </div>
  );
}
