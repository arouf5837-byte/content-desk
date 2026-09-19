'use client';
import {useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Checkbox} from '@/components/ui/checkbox';
import {LoaderCircle,Save} from 'lucide-react';
import {Pick} from './desk-ui';
import CredentialsButton from './credentials';
import {normalizeGroupUrl} from '@/lib/group-csv';
import {db} from '@/lib/supabase';
import {credentialKinds} from '@/lib/credentials';
import {storeMedia} from '@/lib/media';
import {type Data,type Row,platforms,contentStates,postStates,formats,sources,intents,metricLabels,localInput,fromInput,errorText,leadMagnetTypes,funnelStages,leadMagnetStates,leadStatuses,channels,interactionTypes,followUpStates,growthGoals} from '@/lib/content';

type Props={table:string;row?:Row;initial?:Record<string,any>;data:Data;close:()=>void;refresh?:()=>Promise<void>;save:(table:string,payload:Record<string,any>,id?:string)=>Promise<any>};
const titles:Record<string,string>={products:'প্রোডাক্ট / সার্ভিস',businesses:'বিজনেস',destinations:'সোশ্যাল অ্যাকাউন্ট / গ্রুপ',contents:'কনটেন্ট',content_variants:'প্ল্যাটফর্মের সংস্করণ',posts:'পোস্ট',post_metrics:'পারফরম্যান্স',lead_magnets:'লিড ম্যাগনেট',audience_leads:'অডিয়েন্স লিড',lead_interactions:'লিড ইন্টারঅ্যাকশন / যোগাযোগ'};

export default function Editor({table,row,initial={},data,close,save,refresh}:Props){
 const [v,setV]=useState<Record<string,any>>(()=>{const r={...initial,...row};return {...r,business_id:r.business_id||data.businesses.find(b=>!b.archived_at)?.id||'',product_id:r.product_id||'none',objective:r.objective||'none',kind:r.kind||(table==='products'?(data.businesses.find(b=>b.id===(r.business_id||data.businesses.find(b=>!b.archived_at)?.id))?.kind==='agency'?'service':'product'):'ecom'),format:r.format||'text',status:r.status||(table==='posts'?'planned':table==='lead_magnets'?'draft':'draft'),source:r.source||'manual',platform:r.platform||'facebook',visibility:r.visibility||'unknown',destination_type:r.destination_type||'page',active:r.active??true,approval_required:r.approval_required??false,distribution:r.distribution||'organic',label:r.label||'Version 1',tags:(r.tags||[]).join(', '),hashtags:(r.hashtags||[]).join(', '),media_paths:r.media_paths||[],measured_at:localInput(r.measured_at||new Date().toISOString()),scheduled_at:localInput(r.scheduled_at),published_at:localInput(r.published_at),submitted_at:localInput(r.submitted_at),currency:r.currency||'BDT',type:r.type||'pdf',funnel_stage:r.funnel_stage||'awareness',cta_keyword:r.cta_keyword||'',slug:r.slug||'',resource_url:r.resource_url||'',target_audience:r.target_audience||'',comment_prompt:r.comment_prompt||'',growth_goal:r.growth_goal||'lead_generation',lead_magnet_id:r.lead_magnet_id||'',full_name:r.full_name||'',handle:r.handle||'',email:r.email||'',phone:r.phone||'',profile_url:r.profile_url||'',lead_status:r.lead_status||'new',potential_client:r.potential_client??false,source_post_id:r.source_post_id||'',lead_id:r.lead_id||'',channel:r.channel||'comment',interaction_type:r.interaction_type||'keyword_comment',keyword_used:r.keyword_used||'',resource_sent:r.resource_sent??false,resource_sent_at:localInput(r.resource_sent_at),follow_up_status:r.follow_up_status||'needed',follow_up_at:localInput(r.follow_up_at)}});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[files,setFiles]=useState<File[]>([]),[savedId,setSavedId]=useState<string|undefined>(row?.id);
 const [tokens,setTokens]=useState<Record<string,string>>({}),[tokenExpiry,setTokenExpiry]=useState(''),[tokenScopes,setTokenScopes]=useState('');
 const tokenFields:Record<string,string[]>={facebook:['page_access_token','access_token','page_id','app_id','app_secret'],instagram:['access_token','refresh_token','business_account_id','app_id','app_secret'],linkedin:['access_token','refresh_token','account_id','client_id','client_secret'],tiktok:['access_token','refresh_token','account_id','client_id','client_secret'],x:['access_token','refresh_token','api_key','api_secret','access_token_secret','client_id','client_secret']};

 const set=(key:string,value:any)=>setV(old=>({...old,[key]:value}));
 const businesses=Object.fromEntries(data.businesses.filter(b=>!b.archived_at||b.id===v.business_id).map(b=>[b.id,b.name]));
 const contents=data.contents.filter(c=>c.business_id===v.business_id);
 const variant=data.content_variants.find(x=>x.id===v.variant_id);
 const variants=data.content_variants.filter(x=>x.business_id===v.business_id);
 const destinations=data.destinations.filter(d=>d.business_id===v.business_id&&d.platform===variant?.platform&&d.active);
 const assets=data.assets.filter(a=>a.content_id===variant?.content_id);
 const leadMagnets=(data.lead_magnets||[]).filter(m=>m.business_id===v.business_id);
 const audienceLeads=(data.audience_leads||[]).filter(l=>l.business_id===v.business_id);
 const postsList=(data.posts||[]).filter(p=>p.business_id===v.business_id);

 function input(key:string,label:string,type='text',required=false,wide=false){return <label className={wide?'full':''} key={key}>{label}{type==='textarea'?<textarea value={v[key]??''} onChange={e=>set(key,e.target.value)} required={required}/>:<input type={type} value={v[key]??''} onChange={e=>set(key,e.target.value)} required={required} min={type==='number'?0:undefined} step={type==='number'?(key==='revenue'||key==='spend'?'0.01':'1'):undefined}/>}</label>}
 function select(key:string,label:string,opts:Record<string,string>,disabled=false){return <label key={key}>{label}<Pick label={label} value={v[key]||''} options={opts} disabled={disabled} onChange={value=>{set(key,value);if(key==='business_id'){set('content_id','');set('product_id','none');set('offer_name','');if(table==='products')set('kind',data.businesses.find(b=>b.id===value)?.kind==='agency'?'service':'product');set('variant_id','');set('destination_id','');set('post_id','');set('media_paths',[]);set('lead_magnet_id','');set('lead_id','');set('source_post_id','')}if(key==='variant_id'){const x=data.content_variants.find(r=>r.id===value);set('destination_id','');set('final_body',[x?.body,(x?.hashtags||[]).join(' '),x?.cta].filter(Boolean).join('\n\n'));set('media_paths',[])}if(key==='platform'){setTokens({});setTokenExpiry('');setTokenScopes('')}if(key==='platform'&&!['facebook','linkedin'].includes(value))set('destination_type','profile');if(key==='lead_magnet_id'&&value&&!v.cta_keyword){const lm=(data.lead_magnets||[]).find(m=>m.id===value);if(lm?.cta_keyword)set('cta_keyword',lm.cta_keyword)}}}/></label>}
 function check(key:string,label:string){return <label className="check-label" key={key}><Checkbox checked={Boolean(v[key])} onCheckedChange={value=>set(key,!!value)}/>{label}</label>}

 async function submit(e:React.FormEvent){e.preventDefault();setError('');setBusy(true);try{
 let fields:string[]=[];
 if(table==='products')fields=['business_id','name','kind','description'];
 if(table==='businesses')fields=['name','kind','brand_notes'];
 if(table==='contents')fields=['business_id','product_id','title','topic','offer_name','objective','format','content_pillar','target_audience','hook','cta','brief','script','source','ai_notes','status','tags','comment_prompt','cta_keyword','growth_goal','lead_magnet_id'];
 if(table==='destinations')fields=['business_id','name','platform','destination_type','url','audience_notes','posting_rules','approval_required','active'];
 if(table==='content_variants')fields=['business_id','content_id','platform','label','body','hashtags','cta'];
 if(table==='posts')fields=['business_id','variant_id','destination_id','status','scheduled_at','submitted_at','published_at','post_url','final_body','distribution','notes','media_paths'];
 if(table==='post_metrics')fields=['business_id','post_id','measured_at','source','currency','attribution_notes','notes',...Object.keys(metricLabels)];
 if(table==='lead_magnets')fields=['business_id','name','slug','description','type','resource_url','cta_keyword','target_audience','funnel_stage','status'];
 if(table==='audience_leads')fields=['business_id','full_name','handle','platform','profile_url','email','phone','lead_status','potential_client','source_post_id','lead_magnet_id','notes'];
 if(table==='lead_interactions')fields=['business_id','lead_id','post_id','lead_magnet_id','channel','interaction_type','keyword_used','resource_sent','resource_sent_at','follow_up_status','follow_up_at','notes'];
 const payload:Record<string,any>={};
 for(const k of fields){const value=v[k];payload[k]=typeof value==='string'?(value.trim()||null):value??null}
 if(table!=='businesses'&&!payload.business_id)throw new Error('আগে একটি বিজনেস যোগ করো।');
 if(table==='contents'){const product=(data.products||[]).find(p=>p.id===v.product_id&&p.business_id===v.business_id);payload.product_id=product?.id||null;payload.objective=v.objective==='none'?null:payload.objective;payload.offer_name=product?.name||payload.offer_name||null;payload.title=payload.title||String(payload.script||product?.name||files[0]?.name||'নতুন কনটেন্ট').trim().slice(0,100);if(files.length&&(!v.format||v.format==='text'))payload.format=files.some(f=>f.type.startsWith('video/'))?'video':files.length>1?'carousel':'image';}
 if(table==='contents'||table==='content_variants'){const k=table==='contents'?'tags':'hashtags';payload[k]=String(v[k]||'').split(',').map(x=>x.trim()).filter(Boolean)}
 if(table==='content_variants'){if(!payload.content_id)throw new Error('একটি কনটেন্ট বেছে নাও।');payload.body=v.body||''}
 if(table==='destinations'){
   if(v.destination_type==='group'){
     payload.visibility=v.visibility;
     payload.url=normalizeGroupUrl(String(payload.url||''));
     try{
       const detected=new URL(payload.url).hostname==='www.linkedin.com'?'linkedin':'facebook';
       if(detected!==payload.platform)throw new Error('গ্রুপের লিংক ও নির্বাচিত প্ল্যাটফর্ম মিলছে না।');
     }catch(e){
       if(e instanceof Error&&e.message.includes('প্ল্যাটফর্ম'))throw e;
     }
     if(!payload.url)throw new Error('গ্রুপের লিংক দাও।');
   }
   if(payload.url&&!/^https?:\/\//i.test(payload.url))throw new Error('লিংক https:// দিয়ে শুরু হতে হবে।');
 }
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
 if(table==='lead_magnets'){
   if(!payload.name)throw new Error('লিড ম্যাগনেটের নাম দাও।');
   payload.cta_keyword=(payload.cta_keyword||'').toUpperCase().trim();
   if(!payload.cta_keyword)throw new Error('কল টু অ্যাকশন কিওয়ার্ড দাও (যেমন: AGENT, GHL, BLUEPRINT)');
   payload.slug=(payload.slug||payload.name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
   if(payload.resource_url&&!/^https?:\/\//i.test(payload.resource_url))throw new Error('রিসোর্স লিংক https:// দিয়ে শুরু হতে হবে।');
 }
 if(table==='audience_leads'){
   if(!payload.full_name)throw new Error('লিডের নাম দাও।');
   if(payload.profile_url&&!/^https?:\/\//i.test(payload.profile_url))throw new Error('প্রোফাইল লিংক https:// দিয়ে শুরু হতে হবে।');
 }
 if(table==='lead_interactions'){
   if(!payload.lead_id)throw new Error('একটি লিড বেছে নাও।');
   payload.resource_sent_at=payload.resource_sent?fromInput(v.resource_sent_at||new Date().toISOString()):null;
   payload.follow_up_at=fromInput(v.follow_up_at||'');
 }
 const result=await save(table,payload,['contents','destinations'].includes(table)?savedId:row?.id);
 if(table==='destinations'){
   const destinationId=savedId||result?.id;setSavedId(destinationId);
   try {
     if(v.destination_type==='group'&&v.product_id!=='none'){
       const {error:linkError}=await db.from('destination_products').upsert({destination_id:destinationId,business_id:payload.business_id,product_id:v.product_id},{onConflict:'destination_id,product_id',ignoreDuplicates:true});if(linkError)throw linkError;
     }
     for(const [key,value] of Object.entries(tokens).filter(([,value])=>value.trim())){
       const {error:tokenError}=await db.rpc('save_social_credential',{p_destination_id:destinationId,p_credential_key:key,p_label:credentialKinds[key]||key,p_value:value,p_expires_at:fromInput(tokenExpiry),p_scopes:tokenScopes.split(',').map(x=>x.trim()).filter(Boolean)});if(tokenError)throw tokenError;
       setTokens(old=>({...old,[key]:''}));
     }
     if(refresh)await refresh();
   }catch{throw new Error('অ্যাকাউন্ট সেভ হয়েছে, কিন্তু প্রোডাক্ট বা টোকেন সেভ সম্পূর্ণ হয়নি। তথ্যগুলো রেখে আবার সেভ করো; নতুন অ্যাকাউন্ট তৈরি হবে না।')}
 }
 if(table==='contents'){
   const contentId=savedId||result?.id;setSavedId(contentId);
   if(files.length){
     if(!contentId)throw new Error('কনটেন্টের পরিচয় পাওয়া যায়নি।');
     for(let i=0;i<files.length;i++){
       try{await storeMedia(files[i],payload.business_id,contentId)}catch{setFiles(files.slice(i));throw new Error('কনটেন্ট সেভ হয়েছে, কিছু ফাইল আপলোড হয়নি। আবার সেভ করলে বাকি ফাইলগুলো আপলোড হবে।')}
     }
     setFiles([]);
     if(refresh)await refresh();
   }
 }
 close();
 }catch(e){setError(errorText(e))}finally{setBusy(false)}}

 return <Dialog open onOpenChange={open=>{if(!open&&!busy)close()}}><DialogContent className="editor-dialog"><DialogHeader><span className="eyebrow dark-eyebrow">{row?'EDIT':'CREATE'}</span><DialogTitle>{titles[table]||table} {row?'সম্পাদনা':'যোগ করো'}</DialogTitle><DialogDescription>{table==='posts'?'পোস্টের পরিকল্পনা ও প্রকাশের হিসাব রাখো।':table==='post_metrics'?'এই সময় পর্যন্ত মোট সংখ্যা দাও।':table==='lead_magnets'?'তোমার ফ্রি রিসোর্স, চেকলিস্ট বা টেমপ্লেটের বিবরণ সংরক্ষণ করো।':table==='audience_leads'?'যে ব্যক্তিরা কমেন্ট বা মেসেজ করেছে তাদের হিসাব রাখো।':table==='lead_interactions'?'রিসোর্স পাঠানো বা ফলো-আপের হিসাব রেকর্ড করো।':'তথ্য সেভ করলে তোমার ওয়ার্কস্পেসে পাওয়া যাবে।'}</DialogDescription></DialogHeader>
 <form onSubmit={submit}><fieldset disabled={busy} className="form-grid">
 {table!=='businesses'&&select('business_id','বিজনেস',businesses,!!row||!!savedId||!!initial.business_id)}
 {table==='businesses'&&<>{input('name','বিজনেসের নাম','text',true)}{select('kind','ধরন',{ecom:'ইকমার্স',agency:'এজেন্সি'},!!row)}{input('brand_notes','ব্র্যান্ডের নির্দেশনা','textarea',false,true)}</>}
 {table==='products'&&<>{input('name','প্রোডাক্ট / সার্ভিসের নাম','text',true)}{select('kind','ধরন',{product:'প্রোডাক্ট',service:'সার্ভিস'})}{input('description','ছোট বিবরণ (ঐচ্ছিক)','textarea',false,true)}</>}
 {table==='contents'&&<>{select('product_id','প্রোডাক্ট / সার্ভিস',{none:'প্রোডাক্ট ছাড়া',...Object.fromEntries((data.products||[]).filter(p=>p.business_id===v.business_id&&(!p.archived_at||p.id===v.product_id)).map(p=>[p.id,p.name+(p.archived_at?' · আর্কাইভ':'' )]))})}{select('format','কনটেন্টের ধরন',formats)}{input('script','কনটেন্ট কপি','textarea',false,true)}<label className="full content-upload">ছবি / ভিডিও<input type="file" accept="image/*,video/*" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/>{files.length>0&&<span className="small muted">{files.map(f=>f.name).join(' · ')}</span>}{row&&<span className="small muted">আগের ফাইলগুলো থাকবে; নতুন ফাইল যোগ হবে।</span>}</label>{select('objective','উদ্দেশ্য / Intent',{none:'পরে ঠিক করব',...intents,...(v.objective&&v.objective!=='none'&&!intents[v.objective]?{[v.objective]:v.objective}:{})})}{select('status','অবস্থা',contentStates)}{select('lead_magnet_id','সম্পর্কিত লিড ম্যাগনেট',{'': 'কোনোটি নয়', ...Object.fromEntries(leadMagnets.map(m=>[m.id,`${m.name} [${m.cta_keyword}]`]))})}{input('cta_keyword','কল টু অ্যাকশন কিওয়ার্ড (যেমন: AGENT, GHL)')}{select('growth_goal','গ্রোথ গোল / উদ্দেশ্য',growthGoals)}{input('comment_prompt','কমেন্ট প্রম্পট (যেমন: Comment AGENT and I will DM you...)','text',false,true)}<details className="full content-optional"><summary>আরও দরকারি তথ্য (ঐচ্ছিক)</summary><div className="form-grid">{input('title','কনটেন্টের নাম — খালি রাখলে নিজে তৈরি হবে','text',false,true)}{select('source','তৈরির মাধ্যম',sources)}{input('content_pillar','কনটেন্ট পিলার')}{input('target_audience','টার্গেট অডিয়েন্স')}{input('hook','হুক / প্রথম লাইন','textarea',false,true)}{input('cta','কল টু অ্যাকশন','text',false,true)}{input('topic','বিষয়')}{input('tags','ট্যাগ — কমা দিয়ে আলাদা করো')}{input('brief','নোট','textarea',false,true)}{v.source!=='manual'&&input('ai_notes','AI নোট','textarea',false,true)}</div></details></>}
 {table==='destinations'&&<><div className="full">{row?<CredentialsButton account={row}/>:<p className="small muted">চ্যানেল সেভ করার পর পাশে ‘টোকেন’ থেকে Access token, API key/secret, Account ID, expiry ও scopes যোগ করো।</p>}</div>{input('name','অ্যাকাউন্ট / গ্রুপের নাম','text',true)}{select('platform','প্ল্যাটফর্ম',platforms)}{select('destination_type','ধরন',['facebook','linkedin'].includes(v.platform)?{page:'পেজ',profile:'প্রোফাইল',group:'গ্রুপ'}:{page:'পেজ',profile:'প্রোফাইল'})}{v.destination_type==='group'&&select('product_id','এই গ্রুপ কোন প্রোডাক্ট / সার্ভিসের জন্য',{none:'শুধু বিজনেস',...Object.fromEntries((data.products||[]).filter(p=>p.business_id===v.business_id&&!p.archived_at).map(p=>[p.id,p.name]))})}{input('url','অ্যাকাউন্ট / গ্রুপের লিংক','url',v.destination_type==='group',true)}{v.destination_type==='group'&&select('visibility','গ্রুপের ধরন',{unknown:'জানা নেই',public:'Public',private:'Private'})}{input('audience_notes','অডিয়েন্স','textarea',false,true)}{input('posting_rules','পোস্টের নিয়ম','textarea',false,true)}{check('approval_required','অ্যাডমিনের অনুমোদন লাগে')}{check('active','সক্রিয়')}<section className="full"><h3>অটোমেশন — API ও টোকেন</h3><p className="small muted">{platforms[v.platform]}-এর তথ্য এখানেই দাও। সব ঘর ঐচ্ছিক। সেভ করলে গোপন তথ্য এনক্রিপ্ট করে রাখা হবে।</p><div className="form-grid">{(tokenFields[v.platform]||['access_token']).map(key=><label key={key}>{credentialKinds[key]||key}<input type="password" autoComplete="new-password" spellCheck={false} value={tokens[key]||''} onChange={e=>setTokens(old=>({...old,[key]:e.target.value}))} placeholder="পেস্ট করো — খালি রাখলে আগেরটি থাকবে"/></label>)}<label>টোকেনের মেয়াদ (ঐচ্ছিক)<input type="datetime-local" value={tokenExpiry} onChange={e=>setTokenExpiry(e.target.value)}/></label><label>Scopes / permissions<input value={tokenScopes} onChange={e=>setTokenScopes(e.target.value)} placeholder="কমা দিয়ে আলাদা করো"/></label></div></section></>}
 {table==='content_variants'&&<>{select('content_id','কনটেন্ট',Object.fromEntries(contents.map(c=>[c.id,c.title])),!!row||!!initial.content_id)}{select('platform','প্ল্যাটফর্ম',platforms,!!row)}{input('label','সংস্করণের নাম','text',true)}{input('body','ক্যাপশন / লেখা','textarea',false,true)}{input('hashtags','হ্যাশট্যাগ — কমা দিয়ে আলাদা করো','text',false,true)}{input('cta','কল টু অ্যাকশন','text',false,true)}</>}
 {table==='posts'&&<>{select('variant_id','কনটেন্টের সংস্করণ',Object.fromEntries(variants.map(x=>[x.id,(data.contents.find(c=>c.id===x.content_id)?.title||'কনটেন্ট')+' · '+platforms[x.platform]+' · '+x.label])),!!row)}{select('destination_id','কোথায় পোস্ট করবে',Object.fromEntries(destinations.map(d=>[d.id,d.name])),!!row)}{select('status','পোস্টের অবস্থা',postStates)}{select('distribution','বিতরণ',{organic:'অর্গানিক',paid:'পেইড',mixed:'অর্গানিক + পেইড'})}{input('scheduled_at','নির্ধারিত সময় · ঢাকা','datetime-local',v.status==='scheduled')}{input('submitted_at','সাবমিট করার সময় · ঢাকা','datetime-local')}{input('published_at','প্রকাশের সময় · ঢাকা','datetime-local',v.status==='published')}{input('post_url','প্রকাশিত পোস্টের লিংক','url',v.status==='published',true)}{input('final_body','এই পোস্টের চূড়ান্ত লেখা','textarea',false,true)}<div className="full"><p className="field-heading">এই পোস্টের ফাইল</p>{assets.length?assets.map(a=><label className="check-label" key={a.id}><Checkbox checked={v.media_paths.includes(a.storage_path)} onCheckedChange={on=>set('media_paths',on?[...v.media_paths,a.storage_path]:v.media_paths.filter((p:string)=>p!==a.storage_path))}/>{a.file_name}</label>):<p className="muted small">কনটেন্টের বিস্তারিত থেকে আগে ফাইল আপলোড করো।</p>}</div>{input('notes','নোট','textarea',false,true)}</>}
 {table==='post_metrics'&&<>{select('post_id','প্রকাশিত পোস্ট',Object.fromEntries(data.posts.filter(p=>p.business_id===v.business_id&&p.status==='published').map(p=>{const x=data.content_variants.find(x=>x.id===p.variant_id);return[p.id,(data.contents.find(c=>c.id===x?.content_id)?.title||'পোস্ট')+' · '+(data.destinations.find(d=>d.id===p.destination_id)?.name||platforms[p.platform])]})),!!row||!!initial.post_id)}{input('measured_at','মাপার সময় · ঢাকা','datetime-local',true)}{Object.entries(metricLabels).map(([k,l])=>input(k,l,'number'))}{input('currency','মুদ্রা — BDT / USD','text',true)}{input('attribution_notes','কোন সূত্রে লিড / অর্ডার জানা গেছে','textarea',false,true)}{input('notes','নোট','textarea',false,true)}</>}
 {table==='lead_magnets'&&<>{input('name','লিড ম্যাগনেটের নাম','text',true)}{input('cta_keyword','কল টু অ্যাকশন কিওয়ার্ড (যেমন: AGENT, GHL, BLUEPRINT)','text',true)}{input('slug','স্লাগ / URL কোড (ফাঁকা রাখলে স্বয়ংক্রিয় হবে)')}{select('type','রিসোর্স ধরন',leadMagnetTypes)}{select('funnel_stage','ফানেল স্টেজ',funnelStages)}{select('status','অবস্থা',leadMagnetStates)}{input('resource_url','রিসোর্স লিংক (PDF, Notion, Repo লিংক ইত্যাদি)','url',false,true)}{input('target_audience','টার্গেট অডিয়েন্স','text',false,true)}{input('description','বর্ণনা ও আউটলাইন','textarea',false,true)}</>}
 {table==='audience_leads'&&<>{input('full_name','লিডের নাম','text',true)}{input('handle','হ্যান্ডেল / ইউজারনেম (যেমন: @john_doe)')}{select('platform','প্ল্যাটফর্ম',platforms)}{select('lead_status','লিড অবস্থা',leadStatuses)}{input('profile_url','প্রোফাইল লিংক','url',false,true)}{input('email','ইমেইল','email')}{input('phone','ফোন / হোয়াটসঅ্যাপ')}{select('lead_magnet_id','আগ্রহী লিড ম্যাগনেট',{'': 'কোনোটি নয়', ...Object.fromEntries(leadMagnets.map(m=>[m.id,`${m.name} [${m.cta_keyword}]`]))})}{select('source_post_id','সোর্স পোস্ট',{'': 'কোনোটি নয়', ...Object.fromEntries(postsList.map(p=>{const c=data.contents.find(x=>x.id===(data.content_variants.find(v=>v.id===p.variant_id)?.content_id));return[p.id,`${c?.title||'পোস্ট'} (${platforms[p.platform]||p.platform})`];}))})}{check('potential_client','সম্ভাব্য ক্লায়েন্ট (High-Intent Potential Client)')}{input('notes','নোট ও ফলো-আপ পরিকল্পনা','textarea',false,true)}</>}
 {table==='lead_interactions'&&<>{select('lead_id','অডিয়েন্স লিড',Object.fromEntries(audienceLeads.map(l=>[l.id,`${l.full_name} (${l.handle||platforms[l.platform]||l.platform})`])),!!row||!!initial.lead_id)}{select('interaction_type','যোগাযোগের ধরন',interactionTypes)}{select('channel','মাধ্যম',channels)}{input('keyword_used','ব্যবহৃত কিওয়ার্ড (যেমন: AGENT)')}{select('lead_magnet_id','সম্পর্কিত লিড ম্যাগনেট',{'': 'কোনোটি নয়', ...Object.fromEntries(leadMagnets.map(m=>[m.id,`${m.name} [${m.cta_keyword}]`]))})}{select('post_id','পোস্ট',{'': 'কোনোটি নয়', ...Object.fromEntries(postsList.map(p=>{const c=data.contents.find(x=>x.id===(data.content_variants.find(v=>v.id===p.variant_id)?.content_id));return[p.id,`${c?.title||'পোস্ট'} (${platforms[p.platform]||p.platform})`];}))})}{select('follow_up_status','ফলো-আপ অবস্থা',followUpStates)}{input('follow_up_at','ফলো-আপের সময় · ঢাকা','datetime-local')}{check('resource_sent','রিসোর্স পাঠানো সম্পন্ন হয়েছে')}{v.resource_sent&&input('resource_sent_at','রিসোর্স পাঠানোর সময় · ঢাকা','datetime-local')}{input('notes','নোট / বার্তা','textarea',false,true)}</>}
 </fieldset>{error&&<div className="error-message" role="alert">{error}</div>}<div className="form-actions"><button type="button" className="secondary" onClick={close} disabled={busy}>বাতিল</button><button className="primary" disabled={busy}>{busy?<LoaderCircle size={17} className="spin"/>:<Save size={17}/>}সেভ করো</button></div></form></DialogContent></Dialog>
}
