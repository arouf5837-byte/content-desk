import {db} from './supabase';
export async function storeMedia(file:File,businessId:string,contentId:string){
 const ext=file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g,'').toLowerCase()||'bin';
 const path=businessId+'/'+contentId+'/'+crypto.randomUUID()+'.'+ext;
 const {error}=await db.storage.from('content-media').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});
 if(error)throw error;
 const {error:recordError}=await db.from('assets').insert({business_id:businessId,content_id:contentId,storage_path:path,file_name:file.name,media_type:file.type.startsWith('image/')?'image':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':'document',mime_type:file.type,size_bytes:file.size});
 if(recordError){await db.storage.from('content-media').remove([path]);throw recordError}
}
