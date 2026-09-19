'use client';
import {useEffect,useState} from 'react';
import {db} from '@/lib/supabase';
import type {Row} from '@/lib/content';
function Preview({asset}:{asset:Row}){
 const [url,setUrl]=useState(''),[failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true;db.storage.from(asset.bucket_id).createSignedUrl(asset.storage_path,3600).then(({data,error})=>{if(alive){setUrl(data?.signedUrl||'');setFailed(!!error)}});return()=>{alive=false}},[asset.bucket_id,asset.storage_path]);
 return <figure className="saved-media">{url?(asset.media_type==='video'?<video src={url} controls preload="metadata"/>:<img src={url} alt={asset.file_name} loading="lazy" onError={()=>setFailed(true)}/>):<span>{failed?'ছবি লোড হয়নি':'লোড হচ্ছে…'}</span>}<figcaption>{asset.file_name}</figcaption></figure>
}
export default function ContentMedia({assets}:{assets:Row[]}){return <div className="saved-media-grid">{assets.filter(a=>['image','video'].includes(a.media_type)).map(a=><Preview key={a.id} asset={a}/>)}</div>}
