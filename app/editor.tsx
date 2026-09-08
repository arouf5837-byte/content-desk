'use client';
import {useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Checkbox} from '@/components/ui/checkbox';
import {LoaderCircle,Save} from 'lucide-react';
import {Pick} from './desk-ui';
import {type Data,type Row,platforms,contentStates,postStates,formats,sources,metricLabels,localInput,fromInput,errorText} from '@/lib/content';
type Props={table:string;row?:Row;initial?:Record<string,any>;data:Data;close:()=>void;save:(table:string,payload:Record<string,any>,id?:string)=>Promise<void>};
const titles:Record<string,string>={businesses:'বিজনেস',destinations:'সোশ্যাল অ্যাকাউন্ট / গ্রুপ',contents:'কনটেন্ট',content_variants:'প্ল্যাটফর্মের সংস্করণ',posts:'পোস্ট',post_metrics:'পারফরম্যান্স'};
export default function Editor({table,row,initial={},data,close,save}:Props){
 const [v,setV]=useState<Record<string,any>>(()=>{const r={...initial,...row};return {...r,business_id:r.business_id||data.businesses[0]?.id||'',kind:r.kind||'ecom',format:r.format||'text',status:r.status||(table==='posts'?'planned':'idea'),source:r.source||'manual',platform:r.platform||'facebook',destination_type:r.destination_type||'page',active:r.active??true,approval_required:r.approval_required??false,distribution:r.distribution||'organic',label:r.label||'Version 1',tags:(r.tags||[]).join(', '),hashtags:(r.hashtags||[]).join(', '),media_paths:r.media_paths||[],measured_at:localInput(r.measured_at||new Date().toISOString()),scheduled_at:localInput(r.scheduled_at),published_at:localInput(r.published_at),submitted_at:localInput(r.submitted_at),currency:r.currency||'BDT'}});
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const set=(key:string,value:any)=>setV(old=>({...old,[key]:value}));
 const businesses=Object.fromEntries(data.businesses.map(b=>[b.id,b.name]));
 const contents=data.contents.filter(c=>c.business_id===v.business_id);
 const variants=data.content_variants.filter(x=>x.business_id===v.business_id);
 const variant=variants.find(x=>x.id===v.variant_id);
 const destinations=data.destinations.filter(d=>d.business_id===v.business_id&&(d.active||d.id===v.destination_id)&&(!variant||d.platform===variant.platform));
 const assets=data.assets.filter(a=>a.content_id===variant?.content_id);
 function input(key:string,label:string,type='text',required=false,wide=false){return <label className={wide?'full':''} key={key}>{label}{type==='textarea'?<textarea value={v[key]??''} onChange={e=>set(key,e.target.value)} required={required}/>:<input type={type} value={v[key]??''} onChange={e=>set(key,e.target.value)} required={required} min={type==='number'?0:undefined} step={type==='number'?(key==='revenue'||key==='spend'?'0.01':'1'):undefined}/>}</label>}
 function select(key:string,label:string,opts:Record<string,string>,disabled=false){return <label key={key}>{label}<Pick label={label} value={v[key]||''} options={opts} disabled={disabled} onChange={value=>{set(key,value);if(key==='business_id'){set('content_id','');set('variant_id','');set('destination_id','');set('post_id','');set('media_paths',[])}if(key==='variant_id'){const x=data.content_variants.find(r=>r.id===value);set('destination_id','');set('final_body',[x?.body,(x?.hashtags||[]).join(' '),x?.cta].filter(Boolean).join('\n\n'));set('media_paths',[])}if(key==='platform'&&value!=='facebook')set('destination_type','profile')}}/></label>}
 function check(key:string,label:string){return <label className="check-label" key={key}><Checkbox checked={Boolean(v[key])} onCheckedChange={value=>set(key,!!value)}/>{label}</label>}
 async function submit(e:React.FormEvent){e.preventDefault();setError('');setBusy(true);try{
 let fields:string[]=[];
 if(table==='businesses')fields=['name','kind','brand_notes'];
 if(table==='contents')fields=['business_id','title','topic','offer_name','objective','format','brief','script','source','ai_notes','status','tags'];
 if(table==='destinations')fields=['business_id','name','platform','destination_type','url','audience_notes','posting_rules','approval_required','active'];
 if(table==='content_variants')fields=['business_id','content_id','platform','label','body','hashtags','cta'];
 if(table==='posts')fields=['business_id','variant_id','destination_id','status','scheduled_at','submitted_at','published_at','post_url','final_body','distribution','notes','media_paths'];
 if(table==='post_metrics')fields=['business_id','post_id','measured_at','source','currency','attribution_notes','notes',...Object.keys(metricLabels)];
 const payload:Record<string,any>={};
 for(const k of fields){const value=v[k];payload[k]=typeof value==='string'?(value.trim()||null):value??null}
 if(table!=='businesses'&&!payload.business_id)throw new Error('আগে একটি বিজনেস যোগ করো।');
 if(table==='contents'||table==='content_variants'){const k=table==='contents'?'tags':'hashtags';payload[k]=String(v[k]||'').split(',').map(x=>x.trim()).filter(Boolean)}
 if(table==='content_variants'){if(!payload.content_id)throw new Error('একটি কনটেন্ট বেছে নাও।');payload.body=v.body||''}
 if(table==='destinations'){if(v.destination_type==='group'&&!payload.url)throw new Error('ফেসবুক গ্রুপের লিংক দাও।');if(payload.url&&!/^https?:\/\//i.test(payload.url))throw new Error('লিংক https:// দিয়ে শুরু হতে হবে।')}
 if(table==='posts'){
 if(!variant||!destinations.some(d=>d.id===v.destination_id))throw new Error('একটি সংস্করণ এবং একই প্ল্যাটফর্মের অ্যাকাউন্ট বেছে নাও।');
 payload.platform=variant.platform;
 for(const k of ['scheduled_at','submitted_at','published_at'])payload[k]=fromInput(v[k]||'');
 if(v.status==='scheduled'&&!payload.scheduled_at)throw new Error('পোস্টের নির্ধারিত সময় দাও।');
 if(v.status==='published'&&(!payload.published_at||!payload.post_url))throw new Error('প্রকাশের সময় এবং প্রকাশিত পোস্টের লিংক দাও।');
 if(v.status==='published'&&new Date(payload.published_at).getTime()>Date.now())throw new Error('প্রকাশের সময় ভবিষ্যতে হতে পারে না।');
 if(payload.post_url&&!/^https?:\/\//i.test(payload.post_url))throw new Error('পোস্টের লিংক https:// দিয়ে শুরু হতে হবে।');
 payload.final_body=v.final_body||'';
 }
 if(table==='post_metrics'){
 const p=data.posts.find(x=>x.id===v.post_id&&x.business_id===v.business_id&&x.status==='published');
 if(!p)throw new Error('একটি প্রকাশিত পোস্ট বেছে নাও।');
 payload.source='manual';payload.measured_at=fromInput(v.measured_at||'');
 if(!payload.measured_at)throw new Error('পরিসংখ্যান মাপার সময় দাও।');
 if(new Date(payload.measured_at).getTime()>Date.now()||new Date(payload.measured_at)<new Date(p.published_at))throw new Error('মাপার সময় প্রকাশের পর থেকে বর্তমান সময়ের মধ্যে হতে হবে।');
 for(const k of Object.keys(metricLabels)){payload[k]=v[k]==null||v[k]===''?null:Number(v[k]);if(payload[k]!=null&&(!Number.isFinite(payload[k])||payload[k]<0))throw new Error('পরিসংখ্যান শূন্য বা তার বেশি হতে হবে।')}
 }
 await save(table,payload,row?.id);close();
 }catch(e){setError(errorText(e))}finally{setBusy(false)}}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)close()}}><DialogContent className="editor-dialog"><DialogHeader><span className="eyebrow dark-eyebrow">{row?'EDIT':'CREATE'}</span><DialogTitle>{titles[table]} {row?'সম্পাদনা':'যোগ করো'}</DialogTitle><DialogDescription>{table==='posts'?'পোস্টের পরিকল্পনা ও প্রকাশের হিসাব রাখো। এখানে সেভ করলে সোশ্যাল মিডিয়ায় প্রকাশ হয় না।':table==='post_metrics'?'এই সময় পর্যন্ত মোট সংখ্যা দাও। যা জানা নেই খালি রাখো।':table==='destinations'?'অ্যাকাউন্ট বা গ্রুপের নাম ও লিংক সংরক্ষণ করো।':'তথ্য সেভ করলে তোমার ওয়ার্কস্পেসে পাওয়া যাবে।'}</DialogDescription></DialogHeader>
 <form onSubmit={submit}><fieldset disabled={busy} className="form-grid">
 {table!=='businesses'&&select('business_id','বিজনেস',businesses,!!row||!!initial.business_id)}
 {table==='businesses'&&<>{input('name','বিজনেসের নাম','text',true)}{select('kind','ধরন',{ecom:'ইকমার্স',agency:'এজেন্সি'},!!row)}{input('brand_notes','ব্র্যান্ডের নির্দেশনা','textarea',false,true)}</>}
 {table==='contents'&&<>{input('title','কনটেন্টের নাম','text',true,true)}{select('format','ফরম্যাট',formats)}{select('status','অবস্থা',contentStates)}{select('source','তৈরি করেছে',sources)}{input('offer_name','প্রোডাক্ট / সার্ভিস / অফার')}{input('topic','বিষয়')}{input('objective','উদ্দেশ্য')}{input('tags','ট্যাগ — কমা দিয়ে আলাদা করো','text',false,true)}{input('brief','আইডিয়া / নির্দেশনা','textarea',false,true)}{input('script','লেখা / স্ক্রিপ্ট','textarea',false,true)}{v.source!=='manual'&&input('ai_notes','AI নির্দেশনা / নোট','textarea',false,true)}</>}
 {table==='destinations'&&<>{input('name','অ্যাকাউন্ট / গ্রুপের নাম','text',true)}{select('platform','প্ল্যাটফর্ম',platforms)}{select('destination_type','ধরন',v.platform==='facebook'?{page:'পেজ',profile:'প্রোফাইল',group:'গ্রুপ'}:{page:'পেজ',profile:'প্রোফাইল'})}{input('url','অ্যাকাউন্ট / গ্রুপের লিংক','url',v.destination_type==='group',true)}{input('audience_notes','অডিয়েন্স','textarea',false,true)}{input('posting_rules','পোস্টের নিয়ম','textarea',false,true)}{check('approval_required','অ্যাডমিনের অনুমোদন লাগে')}{check('active','সক্রিয়')}</>}
 {table==='content_variants'&&<>{select('content_id','কনটেন্ট',Object.fromEntries(contents.map(c=>[c.id,c.title])),!!row||!!initial.content_id)}{select('platform','প্ল্যাটফর্ম',platforms,!!row)}{input('label','সংস্করণের নাম','text',true)}{input('body','ক্যাপশন / লেখা','textarea',false,true)}{input('hashtags','হ্যাশট্যাগ — কমা দিয়ে আলাদা করো','text',false,true)}{input('cta','কল টু অ্যাকশন','text',false,true)}</>}
 {table==='posts'&&<>{select('variant_id','কনটেন্টের সংস্করণ',Object.fromEntries(variants.map(x=>[x.id,(data.contents.find(c=>c.id===x.content_id)?.title||'কনটেন্ট')+' · '+platforms[x.platform]+' · '+x.label])),!!row)}{select('destination_id','কোথায় পোস্ট করবে',Object.fromEntries(destinations.map(d=>[d.id,d.name])),!!row)}{select('status','পোস্টের অবস্থা',postStates)}{select('distribution','বিতরণ',{organic:'অর্গানিক',paid:'পেইড',mixed:'অর্গানিক + পেইড'})}{input('scheduled_at','নির্ধারিত সময় · ঢাকা','datetime-local',v.status==='scheduled')}{input('submitted_at','সাবমিট করার সময় · ঢাকা','datetime-local')}{input('published_at','প্রকাশের সময় · ঢাকা','datetime-local',v.status==='published')}{input('post_url','প্রকাশিত পোস্টের লিংক','url',v.status==='published',true)}{input('final_body','এই পোস্টের চূড়ান্ত লেখা','textarea',false,true)}<div className="full"><p className="field-heading">এই পোস্টের ফাইল</p>{assets.length?assets.map(a=><label className="check-label" key={a.id}><Checkbox checked={v.media_paths.includes(a.storage_path)} onCheckedChange={on=>set('media_paths',on?[...v.media_paths,a.storage_path]:v.media_paths.filter((p:string)=>p!==a.storage_path))}/>{a.file_name}</label>):<p className="muted small">কনটেন্টের বিস্তারিত থেকে আগে ফাইল আপলোড করো।</p>}</div>{input('notes','নোট','textarea',false,true)}</>}
 {table==='post_metrics'&&<>{select('post_id','প্রকাশিত পোস্ট',Object.fromEntries(data.posts.filter(p=>p.business_id===v.business_id&&p.status==='published').map(p=>{const x=data.content_variants.find(x=>x.id===p.variant_id);return[p.id,(data.contents.find(c=>c.id===x?.content_id)?.title||'পোস্ট')+' · '+(data.destinations.find(d=>d.id===p.destination_id)?.name||platforms[p.platform])]})),!!row||!!initial.post_id)}{input('measured_at','মাপার সময় · ঢাকা','datetime-local',true)}{Object.entries(metricLabels).map(([k,l])=>input(k,l,'number'))}{input('currency','মুদ্রা — BDT / USD','text',true)}{input('attribution_notes','কোন সূত্রে লিড / অর্ডার জানা গেছে','textarea',false,true)}{input('notes','নোট','textarea',false,true)}</>}
 </fieldset>{error&&<div className="error-message" role="alert">{error}</div>}<div className="form-actions"><button type="button" className="secondary" onClick={close} disabled={busy}>বাতিল</button><button className="primary" disabled={busy}>{busy?<LoaderCircle size={17} className="spin"/>:<Save size={17}/>}সেভ করো</button></div></form></DialogContent></Dialog>
}
