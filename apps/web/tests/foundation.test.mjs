import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const dictionaries=JSON.parse(readFileSync('lib/messages.json','utf8'));
function shape(x){return Array.isArray(x)?x.map(shape):typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,shape(v)])):typeof x;}
test('all offered locales have complete message and role/pillar coverage',()=>{for(const d of Object.values(dictionaries)){assert.deepEqual(shape(d),shape(dictionaries['en-IN']));assert.equal(d.tabs.length,3);assert.equal(d.roles.length,3);assert.equal(d.titles.length,3);for(const row of d.titles)assert.equal(row.length,3);}});
test('voice and clinical capabilities stay disabled in all preview locales',()=>{for(const c of Object.values(JSON.parse(readFileSync('lib/capabilities.json','utf8')))){for(const key of ['stt','tts','conversationLLM','clinicalAssessments'])assert.equal(c[key],'off');}});
function worker({offline=false,previous=['smriti-shell-old','unrelated-cache']}={}){
 const handlers={};const cached=new Map();const deleted=[];const writes=[];const requests=[];
 const cache={addAll:async rs=>{rs.forEach(r=>{writes.push(r);cached.set(new URL(r.url).pathname,new Response('offline shell'));});},match:async p=>cached.get(p)};
 class LocalRequest extends Request{constructor(url,options){super(new URL(url,'https://smriti.test'),options);}}
 const self={location:{origin:'https://smriti.test'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>handlers[name]=fn};
 const context=vm.createContext({self,URL,Request:LocalRequest,Response,fetch:async r=>{requests.push(r);if(offline)throw new Error('offline');return new Response('network');},caches:{open:async()=>cache,keys:async()=>previous,delete:async name=>deleted.push(name)}});
 context.importScripts=()=>vm.runInContext(readFileSync('public/sw-assets.js','utf8'),context);
 vm.runInContext(readFileSync('public/sw.js','utf8'),context);
 return {self,handlers,cached,deleted,writes,requests,dispatch:async(name,event={})=>{let result;handlers[name]({...event,waitUntil:p=>result=p,respondWith:p=>result=p});return await result;}};
}
test('install caches only the explicit public allowlist with credentials omitted',async()=>{const w=worker();await w.dispatch('install');assert.ok(w.writes.length>0);for(const req of w.writes){assert.equal(req.credentials,'omit');const path=new URL(req.url).pathname;assert.ok(existsSync('public'+path));assert.ok(!/api|patient|session|transcript/.test(path));}assert.equal(w.writes.filter(r=>r.url.endsWith('.html')).length,1);});
test('offline navigation returns public shell without caching the private URL',async()=>{const w=worker({offline:true});await w.dispatch('install');const before=w.writes.length;const result=await w.dispatch('fetch',{request:{url:'https://smriti.test/monitoring/patients/private-id',method:'GET',mode:'navigate',headers:new Headers()}});assert.equal(await result.text(),'offline shell');assert.equal(w.writes.length,before);assert.equal(w.cached.has('/monitoring/patients/private-id'),false);});
test('API, authorization, cross-origin and POST requests are never intercepted',async()=>{const w=worker();for(const req of [{url:'https://smriti.test/api/v1/patients'},{url:'https://other.test/offline.html'},{method:'POST'},{headers:new Headers({Authorization:'Bearer synthetic-test'})}]){const result=await w.dispatch('fetch',{request:{url:'https://smriti.test/offline.html',method:'GET',mode:'cors',headers:new Headers(),...req}});assert.equal(result,undefined);}assert.equal(w.requests.length,0);});
test('RSC and query-bearing asset requests are not cached or intercepted',async()=>{const w=worker();for(const url of ['/companionship?_rsc=x','/offline.html?patient=synthetic'])assert.equal(await w.dispatch('fetch',{request:{url:'https://smriti.test'+url,method:'GET',mode:'cors',headers:new Headers()}}),undefined);});
test('activation removes only obsolete Smriti cache versions',async()=>{const w=worker();await w.dispatch('activate');assert.deepEqual(w.deleted,['smriti-shell-old']);});
test('online navigation uses the server and does not store its response',async()=>{const w=worker();const result=await w.dispatch('fetch',{request:{url:'https://smriti.test/monitoring',method:'GET',mode:'navigate',headers:new Headers()}});assert.equal(await result.text(),'network');assert.equal(w.writes.length,0);});
