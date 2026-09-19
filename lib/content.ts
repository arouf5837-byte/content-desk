export type Row = {id:string;[key:string]:any};
export type Data = Record<string,Row[]>;
export const tables=['businesses','destinations','contents','content_variants','assets','posts','post_metrics','products','destination_products','lead_magnets','audience_leads','lead_interactions'];
export const emptyData:Data=Object.fromEntries(tables.map(t=>[t,[]]));
export const platforms:Record<string,string>={facebook:'Facebook',instagram:'Instagram',tiktok:'TikTok',linkedin:'LinkedIn',x:'X / Twitter',other:'অন্যান্য'};
export const contentStates:Record<string,string>={idea:'আইডিয়া',draft:'খসড়া',review:'রিভিউ',ready:'প্রস্তুত',archived:'আর্কাইভ'};
export const postStates:Record<string,string>={planned:'পরিকল্পিত',scheduled:'নির্ধারিত',pending_approval:'অনুমোদনের অপেক্ষায়',published:'প্রকাশিত',failed:'ব্যর্থ',rejected:'প্রত্যাখ্যাত',cancelled:'বাতিল'};
export const formats:Record<string,string>={text:'লেখা',image:'ছবি',carousel:'ক্যারোসেল',video:'ভিডিও',reel:'রিল / শর্ট ভিডিও',story:'স্টোরি'};
export const intents:Record<string,string>={awareness:'পরিচিতি বাড়ানো',education:'বোঝানো / শেখানো',trust:'বিশ্বাস তৈরি',leads:'ইনকোয়ারি / লিড',sales:'বিক্রি',engagement:'আলোচনা / এনগেজমেন্ট',retention:'পুরোনো ক্রেতা ধরে রাখা'};
export const sources:Record<string,string>={manual:'নিজে তৈরি',ai:'AI দিয়ে',mixed:'AI + নিজে'};
export const metricLabels:Record<string,string>={reach:'রিচ',impressions:'ইমপ্রেশন',views:'ভিউ',likes:'লাইক',comments:'কমেন্ট',shares:'শেয়ার',saves:'সেভ',clicks:'ক্লিক',keyword_comments:'কিওয়ার্ড কমেন্ট',dm_count:'ডিএম (DM)',resource_requests:'রিসোর্স রিকোয়েস্ট',profile_visits:'প্রোফাইল ভিজিট',new_followers:'নতুন ফলোয়ার',inquiries:'ইনকোয়ারি',qualified_leads:'যোগ্য লিড',booked_calls:'বুক করা কল',orders:'অর্ডার',revenue:'বিক্রির পরিমাণ',spend:'খরচ'};

export const leadMagnetTypes:Record<string,string>={
 pdf:'পিডিএফ গাইড',
 github_repo:'GitHub রিপো',
 google_doc:'গুগল ডক',
 notion_doc:'নোশন ডক',
 checklist:'চেকলিস্ট',
 prompt_pack:'প্রম্পট প্যাক',
 template:'টেমপ্লেট / ব্লুপ্রিন্ট',
 video_demo:'ভিডিও ডেমো',
 other:'অন্যান্য'
};

export const funnelStages:Record<string,string>={
 awareness:'সচেতনতা (Top)',
 interest:'আগ্রহ (Mid)',
 consideration:'বিবেচনা (High-Intent)',
 conversion:'ক্লায়েন্ট রূপান্তর (Bottom)'
};

export const leadMagnetStates:Record<string,string>={
 draft:'খসড়া',
 active:'সক্রিয়',
 paused:'স্থগিত',
 archived:'আর্কাইভ'
};

export const leadStatuses:Record<string,string>={
 new:'নতুন',
 contacted:'যোগাযোগ হয়েছে',
 qualified:'যোগ্য ক্লায়েন্ট',
 unqualified:'অযোগ্য',
 converted:'ক্লায়েন্ট হয়েছে',
 archived:'আর্কাইভ'
};

export const channels:Record<string,string>={
 comment:'কমেন্ট',
 dm:'ডিএম / মেসেজ',
 email:'ইমেইল',
 call:'কল',
 other:'অন্যান্য'
};

export const interactionTypes:Record<string,string>={
 keyword_comment:'কিওয়ার্ড কমেন্ট',
 inquiry:'ইনকোয়ারি',
 dm_sent:'ডিএম পাঠানো',
 resource_sent:'রিসোর্স পাঠানো',
 call_booked:'কল বুক করা',
 feedback:'মতামত',
 other:'অন্যান্য'
};

export const followUpStates:Record<string,string>={
 none:'প্রয়োজন নেই',
 needed:'প্রয়োজন',
 in_progress:'চলমান',
 completed:'সম্পন্ন',
 closed:'বন্ধ'
};

export const growthGoals:Record<string,string>={
 lead_generation:'লিড সংগ্রহ',
 audience_growth:'অডিয়েন্স বৃদ্ধি',
 authority:'ব্র্যান্ড প্রতিষ্ঠা',
 client_conversion:'ক্লায়েন্ট অর্জন'
};
export type Filters={business:string;product:string;q:string;platform:string;status:string;format:string;source:string;destination:string;from:string;to:string;distribution:string};
export const defaults:Filters={business:'all',product:'all',q:'',platform:'all',status:'all',format:'all',source:'all',destination:'all',from:'',to:'',distribution:'all'};
export function localDate(iso?:string|null){if(!iso)return '';return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso))}
export function localInput(iso?:string|null){if(!iso)return '';const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));const v=(k:string)=>p.find(x=>x.type===k)?.value;return v('year')+'-'+v('month')+'-'+v('day')+'T'+v('hour')+':'+v('minute')}
export function fromInput(value:string){return value?new Date(value+':00+06:00').toISOString():null}
export function dateLabel(value?:string|null,time=false){return value?new Date(value).toLocaleString('bn-BD',{timeZone:'Asia/Dhaka',day:'numeric',month:'short',year:'numeric',...(time?{hour:'numeric',minute:'2-digit'}:{})}):'—'}
export function number(value:unknown){return value==null?'—':Number(value).toLocaleString('bn-BD')}
export function postDate(p:Row){return p.published_at||p.scheduled_at||p.submitted_at||p.created_at}
export function latestMetrics(rows:Row[],asOf?:string){const map=new Map<string,Row>();for(const r of rows){if(asOf&&localDate(r.measured_at)>asOf)continue;const old=map.get(r.post_id);if(!old||new Date(r.measured_at).getTime()>new Date(old.measured_at).getTime())map.set(r.post_id,r)}return map}
export function filtered(data:Data,f:Filters,mode:string){
 const activeBusinesses=new Set(data.businesses.filter(b=>!b.archived_at).map(b=>b.id));
 const business=(r:Row)=>activeBusinesses.has(r.business_id)&&(f.business==='all'||r.business_id===f.business);
 const period=(value:string)=>{const d=localDate(value);return(!f.from||d>=f.from)&&(!f.to||d<=f.to)};
 const contentMatch=(c:Row)=>business(c)&&(f.product==='all'||(f.product==='none'?!c.product_id:c.product_id===f.product))&&(f.format==='all'||c.format===f.format)&&(f.source==='all'||c.source===f.source)&&(!f.q||[c.title,c.topic,c.offer_name,c.content_pillar,c.target_audience,c.hook,c.cta,c.brief,c.script,...(c.tags||[])].filter(Boolean).join(' ').toLowerCase().includes(f.q.toLowerCase()));
 const candidates=data.contents.filter(contentMatch);
 const ids=new Set(candidates.map(c=>c.id));
 const variants=new Map(data.content_variants.map(v=>[v.id,v]));
 const posts=data.posts.filter(p=>business(p)&&ids.has(variants.get(p.variant_id)?.content_id)&&(f.platform==='all'||p.platform===f.platform)&&(f.destination==='all'||p.destination_id===f.destination)&&(f.distribution==='all'||p.distribution===f.distribution)&&(mode==='library'||f.status==='all'||p.status===f.status)&&period(postDate(p)));
 const contents=candidates.filter(c=>(mode!=='library'||f.status==='all'||c.status===f.status)&&period(c.created_at)&&(f.platform==='all'||data.content_variants.some(v=>v.content_id===c.id&&v.platform===f.platform))&&(f.destination==='all'||posts.some(p=>variants.get(p.variant_id)?.content_id===c.id)));
 return {contents,posts};
}
export function errorText(e:unknown){const x=e as {message?:string;code?:string};if(x.code==='23505')return 'এই তথ্যটি আগে থেকেই আছে। নাম বা ধরন পরীক্ষা করো।';if(x.code==='23503')return 'সম্পর্কিত বিজনেস, কনটেন্ট বা অ্যাকাউন্ট পাওয়া যায়নি। রিফ্রেশ করে চেষ্টা করো।';if(x.code==='42501')return 'এই কাজের অনুমতি পাওয়া যায়নি। নিজের অ্যাকাউন্ট দিয়ে লগইন করো।';return x.message||'সংরক্ষণ করা যায়নি। আবার চেষ্টা করো।'}

export function getToken(d?: Row | null): string {
  if (!d) return '';
  return String(d.access_token || d.token || d.api_token || d.token_key || '').trim();
}

export function getTokenExpiry(d?: Row | null): string | null {
  if (!d) return null;
  const raw = d.token_validity || d.token_expires_at || d.expires_at || d.valid_until || d.token_expiry || d.validity;
  if (!raw) return null;
  return String(raw);
}

export type TokenInfo = {
  hasToken: boolean;
  status: 'valid' | 'warning' | 'expired' | 'missing';
  label: string;
  daysRemaining: number | null;
  expiryDate: string | null;
  maskedToken: string;
};

export function getTokenInfo(d?: Row | null): TokenInfo {
  const token = getToken(d);
  const rawExpiry = getTokenExpiry(d);

  if (!token) {
    return {
      hasToken: false,
      status: 'missing',
      label: 'টোকেন নেই',
      daysRemaining: null,
      expiryDate: null,
      maskedToken: '—',
    };
  }

  let masked = token;
  if (token.length > 10) {
    masked = token.slice(0, 4) + '••••' + token.slice(-4);
  }

  if (!rawExpiry) {
    return {
      hasToken: true,
      status: 'valid',
      label: 'সক্রিয় (মেয়াদহীন)',
      daysRemaining: null,
      expiryDate: null,
      maskedToken: masked,
    };
  }

  const parsed = new Date(rawExpiry);
  if (isNaN(parsed.getTime())) {
    return {
      hasToken: true,
      status: 'valid',
      label: 'মেয়াদ: ' + rawExpiry,
      daysRemaining: null,
      expiryDate: rawExpiry,
      maskedToken: masked,
    };
  }

  const diffMs = parsed.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      hasToken: true,
      status: 'expired',
      label: 'মেয়াদ শেষ',
      daysRemaining: diffDays,
      expiryDate: rawExpiry,
      maskedToken: masked,
    };
  }

  if (diffDays <= 7) {
    return {
      hasToken: true,
      status: 'warning',
      label: `${number(diffDays)} দিন বাকি`,
      daysRemaining: diffDays,
      expiryDate: rawExpiry,
      maskedToken: masked,
    };
  }

  return {
    hasToken: true,
    status: 'valid',
    label: `${number(diffDays)} দিন বাকি`,
    daysRemaining: diffDays,
    expiryDate: rawExpiry,
    maskedToken: masked,
  };
}
