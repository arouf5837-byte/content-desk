'use client';
import {useState} from 'react';
import {Package,BriefcaseBusiness,Plus,Pencil,Archive,RotateCcw,ArrowRight,Building2,Search,Trash2,LoaderCircle} from 'lucide-react';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {type Data,type Row,number,errorText,businessKindLabel} from '@/lib/content';
import {db} from '@/lib/supabase';
import {Blank} from './desk-ui';
type Props={data:Data;business:string;edit:(table:string,row?:Row)=>void;save:(table:string,payload:Record<string,any>,id?:string)=>Promise<any>;filter?:(product:Row)=>void;refresh?:()=>Promise<void>};
export function ArchiveAction({row,table,save}:{row:Row;table:string;save:Props['save']}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function act(){setBusy(true);setError('');try{await save(table,{archived_at:row.archived_at?null:new Date().toISOString()},row.id);setOpen(false)}catch(e){setError(errorText(e))}finally{setBusy(false)}}
 return <><button className="icon-button" title={row.archived_at?'ফেরত আনো':'আর্কাইভ করো'} aria-label={row.name+' '+(row.archived_at?'ফেরত আনো':'আর্কাইভ করো')} onClick={()=>setOpen(true)}>{row.archived_at?<RotateCcw size={17}/>:<Archive size={17}/>}</button><AlertDialog open={open} onOpenChange={v=>{if(!busy)setOpen(v)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{row.name} {row.archived_at?'ফেরত আনবে?':'সরিয়ে রাখবে?'}</AlertDialogTitle><AlertDialogDescription>{row.archived_at?'এটি আবার সক্রিয় তালিকায় দেখা যাবে।':'সক্রিয় তালিকা থেকে সরবে। পুরোনো কনটেন্ট, ফাইল ও পোস্টের হিসাব থাকবে; আর্কাইভ থেকে আবার ফিরিয়ে আনতে পারবে।'}</AlertDialogDescription></AlertDialogHeader>{error&&<div className="error-message" role="alert">{error}</div>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>বাতিল</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e=>{e.preventDefault();void act()}}>{busy?'সেভ হচ্ছে…':row.archived_at?'ফেরত আনো':'আর্কাইভ করো'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>
}
export function BusinessPanel({data,business,edit,save}:Props){
 const [tab,setTab]=useState('active'),[kindFilter,setKindFilter]=useState('all');
 const rows=data.businesses.filter(b=>(tab==='archived'?!!b.archived_at:!b.archived_at)&&(business==='all'||b.id===business)&&(kindFilter==='all'||(kindFilter==='digital_service'?['agency','digital_service'].includes(b.kind):['ecom','physical'].includes(b.kind))));
 return <section className="panel"><div className="panel-heading"><div><h2>আমার বিজনেস <span className="count-pill">{number(rows.length)}</span></h2><p>ডিজিটাল সার্ভিস ও ফিজিক্যাল বিজনেসের তালিকা</p></div><div className="row-actions"><Tabs value={kindFilter} onValueChange={v=>setKindFilter(String(v))}><TabsList><TabsTrigger value="all">সব</TabsTrigger><TabsTrigger value="digital_service">ডিজিটাল সার্ভিস</TabsTrigger><TabsTrigger value="physical">ফিজিক্যাল</TabsTrigger></TabsList></Tabs><Tabs value={tab} onValueChange={v=>setTab(String(v))}><TabsList><TabsTrigger value="active">সক্রিয়</TabsTrigger><TabsTrigger value="archived">আর্কাইভ</TabsTrigger></TabsList></Tabs></div></div><div className="business-grid">{rows.map(b=><div className="business-card" key={b.id}><span className={'business-icon '+b.kind}><Building2 size={24}/></span><div><h3>{b.name}</h3><p><span className={'kind-badge '+(b.kind==='agency'?'service':'')}>{businessKindLabel(b.kind)}</span> · {number(data.destinations.filter(d=>d.business_id===b.id&&d.active).length)}টি অ্যাকাউন্ট</p></div><div className="row-actions">{!b.archived_at&&<button className="icon-button" aria-label={b.name+' সম্পাদনা'} onClick={()=>edit('businesses',b)}><Pencil size={17}/></button>}<ArchiveAction row={b} table="businesses" save={save}/></div></div>)}</div>{!rows.length&&<Blank title={tab==='archived'?'কোনো বিজনেস আর্কাইভে নেই':'বিজনেস যোগ করো'} description={tab==='archived'?'সরিয়ে রাখা বিজনেসগুলো এখানে পাওয়া যাবে।':'প্রয়োজনমতো ডিজিটাল সার্ভিস (যেমন: AI Automation) ও ফিজিক্যাল বিজনেস যোগ করতে পারবে।'}/>}</section>
}
export function ProductPanel({data,business,edit,save,filter,refresh}:Props){
 const [q,setQ]=useState(''),[tab,setTab]=useState('active');
 const [deleteConfirm,setDeleteConfirm]=useState<Row|null>(null);
 const [deleteArchivedConfirm,setDeleteArchivedConfirm]=useState(false);
 const [busyDelete,setBusyDelete]=useState(false);
 const [deleteError,setDeleteError]=useState('');

 const active=new Set(data.businesses.filter(b=>!b.archived_at).map(b=>b.id));
 const rows=data.products.filter(p=>active.has(p.business_id)&&(business==='all'||p.business_id===business)&&(tab==='archived'?!!p.archived_at:!p.archived_at)&&[p.name,p.description].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase()));
 const archivedCount=data.products.filter(p=>active.has(p.business_id)&&(business==='all'||p.business_id===business)&&!!p.archived_at).length;

 async function executeDelete(p:Row){
  setBusyDelete(true);
  setDeleteError('');
  try{
   await db.from('contents').update({product_id:null,offer_name:null}).eq('product_id',p.id);
   await db.from('destination_products').delete().eq('product_id',p.id);
   const {error}=await db.from('products').delete().eq('id',p.id);
   if(error)throw error;
   setDeleteConfirm(null);
   if(refresh)await refresh();
  }catch(e){
   setDeleteError(errorText(e));
  }finally{
   setBusyDelete(false);
  }
 }

 async function executeDeleteAllArchived(){
  setBusyDelete(true);
  setDeleteError('');
  try{
   const archivedList=data.products.filter(p=>!!p.archived_at&&active.has(p.business_id)&&(business==='all'||p.business_id===business));
   const ids=archivedList.map(p=>p.id);
   if(ids.length){
    await db.from('contents').update({product_id:null,offer_name:null}).in('product_id',ids);
    await db.from('destination_products').delete().in('product_id',ids);
    const {error}=await db.from('products').delete().in('id',ids);
    if(error)throw error;
   }
   setDeleteArchivedConfirm(false);
   if(refresh)await refresh();
  }catch(e){
   setDeleteError(errorText(e));
  }finally{
   setBusyDelete(false);
  }
 }

 return <section className="panel"><div className="panel-heading"><div style={{display:'flex',alignItems:'center',gap:'12px'}}><h2>প্রোডাক্ট ও সার্ভিস <span className="count-pill">{number(rows.length)}</span></h2>{tab==='archived'&&archivedCount>0&&<button className="secondary danger-btn" style={{minHeight:'32px',padding:'4px 10px',fontSize:'13px'}} onClick={()=>setDeleteArchivedConfirm(true)}><Trash2 size={14}/> সব আর্কাইভ মুছুন ({number(archivedCount)})</button>}</div><Tabs value={tab} onValueChange={v=>setTab(String(v))}><TabsList><TabsTrigger value="active">সক্রিয়</TabsTrigger><TabsTrigger value="archived">আর্কাইভ {archivedCount>0?`(${number(archivedCount)})`:''}</TabsTrigger></TabsList></Tabs></div><div className="catalog-search search-box"><Search size={17}/><input aria-label="প্রোডাক্ট খোঁজো" placeholder="প্রোডাক্ট বা সার্ভিস খোঁজো…" value={q} onChange={e=>setQ(e.target.value)}/></div><div className="product-grid">{rows.map(p=>{const cs=data.contents.filter(c=>c.product_id===p.id);const vids=new Set(data.content_variants.filter(v=>cs.some(c=>c.id===v.content_id)).map(v=>v.id));const posts=data.posts.filter(x=>vids.has(x.variant_id));const Icon=p.kind==='service'?BriefcaseBusiness:Package;return <article className="product-card" key={p.id}><div className="product-top"><span className="business-icon"><Icon size={23}/></span><div className="row-actions">{!p.archived_at&&<button className="icon-button" aria-label={p.name+' সম্পাদনা'} title="সম্পাদনা" onClick={()=>edit('products',p)}><Pencil size={16}/></button>}<ArchiveAction row={p} table="products" save={save}/><button className="icon-button danger" aria-label={p.name+' মুছুন'} title="স্থায়ীভাবে মুছে ফেলুন" onClick={()=>setDeleteConfirm(p)}><Trash2 size={16}/></button></div></div><span className="product-business">{data.businesses.find(b=>b.id===p.business_id)?.name} · {p.kind==='service'?'ডিজিটাল সার্ভিস':'ফিজিক্যাল প্রোডাক্ট'}</span><h3>{p.name}</h3>{p.description&&<p className="product-description">{p.description}</p>}<div className="product-counts"><div><strong>{number(cs.length)}</strong><span>কনটেন্ট</span></div><div><strong>{number(posts.filter(p=>p.status==='published').length)}</strong><span>প্রকাশিত পোস্ট</span></div><div><strong>{number(posts.filter(p=>['planned','scheduled','pending_approval','failed'].includes(p.status)).length)}</strong><span>পোস্ট বাকি</span></div></div><button className="text-button" onClick={()=>filter?.(p)}>কনটেন্ট দেখো <ArrowRight size={16}/></button></article>})}</div>{!rows.length&&<Blank title={tab==='archived'?'কোনো প্রোডাক্ট আর্কাইভে নেই':'প্রথম প্রোডাক্ট বা সার্ভিস যোগ করো'} description="AI Automation, Personal Branding-এর মতো সার্ভিস বা ফিজিক্যাল প্রোডাক্ট।">{tab==='active'&&<button className="primary" disabled={!active.size} onClick={()=>edit('products')}><Plus size={16}/>প্রোডাক্ট / সার্ভিস যোগ করো</button>}</Blank>}
 {deleteConfirm&&<AlertDialog open onOpenChange={v=>{if(!busyDelete&&!v)setDeleteConfirm(null)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>"{deleteConfirm.name}" স্থায়ীভাবে মুছে ফেলতে চান?</AlertDialogTitle><AlertDialogDescription>এই প্রোডাক্ট বা সার্ভিসটি ডেটাবেস থেকে সম্পূর্ণ মুছে ফেলা হবে। সম্পর্কিত কোনো কনটেন্ট থাকলে সেগুলোর লিঙ্ক স্বয়ংক্রিয়ভাবে মুক্ত হয়ে যাবে।<br/><br/><span style={{color:'#bd3c3c',fontSize:'13px',fontWeight:500}}>⚠️ এই কাজটি পূর্বাবস্থায় ফিরিয়ে আনা সম্ভব নয়।</span></AlertDialogDescription></AlertDialogHeader>{deleteError&&<div className="error-message" role="alert">{deleteError}</div>}<AlertDialogFooter><AlertDialogCancel disabled={busyDelete}>বাতিল</AlertDialogCancel><AlertDialogAction disabled={busyDelete} className="danger-button" onClick={e=>{e.preventDefault();void executeDelete(deleteConfirm)}}>{busyDelete?<LoaderCircle size={16} className="spin"/>:<Trash2 size={16}/>}{busyDelete?'মুছে ফেলা হচ্ছে…':'হ্যাঁ, মুছে ফেলো'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
 {deleteArchivedConfirm&&<AlertDialog open onOpenChange={v=>{if(!busyDelete&&!v)setDeleteArchivedConfirm(false)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>সব আর্কাইভ প্রোডাক্ট মুছে ফেলতে চান?</AlertDialogTitle><AlertDialogDescription>তুমি কি নিশ্চিত যে <strong>{number(archivedCount)}টি আর্কাইভ প্রোডাক্ট</strong> স্থায়ীভাবে মুছে ফেলতে চাও? এটি করার পর আর এগুলো ফিরিয়ে আনা যাবে না।</AlertDialogDescription></AlertDialogHeader>{deleteError&&<div className="error-message" role="alert">{deleteError}</div>}<AlertDialogFooter><AlertDialogCancel disabled={busyDelete}>বাতিল</AlertDialogCancel><AlertDialogAction disabled={busyDelete} className="danger-button" onClick={e=>{e.preventDefault();void executeDeleteAllArchived()}}>{busyDelete?<LoaderCircle size={16} className="spin"/>:<Trash2 size={16}/>}{busyDelete?'মুছে ফেলা হচ্ছে…':'হ্যাঁ, সব মুছুন'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
 </section>;
}

