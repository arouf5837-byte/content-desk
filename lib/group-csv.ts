export type GroupInput={name:string;url:string;audience_notes:string|null;posting_rules:string|null;approval_required:boolean;product_names:string[]};
export type PreviewRow={line:number;group:GroupInput|null;original:string;reason:string;status:'ready'|'duplicate'|'invalid'};
export const maxGroupRows=2000;
export function normalizeGroupUrl(raw:string){
 let value=raw.trim();if(!/^https?:\/\//i.test(value))value='https://'+value;
 let url:URL;try{url=new URL(value)}catch{throw new Error('সঠিক গ্রুপ লিংক নয়')}
 if(!['facebook.com','www.facebook.com','m.facebook.com','mbasic.facebook.com','web.facebook.com'].includes(url.hostname.toLowerCase())||url.username||url.password||url.port)throw new Error('Facebook গ্রুপের সরাসরি লিংক দাও');
 const id=url.pathname.match(/^\/groups\/([a-z0-9._-]+)(?:\/|$)/i)?.[1]?.toLowerCase();
 if(!id||['feed','discover','create','joins','search','yourgroups'].includes(id)||/replace_with|your_group/.test(id))throw new Error('লিংকে /groups/ এর পরে আসল গ্রুপ ID বা নাম থাকতে হবে');
 return 'https://www.facebook.com/groups/'+id+'/';
}
function parse(text:string,delimiter:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],value='',quoted=false,ended=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++}else{quoted=false;ended=true}}else value+=c;continue}
 if(c==='"'){if(value.trim()||ended)throw new Error('CSV-তে উদ্ধৃতির চিহ্ন ঠিক নেই');value='';quoted=true}
 else if(c===delimiter){row.push(value);value='';ended=false}
 else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v.trim()))rows.push(row);row=[];value='';ended=false}
 else{if(ended&&c.trim())throw new Error('CSV-তে উদ্ধৃতির পরে অপ্রত্যাশিত লেখা আছে');if(!ended)value+=c}
 }
 if(quoted)throw new Error('CSV-তে একটি উদ্ধৃতি বন্ধ করা হয়নি');row.push(value);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
export function readGroupCsv(text:string,existingUrls:string[]):PreviewRow[]{
 const clean=text.replace(/^\uFEFF/,'');let parsed:string[][]=[];
 const counts:Record<string,number>={',':0,';':0,'\t':0};let quoted=false;for(let i=0;i<clean.length;i++){const ch=clean[i];if(ch==='\"'){if(quoted&&clean[i+1]==='\"'){i++;continue}quoted=!quoted}else if(!quoted&&(ch==='\n'||ch==='\r'))break;else if(!quoted&&ch in counts)counts[ch]++}const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];parsed=parse(clean,delimiter);
 if(!parsed.length)throw new Error('ফাইলটি খালি');
 const header=parsed[0].map(v=>v.trim().toLowerCase().replace(/[ -]+/g,'_'));
 const aliases:Record<string,string[]>={url:['url','link','group_url','group_link'],name:['name','group_name'],products:['products','product','services','service','product_service','product_or_service'],audience_notes:['audience_notes','audience'],posting_rules:['posting_rules','rules'],approval_required:['approval_required','approval']};
 const indexes=Object.fromEntries(Object.entries(aliases).map(([k,names])=>[k,header.findIndex(h=>names.includes(h))]));
 const hasHeader=indexes.url>=0;
 if(!hasHeader&&parsed[0].length!==1)throw new Error('CSV-তে url বা group_link নামের কলাম রাখো');
 const records=hasHeader?parsed.slice(1):parsed;
 if(records.length>maxGroupRows)throw new Error('একবারে সর্বোচ্চ ২০০০টি গ্রুপ যোগ করা যাবে। ফাইলটি ভাগ করে আপলোড করো।');
 const seen=new Set<string>();for(const v of existingUrls){try{seen.add(normalizeGroupUrl(v))}catch{}}
 return records.map((cells,i)=>{
 const line=i+(hasHeader?2:1),raw=(hasHeader?cells[indexes.url]||'':cells[0]||'').trim();
 const field=(key:string)=>indexes[key]>=0?(cells[indexes[key]]||'').trim():'';
 try{
 if(hasHeader&&cells.length>header.length)throw new Error('কলাম বেশি হয়েছে; কমা থাকা লেখা উদ্ধৃতির মধ্যে রাখো');
 const url=normalizeGroupUrl(raw),approval=hasHeader?field('approval_required').toLowerCase():'';
 if(!['','true','false','yes','no','1','0','হ্যাঁ','না'].includes(approval))throw new Error('approval_required-এ true অথবা false দাও');
 const name=(hasHeader?field('name'):'')||'Facebook group · '+url.split('/')[4];
 if(name.length>250)throw new Error('গ্রুপের নাম ২৫০ অক্ষরের মধ্যে রাখো');
 const product_names=(hasHeader?field('products'):'').split('|').map(v=>v.trim()).filter(Boolean);
 const group={name,url,product_names,audience_notes:hasHeader?field('audience_notes')||null:null,posting_rules:hasHeader?field('posting_rules')||null:null,approval_required:['true','yes','1','হ্যাঁ'].includes(approval)};
 if(seen.has(url))return {line,group,original:raw,reason:'এই বিজনেসে বা ফাইলে একই লিংক আছে',status:'duplicate' as const};
 seen.add(url);return {line,group,original:raw,reason:'যোগ করার জন্য প্রস্তুত',status:'ready' as const};
 }catch(e){return {line,group:null,original:raw,reason:(e as Error).message,status:'invalid' as const}}
 });
}
