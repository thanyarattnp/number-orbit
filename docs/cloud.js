'use strict';
const ScoreCloud=(()=>{
 let clientPromise,authPromise;
 async function client(){
  if(!clientPromise)clientPromise=(async()=>{
   const c=window.NUMBER_ORBIT_CONFIG||{};
   if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.supabaseUrl||'')||!c.supabasePublishableKey)
    throw new Error('ยังไม่ได้ตั้งค่าฐานข้อมูล กรุณากรอก config.js ตามคู่มือ');
   if(c.supabasePublishableKey.startsWith('sb_secret_'))throw new Error('ต้องใช้ Publishable key เท่านั้น');
   const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
   return createClient(c.supabaseUrl,c.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'number-orbit-'+new URL(c.supabaseUrl).hostname}});
  })().catch(e=>{clientPromise=null;throw e;});
  return clientPromise;
 }
 async function ready(){
  const c=await client();
  if(!authPromise)authPromise=(async()=>{
   const {data,error}=await c.auth.getSession();if(error)throw error;
   if(!data.session){const result=await c.auth.signInAnonymously();if(result.error)throw result.error;}
   return c;
  })().finally(()=>{authPromise=null;});
  return authPromise;
 }
 async function rpc(name,args){
  const c=await ready(),{data,error}=await c.rpc(name,args);
  if(error)throw new Error('บันทึก/อ่านคะแนนไม่สำเร็จ: '+error.message);
  return data;
 }
 return {save:record=>rpc('orbit_save_run',{record}),load:()=>rpc('orbit_my_stats')};
})();
