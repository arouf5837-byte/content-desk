'use client';
import type {ReactNode} from 'react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Empty,EmptyHeader,EmptyMedia,EmptyTitle,EmptyDescription} from '@/components/ui/empty';
import {FolderOpen} from 'lucide-react';
import {contentStates,postStates,platforms,getTokenInfo,dateLabel,type Row} from '@/lib/content';
export function Pick({value,onChange,options,label,disabled=false}:{value:string;onChange:(v:string)=>void;options:Record<string,string>;label:string;disabled?:boolean}){
 return <Select value={value||null} onValueChange={v=>onChange(v?String(v):'')} disabled={disabled}><SelectTrigger className="desk-select" aria-label={label}><SelectValue>{options[value]||label}</SelectValue></SelectTrigger><SelectContent>{Object.entries(options).map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
}
export function Badge({status}:{status:string}){return <span className={'status status-'+status}><i/>{contentStates[status]||postStates[status]||status}</span>}
export function TokenBadge({destination}:{destination?:Row|null}){
 const info=getTokenInfo(destination);
 return <span className={'token-badge token-'+info.status} title={info.expiryDate?`মেয়াদ: ${dateLabel(info.expiryDate,true)}`:info.label}><i className="token-dot"/>{info.label}</span>;
}
export function Platform({value}:{value:string}){return <span className="platform"><span className={'platform-icon platform-'+value}>{({facebook:'f',instagram:'◎',linkedin:'in',tiktok:'♪',x:'𝕏'} as Record<string,string>)[value]||'•'}</span>{platforms[value]||value}</span>}
export function Blank({title='কিছু পাওয়া যায়নি',description='ফিল্টার বদলে দেখো অথবা নতুন কনটেন্ট যোগ করো।',children}:{title?:string;description?:string;children?:ReactNode}){return <Empty className="blank"><EmptyHeader><EmptyMedia variant="icon"><FolderOpen/></EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>{children}</Empty>}
