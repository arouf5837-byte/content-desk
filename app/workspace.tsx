'use client';
import {useState,useEffect,useCallback,useRef} from 'react';
import type {Session} from '@supabase/supabase-js';
import {Layers3,LayoutDashboard,Library,CalendarDays,ChartNoAxesCombined,Send,Building2,Plus,Search,SlidersHorizontal,ArrowRight,ArrowUpRight,RefreshCw,LogOut,Image as ImageIcon,FileText,Video,ChevronLeft,ChevronRight,Upload,ExternalLink,Pencil,Check,Clock3,Archive,LoaderCircle,X,CheckCheck,Gift,Users,Star,MessageSquare,CheckCircle2,Copy,Link as LinkIcon,Trash2,Sparkles} from 'lucide-react';
import {SidebarProvider,Sidebar,SidebarHeader,SidebarContent,SidebarFooter,SidebarMenu,SidebarMenuItem,SidebarMenuButton,SidebarTrigger,useSidebar} from '@/components/ui/sidebar';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Skeleton} from '@/components/ui/skeleton';
import {Checkbox} from '@/components/ui/checkbox';
import {db} from '@/lib/supabase';
import {type Row,type Data,type Filters,tables,emptyData,defaults,platforms,formats,sources,contentStates,postStates,metricLabels,intents,filtered,latestMetrics,dateLabel,localDate,number,errorText,postDate,getTokenInfo,leadMagnetTypes,funnelStages,leadMagnetStates,leadStatuses,channels,interactionTypes,followUpStates,growthGoals,isTodayDhaka,isWithinDaysDhaka,friendlyDate,businessKinds,todayDate,shiftDate,formatBanglaDay,businessKindLabel,dateMatchesFilter} from '@/lib/content';
import {Pick,Badge,Platform,Blank,TokenBadge} from './desk-ui';
import Editor from './editor';
import Groups from './groups';
import {BusinessPanel,ProductPanel} from './catalog';
import ContentMedia from './content-media';
import CredentialsButton from './credentials';

const nav=[
 {id:'overview',label:'ওভারভিউ',icon:LayoutDashboard},
 {id:'library',label:'কনটেন্ট লাইব্রেরি',icon:Library},
 {id:'posts',label:'পোস্ট ট্র্যাকার',icon:Send},
 {id:'lead_magnets',label:'লিড ম্যাগনেট',icon:Gift},
 {id:'crm',label:'অডিয়েন্স ও CRM',icon:Users},
 {id:'calendar',label:'ক্যালেন্ডার',icon:CalendarDays},
 {id:'analytics',label:'পারফরম্যান্স',icon:ChartNoAxesCombined},
 {id:'products',label:'প্রোডাক্ট ও সার্ভিস',icon:Layers3},
 {id:'groups',label:'গ্রুপ তালিকা',icon:LinkIcon},
 {id:'settings',label:'বিজনেস ও অ্যাকাউন্ট',icon:Building2}
];

const subtitles:Record<string,string>={
 groups:'বিজনেস অনুযায়ী গ্রুপ ও পোস্টের হিসাব।',
 products:'প্রোডাক্ট ও সার্ভিস অনুযায়ী কনটেন্টের হিসাব।',
 overview:'কী তৈরি হচ্ছে, কী প্রকাশ হচ্ছে, আর কী ফল আসছে।',
 library:'প্রতিটি আইডিয়া, লেখা ও ফাইলের নিজের জায়গা।',
 posts:'প্রতিটি প্ল্যাটফর্মের প্রকাশের হিসাব।',
 lead_magnets:'ফ্রি রিসোর্স, চেকলিস্ট, প্রম্পট প্যাক ও ফানেল।',
 crm:'কমেন্ট ও ডিএম থেকে আসা লিড, রিসোর্স পাঠানো ও ক্লায়েন্ট ফলো-আপ।',
 calendar:'কোন দিনে কোথায় কী যাবে।',
 analytics:'প্রকাশিত পোস্টের সর্বশেষ জানা ফলাফল।',
 settings:'তোমার বিজনেস, সোশ্যাল প্রোফাইল ও ফেসবুক গ্রুপ।'
};

function Navigation({view,change}:{view:string;change:(v:string)=>void}){
 const {setOpenMobile}=useSidebar();
 return <SidebarMenu>{nav.map(n=><SidebarMenuItem key={n.id}><SidebarMenuButton isActive={view===n.id} className="nav-button" onClick={()=>{change(n.id);setOpenMobile(false)}}><n.icon size={19}/><span>{n.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu>;
}

type Editing={table:string;row?:Row;initial?:Record<string,any>};

export default function Workspace({session}:{session:Session}){
 const [data,setData]=useState<Data>(emptyData),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [view,setView]=useState('overview'),[f,setF]=useState<Filters>(defaults),[sort,setSort]=useState('newest'),[page,setPage]=useState(1),[expanded,setExpanded]=useState(false),[editing,setEditing]=useState<Editing|null>(null),[detail,setDetail]=useState<string|null>(null),[uploading,setUploading]=useState(false),[metric,setMetric]=useState('reach'),[month,setMonth]=useState(localDate(new Date().toISOString()).slice(0,7)),[crmTab,setCrmTab]=useState<'leads'|'interactions'>('leads'),[potentialOnly,setPotentialOnly]=useState(false),[copied,setCopied]=useState(false);
 const [postScope,setPostScope]=useState<'today'|'recent'|'all'>('recent');
 const [selectedPosts,setSelectedPosts]=useState<Set<string>>(new Set());
 const [confirmDelete,setConfirmDelete]=useState<{open:boolean;ids:string[];count:number}|null>(null);
 const [deleting,setDeleting]=useState(false);
 const [busyAction,setBusyAction]=useState(false);
 const [confirmDeleteAll,setConfirmDeleteAll]=useState(false);
 const [confirmDeleteContent,setConfirmDeleteContent]=useState<Row|null>(null);
 const [confirmDeleteMagnet,setConfirmDeleteMagnet]=useState<Row|null>(null);
 const [confirmDeleteAllMagnets,setConfirmDeleteAllMagnets]=useState(false);
 const [confirmDeleteLead,setConfirmDeleteLead]=useState<Row|null>(null);
 const [confirmDeleteDest,setConfirmDeleteDest]=useState<Row|null>(null);
 const [copiedVariantId,setCopiedVariantId]=useState<string|null>(null);
 const [confirmSetupAi,setConfirmSetupAi]=useState(false);
 const [productSetup,setProductSetup]=useState(false);
 const activeBusinesses=data.businesses.filter(b=>!b.archived_at);
 const epoch=useRef(0);
 const today=todayDate();

 const reload=useCallback(async()=>{
  const current=++epoch.current;
  setLoading(true);
  setError('');
  setProductSetup(false);
  try{
   const entries=await Promise.all(tables.map(async t=>{
    const all:Row[]=[];
    for(let start=0;;start+=500){
     let query=db.from(t).select('*');
     query=t==='destination_products'?query.order('destination_id').order('product_id'):query.order('id');
     const {data,error}=await query.range(start,start+499);
     if(['products','destination_products'].includes(t)&&error?.code==='PGRST205'){
      if(current===epoch.current)setProductSetup(true);
      return[t,[]] as const;
     }
     if(error)throw error;
     all.push(...data);
     if(data.length<500)break;
    }
    return[t,all] as const;
   }));
   if(current===epoch.current)setData(Object.fromEntries(entries));
  }catch(e){
   if(current===epoch.current)setError(errorText(e));
  }finally{
   if(current===epoch.current)setLoading(false);
  }
 },[]);

 useEffect(()=>{reload();return()=>{epoch.current++}},[reload]);
 useEffect(()=>setPage(1),[f,view,sort,metric,crmTab,potentialOnly,postScope]);
 useEffect(()=>{setSelectedPosts(new Set());},[view,postScope,f.business,f.platform,f.status]);
 const update=(key:keyof Filters,value:any)=>setF(old=>({...old,[key]:value}));
 const navigate=(v:string)=>{setView(v);setF(old=>({...old,status:'all',distribution:['library','lead_magnets','crm'].includes(v)?'all':old.distribution}));setSort('newest')};
 const filterResult=filtered(data,f,view);
 const contents=[...filterResult.contents].sort((a,b)=>sort==='oldest'?a.created_at.localeCompare(b.created_at):b.created_at.localeCompare(a.created_at));
 const snapshots=latestMetrics(data.post_metrics,f.dateMode==='single'?f.selectedDate:f.to);
 const allFilteredPosts=[...filterResult.posts].sort((a,b)=>view==='analytics'?((snapshots.get(b.id)?.[metric]??-1)-(snapshots.get(a.id)?.[metric]??-1)):sort==='oldest'?postDate(a).localeCompare(postDate(b)):postDate(b).localeCompare(postDate(a)));
 const todayPostsCount=allFilteredPosts.filter(p=>isTodayDhaka(postDate(p))).length;
 const recentPostsCount=allFilteredPosts.filter(p=>isWithinDaysDhaka(postDate(p),7)).length;
 const hasDateRange=Boolean(f.from||f.to);
 const posts=view==='posts'?allFilteredPosts.filter(p=>{if(!hasDateRange&&f.dateMode!=='single'){if(postScope==='today')return isTodayDhaka(postDate(p));if(postScope==='recent')return isWithinDaysDhaka(postDate(p),7);}return true;}):allFilteredPosts;
 const published=posts.filter(p=>p.status==='published'),pending=posts.filter(p=>['planned','scheduled','pending_approval','failed'].includes(p.status));
 const selected=data.contents.find(c=>c.id===detail);
 const businessOpts={all:'সব বিজনেস',...Object.fromEntries(activeBusinesses.map(b=>[b.id,b.name+' ('+businessKindLabel(b.kind)+')']))};
 const bname=(id:string)=>data.businesses.find(b=>b.id===id)?.name||'বিজনেস';
 const variantOf=(p:Row)=>data.content_variants.find(v=>v.id===p.variant_id);
 const contentOf=(p:Row)=>data.contents.find(c=>c.id===variantOf(p)?.content_id);
 const destinationOf=(p:Row)=>data.destinations.find(d=>d.id===p.destination_id);
 const leadMagnetOf=(id?:string|null)=>(data.lead_magnets||[]).find(m=>m.id===id);
 const shiftDay=(delta:number)=>update('selectedDate',shiftDate(f.selectedDate||today,delta));

 const newRecord=(table:string,initial:Record<string,any>={})=>{
  setNotice('');
  setEditing({table,initial:{...(f.business!=='all'?{business_id:f.business}:{}),...(table==='contents'&&f.product!=='all'&&f.product!=='none'?{product_id:f.product}:{}),...initial}});
 };

 async function save(table:string,payload:Record<string,any>,id?:string){
  const values=table==='businesses'?{...payload,owner_id:session.user.id}:payload;
  let sanitized={...values};
  for(let attempt=0;attempt<5;attempt++){
   const query=id?db.from(table).update(sanitized).eq('id',id).select('id').single():db.from(table).insert(sanitized).select('id').single();
   const {data:saved,error}=await query;
   if(!error){
    setNotice('সেভ হয়েছে।');
    if(table==='businesses'&&payload.archived_at)setF(defaults);
    await reload();
    return saved;
   }
   if(error.code==='PGRST204'||error.message?.includes('schema cache')||error.message?.includes('column')){
    const match=error.message.match(/'([^']+)' column/)||error.message.match(/column "([^"\s]+)"/);
    if(match&&match[1]&&match[1] in sanitized){
     delete sanitized[match[1]];
     continue;
    }
   }
   throw error;
  }
 }

 async function executeDelete(ids:string[]){
  if(!ids.length)return;
  setDeleting(true);
  setError('');
  try{
   const {error:metricsErr}=await db.from('post_metrics').delete().in('post_id',ids);
   if(metricsErr)throw metricsErr;
   const {error:postsErr}=await db.from('posts').delete().in('id',ids);
   if(postsErr)throw postsErr;
   setNotice(`${number(ids.length)}টি পোস্ট সফলভাবে মুছে ফেলা হয়েছে।`);
   setSelectedPosts(old=>{const next=new Set(old);ids.forEach(id=>next.delete(id));return next;});
   setConfirmDelete(null);
   await reload();
  }catch(err){
   setError(errorText(err));
  }finally{
   setDeleting(false);
  }
 }

 async function markAsPosted(c:Row){
  setBusyAction(true);setError('');
  try{
   let variants=data.content_variants.filter(v=>v.content_id===c.id);
   if(!variants.length){
    const {data:newV,error:vErr}=await db.from('content_variants').insert({business_id:c.business_id,content_id:c.id,platform:'facebook',label:'Primary',body:c.script||c.title,hashtags:c.tags||[]}).select().single();
    if(vErr)throw vErr;
    variants=[newV];
   }
   const v=variants[0];
   const linked=data.posts.filter(p=>variants.some(x=>x.id===p.variant_id));
   const isAlreadyPublished=linked.some(p=>p.status==='published');
   if(isAlreadyPublished){
    for(const p of linked){
     if(p.status==='published'){
      await db.from('posts').update({status:'planned',published_at:null}).eq('id',p.id);
     }
    }
    setNotice('পোস্টটি আবার অপরিকল্পিত/খসড়ায় ফেরানো হয়েছে।');
   }else{
    if(linked.length>0){
     for(const p of linked){
      await db.from('posts').update({status:'published',published_at:new Date().toISOString(),post_url:p.post_url||'https://facebook.com',final_body:p.final_body||v.body||c.script||c.title}).eq('id',p.id);
     }
    }else{
     let dest:Row|null=data.destinations.find(d=>d.business_id===c.business_id&&d.platform===v.platform)||data.destinations.find(d=>d.business_id===c.business_id)||null;
     if(!dest){
      const {data:newDest,error:dErr}=await db.from('destinations').insert({business_id:c.business_id,name:'সোশ্যাল মিডিয়া পেজ',platform:v.platform||'facebook',destination_type:'page',active:true}).select().single();
      if(dErr)throw dErr;
      dest=newDest as Row;
     }
     if(!dest)throw new Error('অ্যাকাউন্ট তৈরি করা যায়নি।');
     const {error:pErr}=await db.from('posts').insert({business_id:c.business_id,variant_id:v.id,destination_id:dest.id,platform:v.platform,status:'published',published_at:new Date().toISOString(),post_url:dest.url||'https://facebook.com',final_body:v.body||c.script||c.title,distribution:'organic'});
     if(pErr)throw pErr;
    }
    setNotice('অভিনন্দন! কনটেন্টটি সফলভাবে "পোস্ট সম্পন্ন" হিসেবে চিহ্নিত হয়েছে।');
   }
   await reload();
  }catch(e){setError(errorText(e))}finally{setBusyAction(false)}}

 async function deleteContent(c:Row){
  setBusyAction(true);setError('');
  try{
   const variants=data.content_variants.filter(v=>v.content_id===c.id);
   const vIds=variants.map(v=>v.id);
   const posts=data.posts.filter(p=>vIds.includes(p.variant_id));
   const pIds=posts.map(p=>p.id);
   if(pIds.length){
    await db.from('post_metrics').delete().in('post_id',pIds);
    await db.from('posts').delete().in('id',pIds);
   }
   await db.from('assets').delete().eq('content_id',c.id);
   if(vIds.length)await db.from('content_variants').delete().in('id',vIds);
   await db.from('contents').delete().eq('id',c.id);
   setNotice(`"${c.title}" কনটেন্টটি সফলভাবে মুছে ফেলা হয়েছে।`);
   setConfirmDeleteContent(null);
   if(detail===c.id)setDetail(null);
   await reload();
  }catch(e){setError(errorText(e))}finally{setBusyAction(false)}}

 async function deleteAllContent(){
  setBusyAction(true);setError('');
  try{
   const bIds=activeBusinesses.map(b=>b.id);
   if(bIds.length){
    await db.from('lead_interactions').delete().in('business_id',bIds);
    await db.from('audience_leads').delete().in('business_id',bIds);
    await db.from('post_metrics').delete().in('business_id',bIds);
    await db.from('posts').delete().in('business_id',bIds);
    await db.from('assets').delete().in('business_id',bIds);
    await db.from('content_variants').delete().in('business_id',bIds);
    await db.from('contents').delete().in('business_id',bIds);
    await db.from('lead_magnets').delete().in('business_id',bIds);
   }
   setNotice('সব কনটেন্ট, সংস্করণ, পোস্ট ও লিড ম্যাগনেট সফলভাবে মুছে ফেলা হয়েছে!');
   setConfirmDeleteAll(false);
   setDetail(null);
   await reload();
  }catch(e){setError(errorText(e))}finally{setBusyAction(false)}}

 async function deleteLeadMagnet(m:Row){
  setBusyAction(true);setError('');
  try{
   await db.from('lead_interactions').delete().eq('lead_magnet_id',m.id);
   await db.from('audience_leads').update({lead_magnet_id:null}).eq('lead_magnet_id',m.id);
   await db.from('contents').update({lead_magnet_id:null,cta_keyword:null}).eq('lead_magnet_id',m.id);
   const {error}=await db.from('lead_magnets').delete().eq('id',m.id);
   if(error)throw error;
   setNotice(`"${m.name}" লিড ম্যাগনেটটি মুছে ফেলা হয়েছে।`);
   setConfirmDeleteMagnet(null);
   await reload();
  }catch(e){setError(errorText(e))}finally{setBusyAction(false)}}

 async function deleteAllLeadMagnets(){
  setBusyAction(true);setError('');
  try{
   const bIds=activeBusinesses.map(b=>b.id);
   if(bIds.length){
    await db.from('lead_interactions').delete().in('business_id',bIds);
    await db.from('audience_leads').delete().in('business_id',bIds);
    await db.from('contents').update({lead_magnet_id:null,cta_keyword:null}).in('business_id',bIds);
    await db.from('lead_magnets').delete().in('business_id',bIds);
   }
   setNotice('সব লিড ম্যাগনেট ও সংশ্লিষ্ট তথ্য সফলভাবে মুছে ফেলা হয়েছে!');
   setConfirmDeleteAllMagnets(false);
   await reload();
  }catch(e){setError(errorText(e))}finally{setBusyAction(false)}}

 async function deleteLead(l:Row){
  setBusyAction(true);setError('');
  try{
   await db.from('lead_interactions').delete().eq('lead_id',l.id);
   const {error}=await db.from('audience_leads').delete().eq('id',l.id);
   if(error)throw error;
   setNotice(`"${l.full_name}" লিডটি মুছে ফেলা হয়েছে।`);
   setConfirmDeleteLead(null);
   await reload();
  }catch(e){setError(errorText(e))}finally{setBusyAction(false)}}

 async function deleteDestination(d:Row){
  setBusyAction(true);setError('');
  try{
   await db.rpc('remove_social_credential',{p_destination_id:d.id});
   await db.from('destination_products').delete().eq('destination_id',d.id);
   const destPosts=data.posts.filter(p=>p.destination_id===d.id);
   if(destPosts.length){
    const postIds=destPosts.map(p=>p.id);
    await db.from('post_metrics').delete().in('post_id',postIds);
    await db.from('audience_leads').update({source_post_id:null}).in('source_post_id',postIds);
    await db.from('lead_interactions').update({source_post_id:null}).in('source_post_id',postIds);
    await db.from('posts').delete().eq('destination_id',d.id);
   }
   const {error}=await db.from('destinations').delete().eq('id',d.id);
   if(error)throw error;
   setNotice(`"${d.name}" সোশ্যাল প্ল্যাটফর্ম অ্যাকাউন্টটি মুছে ফেলা হয়েছে।`);
   setConfirmDeleteDest(null);
   await reload();
  }catch(e){
   setError(errorText(e));
  }finally{
   setBusyAction(false);
  }
 }

 async function setupAiAutomation(){
  setBusyAction(true);setError('');
  try{
   let b=activeBusinesses[0];
   if(b){
    await db.from('businesses').update({name:'AI Automation',kind:'agency'}).eq('id',b.id);
    for(const otherB of activeBusinesses.slice(1)){
     await db.from('businesses').update({archived_at:new Date().toISOString()}).eq('id',otherB.id);
    }
   }else{
    const {data:newB,error:be}=await db.from('businesses').insert({name:'AI Automation',kind:'agency',owner_id:session.user.id}).select().single();
    if(be)throw be;
    b=newB;
   }
   const existingP=data.products.find(p=>p.business_id===b.id&&p.name.toLowerCase()==='personal branding');
   let prodId=existingP?.id;
   if(!existingP){
    const {data:newP,error:pe}=await db.from('products').insert({business_id:b.id,name:'Personal Branding',kind:'service',description:'AI Automation Agency & Thought Leadership Personal Branding'}).select().single();
    if(pe)throw pe;
    prodId=newP.id;
   }else if(existingP.archived_at){
    await db.from('products').update({archived_at:null}).eq('id',existingP.id);
   }
   for(const p of data.products.filter(p=>p.business_id===b.id&&p.id!==prodId&&!p.archived_at)){
    await db.from('products').update({archived_at:new Date().toISOString()}).eq('id',p.id);
   }
   setNotice('বিজনেস "AI Automation" এবং প্রোডাক্ট "Personal Branding" সফলভাবে প্রস্তুত হয়েছে!');
   setConfirmSetupAi(false);
   setF({...defaults,business:b.id,product:prodId||'all'});
   await reload();
  }catch(e){setError(errorText(e))}finally{setBusyAction(false)}}

 async function archive(c:Row){try{await save('contents',{status:c.status==='archived'?'draft':'archived'},c.id)}catch(e){setError(errorText(e))}}
 async function upload(file:File,c:Row){setUploading(true);setError('');const ext=file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g,'').toLowerCase()||'bin';const path=c.business_id+'/'+c.id+'/'+crypto.randomUUID()+'.'+ext;try{const {error}=await db.storage.from('content-media').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});if(error)throw error;const {error:insertError}=await db.from('assets').insert({business_id:c.business_id,content_id:c.id,storage_path:path,file_name:file.name,media_type:file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':'document',mime_type:file.type,size_bytes:file.size});if(insertError){await db.storage.from('content-media').remove([path]);throw insertError}setNotice('ফাইল আপলোড হয়েছে।');await reload()}catch(e){setError(errorText(e))}finally{setUploading(false)}}
 async function openAsset(a:Row){const win=window.open('about:blank','_blank');if(win)win.opener=null;try{const {data,error}=await db.storage.from(a.bucket_id).createSignedUrl(a.storage_path,300);if(error)throw error;if(win)win.location.href=data.signedUrl;else setError('ফাইল খুলতে এই সাইটের পপআপ অনুমোদন করো।')}catch(e){win?.close();setError(errorText(e))}}

 async function toggleResourceSent(lead:Row){
  const existing=(data.lead_interactions||[]).find(i=>i.lead_id===lead.id&&i.resource_sent);
  try{
   if(existing){
    await save('lead_interactions',{resource_sent:false,resource_sent_at:null},existing.id);
   }else{
    const latest=(data.lead_interactions||[]).find(i=>i.lead_id===lead.id);
    if(latest){
     await save('lead_interactions',{resource_sent:true,resource_sent_at:new Date().toISOString(),follow_up_status:'in_progress'},latest.id);
    }else{
     await save('lead_interactions',{business_id:lead.business_id,lead_id:lead.id,lead_magnet_id:lead.lead_magnet_id,source_post_id:lead.source_post_id,channel:lead.platform==='linkedin'||lead.platform==='instagram'||lead.platform==='x'?'dm':'comment',interaction_type:'resource_sent',resource_sent:true,resource_sent_at:new Date().toISOString(),follow_up_status:'in_progress'});
    }
   }
  }catch(e){setError(errorText(e))}
 }

 const allLeadMagnets=(data.lead_magnets||[]).filter(m=>f.business==='all'||m.business_id===f.business);
 const leadMagnets=[...allLeadMagnets].filter(m=>(f.status==='all'||m.status===f.status)&&dateMatchesFilter(m.created_at,f)&&(!f.q||[m.name,m.cta_keyword,m.description].filter(Boolean).join(' ').toLowerCase().includes(f.q.toLowerCase()))).sort((a,b)=>sort==='oldest'?a.created_at.localeCompare(b.created_at):b.created_at.localeCompare(a.created_at));
 const allLeads=(data.audience_leads||[]).filter(l=>f.business==='all'||l.business_id===f.business);
 const audienceLeads=allLeads.filter(l=>(f.platform==='all'||l.platform===f.platform)&&(f.status==='all'||l.lead_status===f.status)&&(!potentialOnly||l.potential_client)&&dateMatchesFilter(l.created_at,f)&&(!f.q||[l.full_name,l.handle,l.email,l.phone,l.notes].filter(Boolean).join(' ').toLowerCase().includes(f.q.toLowerCase()))).sort((a,b)=>sort==='oldest'?a.created_at.localeCompare(b.created_at):b.created_at.localeCompare(a.created_at));
 const allInteractions=(data.lead_interactions||[]).filter(i=>f.business==='all'||i.business_id===f.business);
 const leadInteractions=[...allInteractions].filter(i=>dateMatchesFilter(i.created_at,f)).sort((a,b)=>b.created_at.localeCompare(a.created_at));

 const totalLeads=allLeads.length;
 const potentialClientsCount=allLeads.filter(l=>l.potential_client).length;
 const resourcesSentCount=allInteractions.filter(i=>i.resource_sent).length;
 const activeMagnetsCount=allLeadMagnets.filter(m=>m.status==='active').length;
 const totals=(key:string)=>{const known=published.map(p=>snapshots.get(p.id)?.[key]).filter(v=>v!=null);return{value:known.length?known.reduce((s,v)=>s+Number(v),0):null,count:known.length}};

 function pagination(total:number){const totalPages=Math.max(1,Math.ceil(total/12));if(totalPages<=1)return null;return <div className="pagination"><span>পৃষ্ঠা {number(page)} / {number(totalPages)}</span><div><button className="icon-button" aria-label="আগের পৃষ্ঠা" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronLeft size={16}/></button><button className="icon-button" aria-label="পরের পৃষ্ঠা" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}><ChevronRight size={16}/></button></div></div>}

 function contentTable(rows:Row[],preview=false){
  const slice=preview?rows.slice(0,5):rows.slice((page-1)*12,page*12);
  return slice.length?<><Table className="compact-table"><TableHeader><TableRow><TableHead>কনটেন্ট</TableHead><TableHead>বিজনেস ও অফার</TableHead><TableHead>ম্যাগনেট / প্ল্যাটফর্ম</TableHead><TableHead>অবস্থা ও তারিখ</TableHead><TableHead>পোস্ট সম্পন্ন</TableHead><TableHead className="th-actions">অ্যাকশন</TableHead></TableRow></TableHeader><TableBody>{slice.map(c=>{const variants=data.content_variants.filter(v=>v.content_id===c.id);const linked=data.posts.filter(p=>variants.some(v=>v.id===p.variant_id));const isPosted=linked.some(p=>p.status==='published');const lm=leadMagnetOf(c.lead_magnet_id);const prod=(data.products||[]).find(p=>p.id===c.product_id&&!p.archived_at);const prodName=prod?.name||(!data.products.some(p=>p.name.toLowerCase()===c.offer_name?.toLowerCase()&&p.archived_at)?c.offer_name:null);const Icon=c.format==='video'?Video:c.format==='text'?FileText:ImageIcon;return <TableRow key={c.id}><TableCell><button className="content-title" onClick={()=>setDetail(c.id)}><span className={'format-icon format-'+c.format}><Icon size={17}/></span><div><strong>{c.title}</strong><small>{formats[c.format]}{c.topic?' · '+c.topic:''}</small></div></button></TableCell><TableCell><div className="biz-offer-cell"><span className="business-tag">{bname(c.business_id)}</span>{prodName&&prodName!=='—'&&<small className="cell-sub">{prodName}</small>}</div></TableCell><TableCell>{lm?<span className="keyword-badge" title={lm.name}><Gift size={12}/>{c.cta_keyword||lm.cta_keyword}</span>:<div className="platform-stack">{[...new Set(variants.map(v=>v.platform))].map(p=><span key={p} title={platforms[p]}><Platform value={p}/></span>)}{!variants.length&&<span className="muted">—</span>}</div>}</TableCell><TableCell><div className="status-date-cell"><Badge status={c.status}/><small className="cell-sub tabular">{dateLabel(c.created_at)}</small></div></TableCell><TableCell>{isPosted?<button className="posted-pill active" title="ক্লিক করলে পোস্টটি খসড়ায় ফিরে যাবে" onClick={()=>markAsPosted(c)} disabled={busyAction}><CheckCheck size={14}/> পোস্ট হয়েছে</button>:<button className="mark-posted-btn" title="১-ক্লিকে পোস্ট সম্পন্ন মার্ক করুন" onClick={()=>markAsPosted(c)} disabled={busyAction}><Check size={14}/> পোস্ট সম্পন্ন</button>}</TableCell><TableCell className="td-actions"><div className="row-actions"><button className="icon-button" title="সম্পাদনা" aria-label="সম্পাদনা" onClick={()=>setEditing({table:'contents',row:c})}><Pencil size={15}/></button><button className="icon-button" aria-label={c.title+' খোলো'} onClick={()=>setDetail(c.id)}><ArrowUpRight size={17}/></button><button className="icon-button danger" aria-label={c.title+' মুছুন'} title="কনটেন্ট মুছে ফেলুন" onClick={()=>setConfirmDeleteContent(c)}><Trash2 size={15}/></button></div></TableCell></TableRow>})}</TableBody></Table>{!preview&&pagination(rows.length)}</>:<Blank title={f.dateMode==='single'?`${formatBanglaDay(f.selectedDate)}-এ কোনো কনটেন্ট নেই`:(data.contents.length?'এই ফিল্টারে কনটেন্ট নেই':'তোমার প্রথম কনটেন্ট যোগ করো')} description={f.dateMode==='single'?'এই দিনে নতুন আইডিয়া, পোস্ট বা স্ক্রিপ্ট যোগ করো।':'আইডিয়া, লেখা, ছবি কিংবা ভিডিও—এখান থেকেই শুরু।'}><button className="primary" onClick={()=>newRecord('contents')} disabled={!activeBusinesses.length}><Plus size={16}/> কনটেন্ট যোগ করো</button></Blank>;
 }

 function postTable(rows:Row[],analytics=false){
  const slice=rows.slice((page-1)*12,page*12);
  const allSelectedOnPage=slice.length>0&&slice.every(p=>selectedPosts.has(p.id));
  return rows.length?<><Table><TableHeader><TableRow>{!analytics&&<TableHead className="th-checkbox"><Checkbox checked={allSelectedOnPage} onCheckedChange={(on)=>{const next=new Set(selectedPosts);if(on)slice.forEach(p=>next.add(p.id));else slice.forEach(p=>next.delete(p.id));setSelectedPosts(next)}} aria-label="পৃষ্ঠার সব নির্বাচন করো"/></TableHead>}<TableHead>কনটেন্ট / অ্যাকাউন্ট</TableHead><TableHead>প্ল্যাটফর্ম</TableHead>{analytics?<><TableHead>{metricLabels[metric]}</TableHead><TableHead>কমেন্ট / ডিএম</TableHead><TableHead>রিসোর্স / লিড</TableHead><TableHead>সর্বশেষ মাপা</TableHead></>:<><TableHead>অবস্থা</TableHead><TableHead>সময় · ঢাকা</TableHead><TableHead>বিতরণ</TableHead></>}<TableHead>অ্যাকশন</TableHead></TableRow></TableHeader><TableBody>{slice.map(p=>{const c=contentOf(p),m=snapshots.get(p.id),pDate=postDate(p),isToday=isTodayDhaka(pDate);return <TableRow key={p.id} className={selectedPosts.has(p.id)?'selected-row':''}>{!analytics&&<TableCell className="td-checkbox"><Checkbox checked={selectedPosts.has(p.id)} onCheckedChange={(on)=>{const next=new Set(selectedPosts);if(on)next.add(p.id);else next.delete(p.id);setSelectedPosts(next)}} aria-label={`পোস্ট ${p.id} নির্বাচন`}/></TableCell>}<TableCell><button className="row-title" onClick={()=>c&&setDetail(c.id)}>{c?.title||'কনটেন্ট'}</button><small className="cell-sub">{destinationOf(p)?.name} · {bname(p.business_id)}</small></TableCell><TableCell><Platform value={p.platform}/></TableCell>{analytics?<><TableCell className="metric-value">{number(m?.[metric])}</TableCell><TableCell>{number(m?.keyword_comments||m?.comments)} / {number(m?.dm_count)}</TableCell><TableCell>{number(m?.resource_requests)} / {number(m?.qualified_leads)}</TableCell><TableCell className="muted">{dateLabel(m?.measured_at)}</TableCell></>:<><TableCell><Badge status={p.status}/></TableCell><TableCell><div className="time-cell"><div className="time-badge-row">{isToday&&<span className="today-badge"><i className="pulse-dot"/>আজ</span>}<span className="time-main">{friendlyDate(p.published_at||p.scheduled_at||p.submitted_at,true)}</span></div>{p.status==='scheduled'&&new Date(p.scheduled_at)<new Date()&&<small className="late">নির্ধারিত সময় পার হয়েছে</small>}</div></TableCell><TableCell>{p.distribution==='organic'?'অর্গানিক':p.distribution==='paid'?'পেইড':'মিশ্র'}</TableCell></>}<TableCell><div className="row-actions">{p.final_body&&<button className="icon-button" title="পোস্টের ক্যাপশন কপি করো" aria-label="ক্যাপশন কপি করো" onClick={()=>{navigator.clipboard.writeText(p.final_body);setNotice('পোস্টের ক্যাপশন কপি হয়েছে!')}}><Copy size={15}/></button>}<button className="icon-button" title="পোস্ট সম্পাদনা" aria-label="পোস্ট সম্পাদনা" onClick={()=>setEditing({table:'posts',row:p})}><Pencil size={16}/></button>{p.status==='published'&&<><button className="icon-button" title="এই পোস্ট থেকে লিড যোগ করো" aria-label="লিড যোগ করো" onClick={()=>newRecord('audience_leads',{source_post_id:p.id,lead_magnet_id:c?.lead_magnet_id,business_id:p.business_id,platform:p.platform})}><Users size={16}/></button><button className="icon-button" title="পরিসংখ্যান যোগ করো" aria-label="পরিসংখ্যান যোগ করো" onClick={()=>newRecord('post_metrics',{business_id:p.business_id,post_id:p.id})}><ChartNoAxesCombined size={17}/></button></>}{p.post_url&&<a href={p.post_url} target="_blank" rel="noopener noreferrer" className="icon-button" aria-label="প্রকাশিত পোস্ট খোলো"><ExternalLink size={16}/></a>}<button className="icon-button delete-icon" title="পোস্ট মুছে ফেলো" aria-label="পোস্ট মুছে ফেলো" onClick={()=>setConfirmDelete({open:true,ids:[p.id],count:1})}><Trash2 size={15}/></button></div></TableCell></TableRow>})}</TableBody></Table>{pagination(rows.length)}{!analytics&&selectedPosts.size>0&&<div className="bulk-action-bar"><div className="bulk-badge-wrap"><span className="bulk-count">{number(selectedPosts.size)}</span><span>টি পোস্ট নির্বাচিত</span></div><div className="bulk-actions"><button className="bulk-btn secondary" onClick={()=>setSelectedPosts(new Set(rows.map(r=>r.id)))}>সব {number(rows.length)}টি নির্বাচন করো</button><button className="bulk-btn secondary" onClick={()=>setSelectedPosts(new Set())}>নির্বাচন বাতিল</button><button className="bulk-btn danger" onClick={()=>setConfirmDelete({open:true,ids:Array.from(selectedPosts),count:selectedPosts.size})}><Trash2 size={15}/> নির্বাচিতগুলো মুছে ফেলো</button></div></div>}</>:<Blank title={analytics?'প্রকাশিত পোস্ট পাওয়া যায়নি':postScope==='today'?'আজকের কোনো পোস্ট নেই':postScope==='recent'?'সাম্প্রতিক কোনো পোস্ট পাওয়া যায়নি':'কোনো পোস্ট পাওয়া যায়নি'} description={analytics?'পোস্ট প্রকাশিত হিসেবে সেভ করে তার পরিসংখ্যান যোগ করো।':postScope==='today'?'আজকের জন্য নির্ধারিত বা প্রকাশিত কোনো পোস্ট নেই।':postScope==='recent'?'গত ৭ দিনে তৈরি বা নির্ধারিত কোনো পোস্ট পাওয়া যায়নি।':'কনটেন্টের একটি সংস্করণ বানিয়ে পোস্টের পরিকল্পনা যোগ করো।'} children={!analytics?<div className="quick-btn-row">{postScope!=='all'&&<button className="secondary" onClick={()=>setPostScope('all')}>সব পোস্ট দেখো ({number(allFilteredPosts.length)})</button>}{postScope==='today'&&recentPostsCount>0&&<button className="secondary" onClick={()=>setPostScope('recent')}>নতুন ও সাম্প্রতিক পোস্ট দেখো ({number(recentPostsCount)})</button>}<button className="primary" onClick={()=>newRecord('posts')}><Plus size={16}/>পোস্ট যোগ করো</button></div>:undefined}/>;
 }

 const activeFilters=Object.entries(f).filter(([k,v])=>!['business','selectedDate','dateMode'].includes(k)&&v&&v!=='all').length;
 const monthStart=new Date(month+'-01T00:00:00Z'),startDay=monthStart.getUTCDay(),days=new Date(monthStart.getUTCFullYear(),monthStart.getUTCMonth()+1,0).getUTCDate();
 const monthPosts=posts.filter(p=>(p.scheduled_at||p.published_at)&&localDate(p.published_at||p.scheduled_at).startsWith(month));
 function changeMonth(delta:number){const d=new Date(month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+delta);setMonth(d.toISOString().slice(0,7))}

 const alertTokens=data.destinations.filter(d=>{const i=getTokenInfo(d);return i.hasToken&&(i.status==='expired'||i.status==='warning')});

 return <SidebarProvider style={{'--sidebar-width':'16.5rem'} as React.CSSProperties}><Sidebar className="desk-sidebar"><SidebarHeader className="sidebar-brand"><a href="/" className="brand"><span className="brand-icon"><Layers3 size={22}/></span>content<span className="brand-light">desk</span><span className="brand-dot">.</span></a></SidebarHeader><SidebarContent className="sidebar-main"><span className="nav-caption">ওয়ার্কস্পেস</span><Navigation view={view} change={navigate}/><div className="sidebar-note"><div className="tiny-dot"/><strong>AI Automation & Branding</strong><p>একক দিনের ফোকাস। তৈরি ও প্রকাশ।</p></div></SidebarContent><SidebarFooter className="sidebar-footer"><div className="avatar">{session.user.email?.slice(0,1).toUpperCase()}</div><div className="user-info"><strong>আমার ওয়ার্কস্পেস</strong><span>{session.user.email}</span></div><button className="icon-button" aria-label="লগআউট" onClick={async()=>{const {error}=await db.auth.signOut();if(error)setError(errorText(error))}}><LogOut size={17}/></button></SidebarFooter></Sidebar>
 <div className="desk-main"><header className="topbar"><div className="topbar-left"><SidebarTrigger/><span className="breadcrumb">ওয়ার্কস্পেস <span>/</span> <strong>{nav.find(n=>n.id===view)?.label}</strong></span></div><div className="topbar-right"><span className="connection"><i/>সংযুক্ত</span><Pick value={f.business} onChange={v=>{setF({...defaults,business:v,selectedDate:f.selectedDate,dateMode:f.dateMode})}} options={businessOpts} label="বিজনেস বেছে নাও"/></div></header><main className="workspace-body"><div className="page-heading"><div><span className="section-kicker">CONTENT DESK · DAILY WORKSPACE</span><h1>{nav.find(n=>n.id===view)?.label}</h1><p>{subtitles[view]}</p></div><div className="heading-actions"><button className="icon-button refresh" aria-label="রিফ্রেশ" onClick={reload} disabled={loading}><RefreshCw size={18} className={loading?'spin':''}/></button><button className="primary" onClick={()=>newRecord(view==='groups'?'destinations':view==='products'?'products':view==='settings'?'businesses':view==='lead_magnets'?'lead_magnets':view==='crm'?'audience_leads':view==='posts'||view==='calendar'?'posts':'contents',view==='groups'?{platform:'facebook',destination_type:'group'}:{})} disabled={view!=='settings'&&!activeBusinesses.length}><Plus size={18}/>{view==='groups'?'গ্রুপ যোগ করো':view==='products'?'প্রোডাক্ট / সার্ভিস যোগ করো':view==='settings'?'বিজনেস যোগ করো':view==='lead_magnets'?'লিড ম্যাগনেট যোগ করো':view==='crm'?'লিড যোগ করো':view==='posts'||view==='calendar'?'পোস্ট যোগ করো':'কনটেন্ট যোগ করো'}</button></div></div>
 {error&&<div role="alert" className="error-message banner">{error}<button onClick={()=>setError('')} aria-label="বার্তা বন্ধ করো"><X size={16}/></button></div>}{notice&&<div role="status" className="success-message banner"><Check size={17}/>{notice}<button onClick={()=>setNotice('')} aria-label="বার্তা বন্ধ করো"><X size={16}/></button></div>}
 {alertTokens.length>0&&<div className="token-alert-banner"><span>⚠️ {number(alertTokens.length)}টি সোশ্যাল মিডিয়া অ্যাকাউন্টের অ্যাক্সেস টোকেন মেয়াদ শেষ হতে চলেছে বা শেষ হয়েছে।</span><button className="text-button" onClick={()=>navigate('settings')}>টোকেন দেখো <ArrowRight size={15}/></button></div>}

 {['overview','library','posts','analytics'].includes(view)&&<div className="daily-bar"><div className="daily-nav"><button className="icon-button" onClick={()=>shiftDay(-1)} title="আগের দিন" aria-label="আগের দিন"><ChevronLeft size={18}/></button><div className="daily-display"><CalendarDays size={18}/><span>{formatBanglaDay(f.selectedDate)}</span><input type="date" className="daily-picker" value={f.selectedDate} onChange={e=>{if(e.target.value)setF(old=>({...old,selectedDate:e.target.value,dateMode:'single',from:'',to:''}))}} title="ক্যালেন্ডার থেকে দিন নির্বাচন করো" aria-label="তারিখ নির্বাচন"/></div><button className="icon-button" onClick={()=>shiftDay(1)} title="পরের দিন" aria-label="পরের দিন"><ChevronRight size={18}/></button>{f.selectedDate!==today&&<button className="secondary small-btn" onClick={()=>setF(old=>({...old,selectedDate:today,dateMode:'single',from:'',to:''}))}>আজকে ফিরুন</button>}</div><div className="daily-stats"><span className="day-stat-chip"><span className="dot dot-green"/> কনটেন্ট: <strong>{number(contents.length)}</strong></span><span className="day-stat-chip"><span className="dot dot-blue"/> পোস্ট সম্পন্ন: <strong>{number(published.length)}</strong></span><span className="day-stat-chip"><span className="dot dot-amber"/> বাকি: <strong>{number(pending.length)}</strong></span>{(f.from||f.to)&&<span className="day-stat-chip range-active-chip">তারিখ রেঞ্জ: {f.from||'শুরু'} - {f.to||'শেষ'}<button type="button" className="clear-chip-btn" onClick={()=>setF(old=>({...old,from:'',to:''}))} title="রেঞ্জ ফিল্টার মুছুন"><X size={12}/></button></span>}</div><div className="daily-mode-switch"><button className={'mode-btn '+(f.dateMode==='single'&&!f.from&&!f.to?'active':'')} onClick={()=>setF(old=>({...old,dateMode:'single',from:'',to:''}))} title="শুধুমাত্র নির্বাচিত দিনের কনটেন্ট দেখাবে">একক দিন (Single Day)</button><button className={'mode-btn '+(f.dateMode==='all'||f.from||f.to?'active':'')} onClick={()=>setF(old=>({...old,dateMode:'all'}))} title="সব দিন বা কাস্টম রেঞ্জ">{f.from||f.to?'কাস্টম রেঞ্জ':'সব দিন (All)'}</button></div></div>}

 {!loading&&!activeBusinesses.length&&!error&&<section className="onboarding"><div className="onboarding-icon"><Building2 size={29}/></div><div><h2>তোমার বিজনেস দিয়ে শুরু করো</h2><p>ডিজিটাল সার্ভিস (AI Automation) বা ফিজিক্যাল বিজনেস যোগ করো। তারপর প্রোডাক্ট ও কনটেন্টের পরিকল্পনা।</p></div><button className="primary" onClick={()=>newRecord('businesses')}>বিজনেস যোগ করো <ArrowRight size={17}/></button></section>}

 {view!=='settings'&&view!=='products'&&view!=='groups'&&view!=='calendar'&&<section className="filter-panel"><div className="filter-row"><div className="search-box"><Search size={17}/><input aria-label="খোঁজো" placeholder={view==='crm'?'নাম, হ্যান্ডেল, ইমেইল বা নোট খোঁজো...':'কনটেন্ট, বিষয় বা ট্যাগ খোঁজো...'} value={f.q} onChange={e=>update('q',e.target.value)}/>{f.q&&<button onClick={()=>update('q','')} aria-label="সার্চ মুছো"><X size={15}/></button>}</div><Pick label="বিজনেস ধরন" value={f.businessKind} onChange={v=>update('businessKind',v)} options={businessKinds}/>{view!=='groups'&&view!=='crm'&&<Pick label="প্রোডাক্ট / সার্ভিস" value={f.product} onChange={v=>update("product",v)} options={{all:"সব প্রোডাক্ট / সার্ভিস",none:"প্রোডাক্ট ছাড়া",...Object.fromEntries((data.products||[]).filter(p=>!p.archived_at&&activeBusinesses.some(b=>b.id===p.business_id)&&(f.business==="all"||p.business_id===f.business)).map(p=>[p.id,p.name]))}}/>}{view!=='lead_magnets'&&<Pick label="প্ল্যাটফর্ম" value={f.platform} onChange={v=>update('platform',v)} options={{all:'সব প্ল্যাটফর্ম',...platforms}}/>}<Pick label="অবস্থা" value={f.status} onChange={v=>update('status',v)} options={{all:'সব অবস্থা',...(view==='library'?contentStates:view==='lead_magnets'?leadMagnetStates:view==='crm'?leadStatuses:postStates)}}/><div className="filter-date-chip" title="তারিখ দিয়ে ফিল্টার করুন"><CalendarDays size={16}/><input type="date" className="filter-date-input" value={f.from||(f.dateMode==='single'?f.selectedDate:'')} title="তারিখ নির্বাচন করুন" aria-label="তারিখ নির্বাচন" onChange={e=>{const val=e.target.value;if(val){setF(old=>({...old,from:val,to:val,selectedDate:val,dateMode:'single'}))}else{setF(old=>({...old,from:'',to:'',dateMode:'all'}))}}}/>{(f.from||f.to||f.dateMode==='single')&&<button type="button" className="clear-date-btn" title="তারিখ ফিল্টার মুছুন (সব দিনের কনটেন্ট দেখুন)" aria-label="তারিখ মুছুন" onClick={()=>setF(old=>({...old,from:'',to:'',dateMode:'all'}))}><X size={13}/></button>}</div>{view!=='lead_magnets'&&view!=='crm'&&<button className={'secondary filter-toggle '+(expanded?'selected':'')} onClick={()=>setExpanded(!expanded)}><SlidersHorizontal size={16}/>ফিল্টার {activeFilters>0&&<span className="filter-count">{number(activeFilters)}</span>}</button>}{activeFilters>0&&<button className="text-button" onClick={()=>setF({...defaults,business:f.business,selectedDate:todayDate(),dateMode:'all',from:'',to:''})}>মুছে ফেলো</button>}</div>{expanded&&view!=='lead_magnets'&&view!=='crm'&&<div className="advanced-filters"><label>ফরম্যাট<Pick label="ফরম্যাট" value={f.format} onChange={v=>update('format',v)} options={{all:'সব ফরম্যাট',...formats}}/></label><label>তৈরির মাধ্যম<Pick label="তৈরির মাধ্যম" value={f.source} onChange={v=>update('source',v)} options={{all:'সব মাধ্যম',...sources}}/></label><label>অ্যাকাউন্ট / গ্রুপ<Pick label="অ্যাকাউন্ট" value={f.destination} onChange={v=>update('destination',v)} options={{all:'সব অ্যাকাউন্ট',...Object.fromEntries(data.destinations.filter(d=>activeBusinesses.some(b=>b.id===d.business_id)&&(f.business==='all'||d.business_id===f.business)).map(d=>[d.id,d.name]))}}/></label>{view!=='library'&&<label>বিতরণ<Pick label="বিতরণ" value={f.distribution} onChange={v=>update('distribution',v)} options={{all:'সব ধরনের',organic:'অর্গানিক',paid:'পেইড',mixed:'মিশ্র'}}/></label>}<div className="date-filter-group"><div className="date-inputs"><label>শুরুর তারিখ<input type="date" value={f.from} onChange={e=>setF(old=>({...old,from:e.target.value,dateMode:'all'}))}/></label><label>শেষের তারিখ<input type="date" min={f.from} value={f.to} onChange={e=>setF(old=>({...old,to:e.target.value,dateMode:'all'}))}/></label></div><div className="date-presets"><span>তারিখ প্রিসেট:</span><button type="button" className="preset-btn" onClick={()=>{const t=todayDate();setF(old=>({...old,from:t,to:t,selectedDate:t,dateMode:'single'}))}}>আজ</button><button type="button" className="preset-btn" onClick={()=>{const y=shiftDate(todayDate(),-1);setF(old=>({...old,from:y,to:y,selectedDate:y,dateMode:'single'}))}}>গতকাল</button><button type="button" className="preset-btn" onClick={()=>{const f7=shiftDate(todayDate(),-6);setF(old=>({...old,from:f7,to:todayDate(),dateMode:'all'}))}}>গত ৭ দিন</button><button type="button" className="preset-btn" onClick={()=>{const f30=shiftDate(todayDate(),-29);setF(old=>({...old,from:f30,to:todayDate(),dateMode:'all'}))}}>গত ৩০ দিন</button>{(f.from||f.to||f.dateMode==='single')&&<button type="button" className="preset-btn clear" onClick={()=>setF(old=>({...old,from:'',to:'',dateMode:'all'}))}>তারিখ মুছুন (সব দেখুন)</button>}</div></div><p className="filter-hint">{view==='library'?'কনটেন্ট যোগ করার তারিখ অনুযায়ী।':'প্রকাশের তারিখ; বাকি পোস্টের ক্ষেত্রে নির্ধারিত বা তৈরির তারিখ অনুযায়ী।'} সব সময় ঢাকা।</p></div>}</section>}
 {productSetup&&<div className="error-message banner" role="status">প্রোডাক্ট ও গ্রুপ অ্যাসাইনমেন্ট চালু করতে সর্বশেষ SQL ফাইলটি চালিয়ে রিফ্রেশ করো।</div>}

 {loading?<div className="loading-grid" aria-label="তথ্য লোড হচ্ছে">{[1,2,3,4].map(i=><Skeleton key={i} className="h-28 rounded-xl"/>)}<Skeleton className="h-72 col-span-full rounded-xl"/></div>:<>
 {view==='overview'&&<><div className="stat-grid">{[{label:'আজকের কনটেন্ট',value:contents.length,icon:Library,sub:formatBanglaDay(f.selectedDate),className:'green'},{label:'পোস্ট সম্পন্ন',value:published.length,icon:CheckCheck,sub:'সফলভাবে পাবলিশ হয়েছে',className:'blue'},{label:'অডিয়েন্স লিড',value:totalLeads,icon:Users,sub:'কমেন্ট ও ডিএম থেকে',className:'purple'},{label:'সম্ভাব্য ক্লায়েন্ট',value:potentialClientsCount,icon:Star,sub:'উচ্চ আগ্রহসম্পন্ন লিড',className:'amber'}].map(s=><div className={'stat-card '+s.className} key={s.label}><div className="stat-top"><span>{s.label}</span><s.icon size={19}/></div><strong>{number(s.value)}</strong><small>{s.sub}</small></div>)}</div>
 <div className="crm-summary-bar"><div className="crm-summary-item"><span>সক্রিয় লিড ম্যাগনেট</span><strong>{number(activeMagnetsCount)}</strong></div><div className="crm-summary-item"><span>রিসোর্স পাঠানো সম্পন্ন</span><strong>{number(resourcesSentCount)}</strong></div><div className="crm-summary-item"><span>পোস্ট বাকি</span><strong>{number(pending.length)}</strong></div><div className="crm-summary-item"><span>প্রস্তুত কনটেন্ট</span><strong>{number(contents.filter(c=>c.status==='ready').length)}</strong></div></div>
 <div className="overview-grid"><section className="panel"><div className="panel-heading"><div><h2>{f.dateMode==='single'?`${formatBanglaDay(f.selectedDate)}-এর কনটেন্ট ও ফানেল`:'সাম্প্রতিক কনটেন্ট ও ফানেল'}</h2><p>এক নজরে তোমার কাজ</p></div><button className="text-button" onClick={()=>navigate('library')}>লাইব্রেরি দেখো <ArrowRight size={16}/></button></div>{contentTable(contents,true)}</section><section className="panel pipeline"><div className="panel-heading"><div><h2>কাজের অগ্রগতি</h2><p>কনটেন্ট তৈরির ধাপ</p></div></div>{Object.entries(contentStates).map(([key,label])=>{const n=contents.filter(c=>c.status===key).length;return <button className="pipeline-row" key={key} onClick={()=>{navigate('library');setF(old=>({...old,status:key}))}}><span><Badge status={key}/><b>{number(n)}</b></span><meter min="0" max={Math.max(contents.length,1)} value={n} aria-label={label}/></button>})}<div className="pipeline-foot"><span className="tiny-dot"/>প্রস্তুত কনটেন্টে 'পোস্ট সম্পন্ন' বাটনে ক্লিক করে মার্ক করো।</div></section></div><section className="panel upcoming"><div className="panel-heading"><div><h2>পরবর্তী পোস্ট</h2><p>নির্ধারিত সময় অনুযায়ী</p></div><button className="text-button" onClick={()=>navigate('calendar')}>ক্যালেন্ডার <ArrowRight size={16}/></button></div>{pending.filter(p=>p.scheduled_at).length?<div className="upcoming-list">{pending.filter(p=>p.scheduled_at).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)).slice(0,4).map(p=><button key={p.id} onClick={()=>setEditing({table:'posts',row:p})}><CalendarDays size={22}/><span><strong>{contentOf(p)?.title}</strong><small>{dateLabel(p.scheduled_at,true)}</small></span><Platform value={p.platform}/><Badge status={p.status}/></button>)}</div>:<div className="quiet-empty"><CalendarDays size={22}/><p>এই দিনের জন্য নির্ধারিত কোনো পোস্ট নেই।</p></div>}</section></>}

 {view==='library'&&<section className="panel"><div className="panel-heading"><div><h2>কনটেন্ট লাইব্রেরি <span className="count-pill">{number(contents.length)}</span></h2><p>{f.dateMode==='single'?`${formatBanglaDay(f.selectedDate)}-এর কাজ`:'সব দিনের কনটেন্ট'}</p></div><div className="row-actions">{contents.length>0&&<button className="secondary danger-btn" onClick={()=>setConfirmDeleteAll(true)} title="সব কনটেন্ট মুছে ফেলুন"><Trash2 size={16}/> সব কনটেন্ট মুছুন</button>}<Pick value={sort} onChange={setSort} options={{newest:'নতুন আগে',oldest:'পুরোনো আগে'}} label="সাজাও"/></div></div>{contentTable(contents)}</section>}

 {view==='posts'&&<section className="panel"><div className="panel-heading"><div><h2>পোস্টের তালিকা <span className="count-pill">{number(posts.length)}</span></h2><p>{f.dateMode==='single'?`${formatBanglaDay(f.selectedDate)}-এর পোস্ট`:(postScope==='today'?'আজকের নির্ধারিত ও প্রকাশিত পোস্ট':postScope==='recent'?'গত ৭ দিনের নতুন ও সাম্প্রতিক পোস্ট':'প্রতিটি প্ল্যাটফর্মের পোস্টের হিসাব')}</p></div><div className="heading-actions"><div className="scope-tabs"><button className={'scope-tab '+(postScope==='today'?'active':'')} onClick={()=>setPostScope('today')}>{todayPostsCount>0&&<span className="glow-dot"/>}আজকের পোস্ট{todayPostsCount>0&&<span className="scope-count">{number(todayPostsCount)}</span>}</button><button className={'scope-tab '+(postScope==='recent'?'active':'')} onClick={()=>setPostScope('recent')}>নতুন ও সাম্প্রতিক (৭ দিন){recentPostsCount>0&&<span className="scope-count">{number(recentPostsCount)}</span>}</button><button className={'scope-tab '+(postScope==='all'?'active':'')} onClick={()=>setPostScope('all')}>সব পোস্ট<span className="scope-count">{number(allFilteredPosts.length)}</span></button></div><Pick value={sort} onChange={setSort} options={{newest:'নতুন আগে',oldest:'পুরোনো আগে'}} label="সাজাও"/></div></div>{postTable(posts)}</section>}

 {view==='lead_magnets'&&<section className="panel"><div className="panel-heading"><div><h2>লিড ম্যাগনেট ও ফ্রি রিসোর্স <span className="count-pill">{number(leadMagnets.length)}</span></h2><p>কমেন্ট-ড্রাইভেন ক্যাম্পেইনে অডিয়েন্সকে দেওয়ার অ্যাসেট</p></div><div className="heading-actions">{leadMagnets.length>0&&<button className="secondary danger-btn" onClick={()=>setConfirmDeleteAllMagnets(true)} title="সব লিড ম্যাগনেট মুছে ফেলুন"><Trash2 size={16}/> সব ম্যাগনেট মুছুন</button>}<Pick value={sort} onChange={setSort} options={{newest:'নতুন আগে',oldest:'পুরোনো আগে'}} label="সাজাও"/><button className="primary" onClick={()=>newRecord('lead_magnets')}><Plus size={16}/>নতুন ম্যাগনেট</button></div></div>
  {leadMagnets.length?<><Table><TableHeader><TableRow><TableHead>ম্যাগনেটের নাম</TableHead><TableHead>কিওয়ার্ড</TableHead><TableHead>ধরন ও স্টেজ</TableHead><TableHead>অবস্থা</TableHead><TableHead>কনটেন্ট / লিড</TableHead><TableHead>অ্যাকশন</TableHead></TableRow></TableHeader><TableBody>{leadMagnets.slice((page-1)*12,page*12).map(m=>{const linkedC=data.contents.filter(c=>c.lead_magnet_id===m.id).length;const linkedL=(data.audience_leads||[]).filter(l=>l.lead_magnet_id===m.id).length;return <TableRow key={m.id}><TableCell><button className="row-title" onClick={()=>setEditing({table:'lead_magnets',row:m})} title="সম্পাদনা করতে ক্লিক করুন"><strong>{m.name}</strong>{m.description&&<small className="cell-sub">{m.description}</small>}</button></TableCell><TableCell><button className="keyword-badge big-keyword" onClick={()=>{navigator.clipboard.writeText(m.cta_keyword);setNotice(`"${m.cta_keyword}" কপি হয়েছে!`)}} title="কিওয়ার্ড কপি করতে ক্লিক করুন"><Gift size={13}/>{m.cta_keyword}</button></TableCell><TableCell><div><span>{leadMagnetTypes[m.type]||m.type}</span><small className="cell-sub">{funnelStages[m.funnel_stage]||m.funnel_stage}</small></div></TableCell><TableCell><span className={'status status-'+m.status}>{leadMagnetStates[m.status]||m.status}</span></TableCell><TableCell className="tabular"><div className="lead-magnet-counts"><button className="text-button" onClick={()=>{setF({...defaults,business:m.business_id});setView('library')}} title="এই লাইব্রেরি পোস্ট দেখো">{number(linkedC)}টি পোস্ট</button><span>·</span><button className="text-button" onClick={()=>{setF({...defaults,business:m.business_id});setView('crm')}} title="এই লিডগুলো দেখো">{number(linkedL)}টি লিড</button></div></TableCell><TableCell><div className="row-actions"><button className="icon-button" title="সম্পাদনা" aria-label="সম্পাদনা" onClick={()=>setEditing({table:'lead_magnets',row:m})}><Pencil size={16}/></button>{m.resource_url&&<a href={m.resource_url} target="_blank" rel="noopener noreferrer" className="icon-button" title="রিসোর্স লিংক খোলো" aria-label="রিসোর্স লিংক"><ExternalLink size={16}/></a>}<button className="icon-button danger" title="লিড ম্যাগনেট মুছুন" aria-label="লিড ম্যাগনেট মুছুন" onClick={()=>setConfirmDeleteMagnet(m)}><Trash2 size={16}/></button></div></TableCell></TableRow>})}</TableBody></Table>{pagination(leadMagnets.length)}</>:<Blank title="কোনো লিড ম্যাগনেট নেই" description="একটি গাইড, চেকলিস্ট বা n8n ব্লুপ্রিন্ট যোগ করে কমেন্ট ক্যাম্পেইন শুরু করো।" children={<button className="primary" onClick={()=>newRecord('lead_magnets')}><Plus size={16}/>প্রথম লিড ম্যাগনেট যোগ করো</button>}/>}</section>}

 {view==='crm'&&<section className="panel"><div className="panel-heading"><div><h2>অডিয়েন্স ও লাইটওয়েট CRM</h2><p>কমেন্ট বা ডিএম করা ব্যক্তিদের তথ্য, রিসোর্স ডেলিভারি ও ক্লায়েন্ট ফলো-আপ</p></div><div className="heading-actions"><label className="check-label potential-toggle"><Checkbox checked={potentialOnly} onCheckedChange={v=>setPotentialOnly(!!v)}/><span>⭐ শুধু সম্ভাব্য ক্লায়েন্ট</span></label><div className="tab-pill-row"><button className={'tab-pill '+(crmTab==='leads'?'active':'')} onClick={()=>setCrmTab('leads')}>লিড তালিকা ({number(audienceLeads.length)})</button><button className={'tab-pill '+(crmTab==='interactions'?'active':'')} onClick={()=>setCrmTab('interactions')}>যোগাযোগের লগ ({number(leadInteractions.length)})</button></div><button className="primary" onClick={()=>newRecord(crmTab==='leads'?'audience_leads':'lead_interactions')}><Plus size={16}/>{crmTab==='leads'?'নতুন লিড':'যোগাযোগ রেকর্ড'}</button></div></div>
 {crmTab==='leads'?audienceLeads.length?<><Table><TableHeader><TableRow><TableHead>লিডের নাম ও হ্যান্ডেল</TableHead><TableHead>প্ল্যাটফর্ম</TableHead><TableHead>আগ্রহী ম্যাগনেট</TableHead><TableHead>অবস্থা</TableHead><TableHead>রিসোর্স স্ট্যাটাস</TableHead><TableHead>অ্যাকশন</TableHead></TableRow></TableHeader><TableBody>{audienceLeads.slice((page-1)*12,page*12).map(l=>{const lm=leadMagnetOf(l.lead_magnet_id);const sent=(data.lead_interactions||[]).some(i=>i.lead_id===l.id&&i.resource_sent);return <TableRow key={l.id} className={l.potential_client?'potential-row':''}><TableCell><div><div style={{display:'flex',alignItems:'center',gap:'6px'}}><strong>{l.full_name}</strong>{l.potential_client&&<span className="potential-badge" title="উচ্চ আগ্রহসম্পন্ন ক্লায়েন্ট">⭐ ক্লায়েন্ট</span>}</div>{l.handle?<small className="cell-sub">{l.profile_url?<a href={l.profile_url} target="_blank" rel="noopener noreferrer" className="handle-link">{l.handle} <ExternalLink size={11}/></a>:l.handle}</small>:l.email?<small className="cell-sub">{l.email}</small>:null}</div></TableCell><TableCell><Platform value={l.platform}/></TableCell><TableCell>{lm?<span className="keyword-badge">{lm.cta_keyword}</span>:<span className="muted">—</span>}</TableCell><TableCell><span className={'status status-'+(l.lead_status==='converted'||l.lead_status==='qualified'?'ready':'draft')}>{leadStatuses[l.lead_status]||l.lead_status}</span></TableCell><TableCell><button className={'resource-toggle '+(sent?'sent':'pending')} onClick={()=>toggleResourceSent(l)} title={sent?'রিসোর্স পাঠানো হয়েছে (ক্লিক করে বাতিল করো)':'রিসোর্স এখনো পাঠানো হয়নি (ক্লিক করে সম্পন্ন করো)'}>{sent?<><CheckCircle2 size={15}/>পাঠানো হয়েছে</>:<><Clock3 size={15}/>বাকি আছে</>}</button></TableCell><TableCell><div className="row-actions"><button className="icon-button" title="যোগাযোগ রেকর্ড করো" aria-label="যোগাযোগ রেকর্ড" onClick={()=>newRecord('lead_interactions',{lead_id:l.id,lead_magnet_id:l.lead_magnet_id,business_id:l.business_id,channel:l.platform==='linkedin'||l.platform==='instagram'||l.platform==='x'?'dm':'comment'})}><MessageSquare size={16}/></button><button className="icon-button" title="সম্পাদনা" aria-label="সম্পাদনা" onClick={()=>setEditing({table:'audience_leads',row:l})}><Pencil size={16}/></button><button className="icon-button danger" title="লিড মুছে ফেলুন" aria-label="লিড মুছুন" onClick={()=>setConfirmDeleteLead(l)}><Trash2 size={16}/></button></div></TableCell></TableRow>})}</TableBody></Table>{pagination(audienceLeads.length)}</>:<Blank title="কোনো লিড পাওয়া যায়নি" description="পোস্টে যারা কমেন্ট করেছে তাদের যুক্ত করো অথবা ফিল্টার পরিবর্তন করো।" children={<button className="primary" onClick={()=>newRecord('audience_leads')}><Plus size={16}/>নতুন লিড যোগ করো</button>}/>:
 leadInteractions.length?<><Table><TableHeader><TableRow><TableHead>লিড / ব্যক্তি</TableHead><TableHead>মাধ্যম ও ধরন</TableHead><TableHead>ব্যবহৃত কিওয়ার্ড</TableHead><TableHead>রিসোর্স পাঠানো</TableHead><TableHead>ফলো-আপ</TableHead><TableHead>তারিখ</TableHead><TableHead>অ্যাকশন</TableHead></TableRow></TableHeader><TableBody>{leadInteractions.slice((page-1)*12,page*12).map(i=>{const lead=(data.audience_leads||[]).find(l=>l.id===i.lead_id);return <TableRow key={i.id}><TableCell><div><strong>{lead?.full_name||'অজ্ঞাত লিড'}</strong><small className="cell-sub">{lead?.handle||platforms[lead?.platform||'']}</small></div></TableCell><TableCell><div><span>{interactionTypes[i.interaction_type]||i.interaction_type}</span><small className="cell-sub">{channels[i.channel]||i.channel}</small></div></TableCell><TableCell>{i.keyword_used?<span className="keyword-badge">{i.keyword_used}</span>:<span className="muted">—</span>}</TableCell><TableCell>{i.resource_sent?<span className="status status-ready"><Check size={13}/>পাঠানো হয়েছে</span>:<span className="status status-draft">বাকি</span>}</TableCell><TableCell><div><span>{followUpStates[i.follow_up_status]||i.follow_up_status}</span>{i.follow_up_at&&<small className="cell-sub">{dateLabel(i.follow_up_at,true)}</small>}</div></TableCell><TableCell className="tabular">{dateLabel(i.created_at)}</TableCell><TableCell><div className="row-actions"><button className="icon-button" title="সম্পাদনা" aria-label="সম্পাদনা" onClick={()=>setEditing({table:'lead_interactions',row:i})}><Pencil size={16}/></button></div></TableCell></TableRow>})}</TableBody></Table>{pagination(leadInteractions.length)}</>:<Blank title="কোনো যোগাযোগের হিসাব নেই" description="কমেন্ট বা মেসেজের ফলো-আপ ট্র্যাক করতে যোগাযোগ রেকর্ড করো।" children={<button className="primary" onClick={()=>newRecord('lead_interactions')}><Plus size={16}/>যোগাযোগ রেকর্ড করো</button>}/>}</section>}

 {view==='calendar'&&<section className="panel"><div className="panel-heading"><div><h2>পোস্ট ক্যালেন্ডার</h2><p>{number(monthPosts.length)}টি পোস্ট · যেকোনো দিনে ক্লিক করলে সেই দিনের কনটেন্ট খুলবে</p></div><div className="month-controls"><button className="icon-button" aria-label="আগের মাস" onClick={()=>changeMonth(-1)}><ChevronLeft size={18}/></button><input aria-label="মাস" type="month" value={month} onChange={e=>e.target.value&&setMonth(e.target.value)}/><button className="icon-button" aria-label="পরের মাস" onClick={()=>changeMonth(1)}><ChevronRight size={18}/></button></div></div><div className="calendar-scroll"><div className="calendar-grid">{['রবি','সোম','মঙ্গল','বুধ','বৃহস্পতি','শুক্র','শনি'].map(d=><div className="weekday" key={d}>{d}</div>)}{Array.from({length:Math.ceil((startDay+days)/7)*7},(_,i)=>{const day=i-startDay+1,inMonth=day>0&&day<=days,date=month+'-'+String(day).padStart(2,'0');return <div className={'calendar-cell '+(inMonth?'cursor-pointer ':'')+(!inMonth?'outside':'')+(date===f.selectedDate?' today':'')} key={i} onClick={()=>{if(inMonth){update('selectedDate',date);update('dateMode','single');setView('library')}}}>{inMonth&&<><span className="day-number">{number(day)}</span>{monthPosts.filter(p=>localDate(p.published_at||p.scheduled_at)===date).map(p=><button className={'calendar-post calendar-'+p.status} key={p.id} onClick={e=>{e.stopPropagation();setEditing({table:'posts',row:p})}}><strong>{contentOf(p)?.title}</strong><span>{platforms[p.platform]} · {postStates[p.status]}</span></button>)}</>}</div>})}</div></div><div className="panel-foot">যেকোনো তারিখে ক্লিক করে সরাসরি সেই দিনের একক ভিউতে কনটেন্ট ম্যানেজ করো।</div></section>}

 {view==='analytics'&&<><div className="stat-grid">{['reach','views','inquiries','qualified_leads'].map(k=>{const t=totals(k);return <div className="stat-card" key={k}><div className="stat-top"><span>{metricLabels[k]}</span><ChartNoAxesCombined size={18}/></div><strong>{number(t.value)}</strong><small>{number(t.count)} / {number(published.length)}টি পোস্টের জানা হিসাব</small></div>})}</div><div className="analytics-note"><ChartNoAxesCombined size={19}/><p>প্রতি পোস্টের সর্বশেষ মোট সংখ্যা দেখানো হচ্ছে। “—” মানে তথ্য নেই। রিচের যোগফলে একই মানুষ একাধিকবার থাকতে পারে।{f.dateMode==='single'?` ${formatBanglaDay(f.selectedDate)}-এর হিসাব।`:''}</p></div><section className="panel"><div className="panel-heading"><div><h2>কোন পোস্ট ভালো করছে</h2><p>নির্বাচিত মেট্রিক অনুযায়ী বেশি থেকে কম</p></div><div className="heading-actions"><Pick label="মেট্রিক" value={metric} onChange={setMetric} options={metricLabels}/><Pick value={sort} onChange={setSort} options={{newest:'সর্বোচ্চ আগে',oldest:'সর্বনিম্ন আগে'}} label="সাজাও"/></div></div><div className="panel-body">{postTable(published,true)}</div></section></>}

 {view==='groups'&&<Groups key={f.business} data={data} business={f.business} refresh={reload} edit={row=>row?setEditing({table:'destinations',row}):newRecord('destinations',{platform:'facebook',destination_type:'group'})} showPosts={g=>{setF({...defaults,business:g.business_id,destination:g.id});setView('posts')}}/>}

 {view==='products'&&<ProductPanel data={data} business={f.business} refresh={reload} edit={(t,row)=>row?setEditing({table:t,row}):newRecord(t)} save={save} filter={p=>{setF({...defaults,business:p.business_id,product:p.id});setView('library');setSort('newest')}}/>}

 {view==='settings'&&<div className="settings-stack"><div className="setup-box"><div><span className="kind-badge service">AI AUTOMATION & PERSONAL BRANDING</span><h3>এক ক্লিকে সম্পূর্ণ সেটআপ</h3><p>ব্যবসা হিসেবে 'AI Automation' (ডিজিটাল সার্ভিস) এবং প্রোডাক্ট হিসেবে 'Personal Branding' কনফিগার করো।</p></div><div className="row-actions"><button className="primary" onClick={()=>setConfirmSetupAi(true)} disabled={busyAction}><Sparkles size={16}/> সেটআপ করো</button><button className="secondary danger-btn" onClick={()=>setConfirmDeleteAll(true)} disabled={busyAction}><Trash2 size={16}/> সব কনটেন্ট ও লিড ম্যাগনেট মুছুন</button></div></div><BusinessPanel data={data} business={f.business} edit={(t,row)=>row?setEditing({table:t,row}):newRecord(t)} save={save}/><section className="panel"><div className="panel-heading"><div><h2>সোশ্যাল প্ল্যাটফর্ম ও অ্যাকাউন্ট</h2><p>যেসব প্রোফাইল বা পেজে কনটেন্ট প্রকাশিত হবে</p></div><button className="secondary" onClick={()=>newRecord('destinations')} disabled={!activeBusinesses.length}><Plus size={16}/>অ্যাকাউন্ট যোগ করো</button></div>{data.destinations.filter(d=>activeBusinesses.some(b=>b.id===d.business_id)&&(f.business==='all'||d.business_id===f.business)).length?<Table><TableHeader><TableRow><TableHead>অ্যাকাউন্টের নাম</TableHead><TableHead>বিজনেস</TableHead><TableHead>প্ল্যাটফর্ম</TableHead><TableHead>ধরন</TableHead><TableHead>টোকেন স্ট্যাটাস</TableHead><TableHead>অবস্থা</TableHead><TableHead>সর্বশেষ পোস্ট</TableHead><TableHead>অ্যাকশন</TableHead></TableRow></TableHeader><TableBody>{data.destinations.filter(d=>activeBusinesses.some(b=>b.id===d.business_id)&&(f.business==='all'||d.business_id===f.business)).map(d=>{const last=data.posts.filter(p=>p.destination_id===d.id&&p.status==='published').sort((a,b)=>b.published_at.localeCompare(a.published_at))[0];return <TableRow key={d.id}><TableCell><strong>{d.name}</strong><small className="cell-sub">{d.destination_type==='group'?'গ্রুপ':d.destination_type==='page'?'পেজ':'প্রোফাইল'}{d.approval_required?' · অনুমোদন লাগে':''}</small></TableCell><TableCell>{bname(d.business_id)}</TableCell><TableCell><Platform value={d.platform}/></TableCell><TableCell>{d.destination_type==='group'?'গ্রুপ':d.destination_type==='page'?'পেজ':'প্রোফাইল'}</TableCell><TableCell><TokenBadge destination={d}/></TableCell><TableCell><span className={'status '+(d.active?'status-ready':'status-archived')}>{d.active?'সক্রিয়':'নিষ্ক্রিয়'}</span></TableCell><TableCell>{dateLabel(last?.published_at)}</TableCell><TableCell><div className="row-actions"><CredentialsButton account={d}/><button className="icon-button" aria-label="অ্যাকাউন্ট সম্পাদনা" onClick={()=>setEditing({table:'destinations',row:d})}><Pencil size={16}/></button>{d.url&&<a className="icon-button" href={d.url} target="_blank" rel="noopener noreferrer" aria-label="অ্যাকাউন্ট খোলো"><ExternalLink size={16}/></a>}<button className="icon-button danger" title="সোশ্যাল অ্যাকাউন্ট মুছে ফেলুন" aria-label="সোশ্যাল অ্যাকাউন্ট মুছুন" onClick={()=>setConfirmDeleteDest(d)}><Trash2 size={16}/></button></div></TableCell></TableRow>})}</TableBody></Table>:<Blank title="অ্যাকাউন্টের লিংক যোগ করো" description="ফেসবুক পেজ ও গ্রুপ, ইনস্টাগ্রাম, টিকটক, লিংকডইন কিংবা এক্স।"/>}</section></div>}
 </>}
 <footer className="desk-foot"><span>Content Desk · AI Automation</span><span>তোমার কাজ। তোমার হিসাব।</span></footer></main></div>

 <Sheet open={!!selected} onOpenChange={open=>{if(!open)setDetail(null)}}><SheetContent className="detail-sheet"><SheetHeader><span className="section-kicker">{selected?bname(selected.business_id):''}</span><SheetTitle>{selected?.title}</SheetTitle><SheetDescription>{selected?[formats[selected.format],selected.topic,sources[selected.source]].filter(Boolean).join(' · '):''}</SheetDescription></SheetHeader>{selected&&<div className="detail-body"><div className="detail-actions"><Badge status={selected.status}/>{data.posts.some(p=>data.content_variants.some(v=>v.id===p.variant_id&&v.content_id===selected.id&&p.status==='published'))?<button className="posted-pill active" onClick={()=>markAsPosted(selected)} disabled={busyAction}><CheckCheck size={15}/> পোস্ট হয়েছে</button>:<button className="mark-posted-btn" onClick={()=>markAsPosted(selected)} disabled={busyAction}><Check size={15}/> এক ক্লিকে পোস্ট সম্পন্ন করো</button>}<button className="secondary" onClick={()=>setEditing({table:'contents',row:selected})}><Pencil size={15}/>সম্পাদনা</button><button className="icon-button danger" aria-label="কনটেন্ট মুছে ফেলো" title="কনটেন্ট মুছে ফেলো" onClick={()=>setConfirmDeleteContent(selected)}><Trash2 size={17}/></button></div><Tabs defaultValue="content"><TabsList className="detail-tabs"><TabsTrigger value="content">কনটেন্ট</TabsTrigger><TabsTrigger value="funnel">লিড ফানেল</TabsTrigger><TabsTrigger value="versions">সংস্করণ</TabsTrigger><TabsTrigger value="files">ফাইল</TabsTrigger><TabsTrigger value="history">পোস্ট ও ফলাফল</TabsTrigger></TabsList><TabsContent value="content"><div className="detail-section"><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}><h3>কনটেন্ট কপি</h3>{selected.script&&<button className="copy-btn" onClick={()=>{navigator.clipboard.writeText(selected.script);setNotice('কনটেন্ট কপি হয়েছে!');setCopied(true);setTimeout(()=>setCopied(false),2000)}}>{copied?<><Check size={14}/>কপি হয়েছে</>:<><Copy size={14}/>কপি করো</>}</button>}</div><p className="preserve">{selected.script||"কপি যোগ করা হয়নি।"}</p></div><ContentMedia assets={data.assets.filter(a=>a.content_id===selected.id)}/><div className="detail-section"><h3>প্রোডাক্ট / সার্ভিস</h3><p>{(data.products||[]).find(p=>p.id===selected.product_id&&!p.archived_at)?.name||(!data.products.some(p=>p.name.toLowerCase()===selected.offer_name?.toLowerCase()&&p.archived_at)?selected.offer_name:'—')||'—'}</p><h3>উদ্দেশ্য</h3><p>{intents[selected.objective]||selected.objective||"—"}</p></div>{(selected.brief||selected.ai_notes||(selected.tags||[]).length>0)&&<details className="content-optional"><summary>আরও তথ্য</summary><p className="preserve">{selected.brief}</p><p className="preserve">{selected.ai_notes}</p><div className="tags">{(selected.tags||[]).map((t:string)=><span key={t}>{t}</span>)}</div></details>}</TabsContent>
 <TabsContent value="funnel"><div className="detail-section"><h3>যুক্ত লিড ম্যাগনেট</h3>{selected.lead_magnet_id?(()=>{const lm=leadMagnetOf(selected.lead_magnet_id);return lm?<div className="lead-magnet-preview"><strong>{lm.name}</strong><p className="muted">{lm.description||'ফ্রি রিসোর্স'}</p><div style={{display:'flex',gap:'8px',marginTop:'10px',alignItems:'center'}}><span className="keyword-badge big-keyword">{selected.cta_keyword||lm.cta_keyword}</span><span className="status status-ready">{leadMagnetTypes[lm.type]}</span>{lm.resource_url&&<a href={lm.resource_url} target="_blank" rel="noopener noreferrer" className="text-button">রিসোর্স ফাইল <ExternalLink size={14}/></a>}</div></div>:<p className="muted">লিড ম্যাগনেট পাওয়া যায়নি।</p>})():<div className="quiet-empty"><p>এই কনটেন্টে কোনো লিড ম্যাগনেট যুক্ত নেই।</p><button className="secondary" onClick={()=>setEditing({table:'contents',row:selected})}><Plus size={15}/>লিড ম্যাগনেট যুক্ত করো</button></div>}</div>
 {selected.comment_prompt&&<div className="detail-section"><h3>কমেন্ট প্রম্পট (Comment Call-To-Action)</h3><div className="prompt-card"><p className="preserve">{selected.comment_prompt}</p><button className="copy-btn" onClick={()=>{navigator.clipboard.writeText(selected.comment_prompt);setCopied(true);setTimeout(()=>setCopied(false),2000)}}>{copied?<><Check size={14}/>কপি হয়েছে</>:<><Copy size={14}/>কপি করো</>}</button></div></div>}
 {selected.growth_goal&&<div className="detail-section"><h3>গ্রোথ গোল</h3><p>{growthGoals[selected.growth_goal]||selected.growth_goal}</p></div>}</TabsContent>
 <TabsContent value="versions"><button className="secondary full-width" onClick={()=>newRecord('content_variants',{business_id:selected.business_id,content_id:selected.id,body:selected.script||''})}><Plus size={17}/>প্ল্যাটফর্মের সংস্করণ যোগ করো</button>{data.content_variants.filter(v=>v.content_id===selected.id).map(v=>{const fullCopy=[v.body,(v.hashtags||[]).join(' '),v.cta].filter(Boolean).join('\n\n');const platformDests=(data.destinations||[]).filter(d=>d.active&&d.platform?.toLowerCase()===v.platform?.toLowerCase()&&(!selected.business_id||d.business_id===selected.business_id));const destsToDisplay=platformDests.length>0?platformDests:(data.destinations||[]).filter(d=>d.active&&d.platform?.toLowerCase()===v.platform?.toLowerCase());const defaultUrl=v.platform==='facebook'?'https://www.facebook.com':v.platform==='linkedin'?'https://www.linkedin.com/feed/':v.platform==='instagram'?'https://www.instagram.com':v.platform==='youtube'?'https://studio.youtube.com':v.platform==='twitter'?'https://x.com/compose/post':'https://www.facebook.com';return <div className="variant-card" key={v.id}><div className="variant-heading"><Platform value={v.platform}/><div style={{display:'flex',gap:'6px',alignItems:'center'}}>{fullCopy&&<button type="button" className="secondary small-btn copy-variant-btn" title="সম্পূর্ণ ক্যাপশন, হ্যাশট্যাগ ও CTA কপি করো" onClick={()=>{navigator.clipboard.writeText(fullCopy);setNotice(`${platforms[v.platform]||v.platform} সংস্করণ ক্যাপশন কপি হয়েছে!`);setCopiedVariantId(v.id);setTimeout(()=>setCopiedVariantId(null),2000)}}>{copiedVariantId===v.id?<><Check size={14}/> কপি হয়েছে</>:<><Copy size={14}/> ক্যাপশন কপি</>}</button>}<button className="icon-button" aria-label="সংস্করণ সম্পাদনা" onClick={()=>setEditing({table:'content_variants',row:v})}><Pencil size={16}/></button></div></div><strong>{v.label}</strong><p className="preserve">{v.body||'লেখা নেই'}</p><p className="muted">{(v.hashtags||[]).join(' ')}</p>{v.cta&&<p>{v.cta}</p>}<div className="variant-dest-box"><div className="variant-dest-header"><span className="variant-dest-title">সরাসরি পোস্ট লিংক / আইডি ({platforms[v.platform]||v.platform}):</span></div><div className="variant-dest-links">{destsToDisplay.map(d=>{const typeLabel=d.destination_type==='group'?'গ্রুপ':d.destination_type==='page'?'পেজ':'প্রোফাইল';const linkUrl=d.url||defaultUrl;return <a key={d.id} href={linkUrl} target="_blank" rel="noopener noreferrer" className="dest-badge-link" title={`${d.name} (${typeLabel}) - নতুন ট্যাবে খুলুন এবং পোস্ট করুন`}><span className="dest-badge-type">{typeLabel}</span><strong className="dest-badge-name">{d.name}</strong><ExternalLink size={12} className="dest-badge-icon"/></a>})}{destsToDisplay.length===0&&<a href={defaultUrl} target="_blank" rel="noopener noreferrer" className="dest-badge-link default-link" title={`${platforms[v.platform]||v.platform} খুলুন`}><strong>{platforms[v.platform]||v.platform}-এ যান</strong><ExternalLink size={12} className="dest-badge-icon"/></a>}<button type="button" className="dest-add-inline-btn" onClick={()=>newRecord('destinations',{business_id:selected.business_id,platform:v.platform,destination_type:'page'})} title="নতুন অ্যাকাউন্ট বা পেজ লিংক যুক্ত করুন">+ নতুন লিংক</button></div></div><button className="text-button" onClick={()=>newRecord('posts',{business_id:selected.business_id,variant_id:v.id,final_body:fullCopy})}>পোস্ট পরিকল্পনা করো <ArrowRight size={16}/></button></div>})}</TabsContent>
 <TabsContent value="files"><label className="upload-box"><Upload size={25}/><strong>{uploading?'আপলোড হচ্ছে…':'ছবি, ভিডিও বা ফাইল যোগ করো'}</strong><span>মূল ফাইল নিরাপদে সংরক্ষিত থাকবে</span><input type="file" disabled={uploading} onChange={e=>{const file=e.target.files?.[0];if(file)upload(file,selected);e.target.value=''}}/></label>{data.assets.filter(a=>a.content_id===selected.id).map(a=><div className="asset-row" key={a.id}>{a.media_type==='video'?<Video size={21}/>:a.media_type==='image'?<ImageIcon size={21}/>:<FileText size={21}/>}<div><strong>{a.file_name}</strong><small>{a.size_bytes?number(Math.ceil(a.size_bytes/1024))+' KB':'ফাইল'} · {dateLabel(a.created_at)}</small></div><button className="icon-button" aria-label="ফাইল খোলো" onClick={()=>openAsset(a)}><ExternalLink size={17}/></button></div>)}</TabsContent>
 <TabsContent value="history">{data.posts.filter(p=>data.content_variants.some(v=>v.id===p.variant_id&&v.content_id===selected.id)).map(p=><div className="variant-card" key={p.id}><div className="variant-heading"><Platform value={p.platform}/><Badge status={p.status}/></div><h3>{destinationOf(p)?.name}</h3><p className="muted">{dateLabel(p.published_at||p.scheduled_at,true)}</p><div className="row-actions"><button className="text-button" onClick={()=>setEditing({table:'posts',row:p})}>পোস্ট সম্পাদনা</button>{p.post_url&&<a className="text-button" href={p.post_url} target="_blank" rel="noopener noreferrer">পোস্ট খোলো <ExternalLink size={14}/></a>}</div>{p.status==='published'&&<><button className="secondary full-width" onClick={()=>newRecord('post_metrics',{business_id:p.business_id,post_id:p.id})}><Plus size={15}/>পরিসংখ্যান যোগ করো</button>{data.post_metrics.filter(m=>m.post_id===p.id).sort((a,b)=>b.measured_at.localeCompare(a.measured_at)).map(m=><div className="snapshot" key={m.id}><div><span>{dateLabel(m.measured_at,true)}</span><button className="icon-button" aria-label="পরিসংখ্যান সম্পাদনা" onClick={()=>setEditing({table:'post_metrics',row:m})}><Pencil size={14}/></button></div><dl>{Object.entries(metricLabels).filter(([k])=>m[k]!=null).map(([k,l])=><div key={k}><dt>{l}</dt><dd>{number(m[k])}{['revenue','spend'].includes(k)?' '+m.currency:''}</dd></div>)}</dl>{m.attribution_notes&&<p className="small muted">{m.attribution_notes}</p>}</div>)}</>}</div>)}</TabsContent></Tabs></div>}</SheetContent></Sheet>
 {editing&&<Editor key={editing.table+(editing.row?.id||'new')} {...editing} data={data} close={()=>setEditing(null)} save={save} refresh={reload}/>}

 {confirmDelete&&<Dialog open onOpenChange={(open)=>{if(!open&&!deleting)setConfirmDelete(null)}}><DialogContent className="editor-dialog confirm-dialog" style={{maxWidth:'480px'}}><DialogHeader><span className="eyebrow danger-eyebrow">সতর্কবার্তা</span><DialogTitle style={{fontSize:'20px'}}>পোস্ট মুছে ফেলা</DialogTitle><DialogDescription>তুমি কি নিশ্চিত যে <strong>{number(confirmDelete.count)}টি পোস্ট</strong> সম্পূর্ণ মুছে ফেলতে চাও? সাথে এই পোস্টগুলোর পারফরম্যান্স মেট্রিক্স রেকর্ডও স্বয়ংক্রিয়ভাবে মুছে যাবে।<br/><br/><span style={{color:'#bd3c3c',fontSize:'13px',fontWeight:500}}>⚠️ এই কাজটি আর পূর্বাবস্থায় ফিরিয়ে আনা সম্ভব নয়।</span></DialogDescription></DialogHeader><div className="form-actions" style={{marginTop:'18px'}}><button className="secondary" disabled={deleting} onClick={()=>setConfirmDelete(null)}>বাতিল</button><button className="danger-button" disabled={deleting} onClick={()=>confirmDelete&&executeDelete(confirmDelete.ids)}>{deleting?<LoaderCircle size={16} className="spin"/>:<Trash2 size={16}/>}{deleting?' মুছে ফেলা হচ্ছে...':'হ্যাঁ, মুছে ফেলো'}</button></div></DialogContent></Dialog>}

 <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>সব কনটেন্ট ও লিড ম্যাগনেট মুছে ফেলতে চাও?</AlertDialogTitle><AlertDialogDescription>তোমার বিজনেসের সকল কনটেন্ট, সংস্করণ, নির্ধারিত পোস্ট, লিড ম্যাগনেট এবং পরিসংখ্যান চিরতরে মুছে যাবে। এটি আর ফিরিয়ে আনা যাবে না।</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busyAction}>বাতিল</AlertDialogCancel><AlertDialogAction disabled={busyAction} className="danger-btn" onClick={e=>{e.preventDefault();void deleteAllContent()}}>{busyAction?'মুছে ফেলা হচ্ছে…':'সব কিছু মুছুন'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

 <AlertDialog open={!!confirmDeleteMagnet} onOpenChange={open=>{if(!open)setConfirmDeleteMagnet(null)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>"{confirmDeleteMagnet?.name}" লিড ম্যাগনেট মুছে ফেলবে?</AlertDialogTitle><AlertDialogDescription>এই লিড ম্যাগনেট এবং এর সাথে যুক্ত যোগাযোগের রেকর্ড মুছে যাবে। কনটেন্টগুলোতে থাকা লিংকও পরিষ্কার হয়ে যাবে।</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busyAction}>বাতিল</AlertDialogCancel><AlertDialogAction disabled={busyAction} className="danger-btn" onClick={e=>{e.preventDefault();if(confirmDeleteMagnet)void deleteLeadMagnet(confirmDeleteMagnet)}}>{busyAction?'মুছে ফেলা হচ্ছে…':'মুছে ফেলুন'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

 <AlertDialog open={confirmDeleteAllMagnets} onOpenChange={setConfirmDeleteAllMagnets}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>সব লিড ম্যাগনেট মুছে ফেলতে চাও?</AlertDialogTitle><AlertDialogDescription>তোমার বিজনেসের সব লিড ম্যাগনেট, অডিয়েন্স লিড ও মেসেজ লগ চিরতরে মুছে যাবে। এটি আর ফিরিয়ে আনা যাবে না।</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busyAction}>বাতিল</AlertDialogCancel><AlertDialogAction disabled={busyAction} className="danger-btn" onClick={e=>{e.preventDefault();void deleteAllLeadMagnets()}}>{busyAction?'মুছে ফেলা হচ্ছে…':'সব ম্যাগনেট মুছুন'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

 <AlertDialog open={!!confirmDeleteLead} onOpenChange={open=>{if(!open)setConfirmDeleteLead(null)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>"{confirmDeleteLead?.full_name}" লিড মুছে ফেলবে?</AlertDialogTitle><AlertDialogDescription>এই লিডের তথ্য এবং তার সাথে হওয়া সব মেসেজ/যোগাযোগের লগ মুছে ফেলা হবে।</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busyAction}>বাতিল</AlertDialogCancel><AlertDialogAction disabled={busyAction} className="danger-btn" onClick={e=>{e.preventDefault();if(confirmDeleteLead)void deleteLead(confirmDeleteLead)}}>{busyAction?'মুছে ফেলা হচ্ছে…':'মুছে ফেলুন'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

 <AlertDialog open={!!confirmDeleteContent} onOpenChange={open=>{if(!open)setConfirmDeleteContent(null)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>"{confirmDeleteContent?.title}" মুছে ফেলবে?</AlertDialogTitle><AlertDialogDescription>এই কনটেন্ট এবং এর সকল সংস্করণ ও পোস্টের রেকর্ড চিরতরে মুছে ফেলা হবে।</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busyAction}>বাতিল</AlertDialogCancel><AlertDialogAction disabled={busyAction} className="danger-btn" onClick={e=>{e.preventDefault();if(confirmDeleteContent)void deleteContent(confirmDeleteContent)}}>{busyAction?'মুছে ফেলা হচ্ছে…':'মুছে ফেলুন'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

 <AlertDialog open={confirmSetupAi} onOpenChange={setConfirmSetupAi}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>AI Automation ও Personal Branding প্রস্তুত করবে?</AlertDialogTitle><AlertDialogDescription>এটি তোমার প্রাথমিক বিজনেসকে "AI Automation" (ডিজিটাল সার্ভিস) এবং প্রোডাক্টকে "Personal Branding" হিসেবে সেট করবে। বাকি অপ্রয়োজনীয় বিজনেস ও প্রোডাক্ট সরিয়ে দিয়ে ওয়ার্কস্পেস একদম পরিষ্কার রাখা হবে।</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busyAction}>বাতিল</AlertDialogCancel><AlertDialogAction disabled={busyAction} onClick={e=>{e.preventDefault();void setupAiAutomation()}}>{busyAction?'সেটআপ হচ্ছে…':'সেটআপ সম্পন্ন করো'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 <AlertDialog open={!!confirmDeleteDest} onOpenChange={open=>{if(!open)setConfirmDeleteDest(null)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>"{confirmDeleteDest?.name}" সোশ্যাল অ্যাকাউন্ট মুছে ফেলবে?</AlertDialogTitle><AlertDialogDescription>এই সোশ্যাল প্ল্যাটফর্ম অ্যাকাউন্ট এবং এর সাথে সম্পর্কিত পোস্ট ও মেট্রিক্সের রেকর্ড মুছে ফেলা হবে। এটি আর ফিরিয়ে আনা যাবে না।</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busyAction}>বাতিল</AlertDialogCancel><AlertDialogAction disabled={busyAction} className="danger-btn" onClick={e=>{e.preventDefault();if(confirmDeleteDest)void deleteDestination(confirmDeleteDest)}}>{busyAction?'মুছে ফেলা হচ্ছে…':'মুছে ফেলুন'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </SidebarProvider>;
}
