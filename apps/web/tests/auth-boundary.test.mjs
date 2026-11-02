import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authConfig} from '../lib/auth/config.ts';
import {credentials,sameOrigin,json,limitedBody} from '../lib/auth/http.ts';
test('configuration rejects the Cybrion project even with matching environment fields',()=>{
 const previous={...process.env};
 try{process.env.SMRITI_SUPABASE_URL='https://qrjsxucybeorxeiqfsjo.supabase.co';process.env.SMRITI_SUPABASE_PROJECT_REF='qrjsxucybeorxeiqfsjo';process.env.SMRITI_SUPABASE_PUBLISHABLE_KEY='sb_publishable_synthetic';assert.equal(authConfig(),null);}
 finally{for(const key of ['SMRITI_SUPABASE_URL','SMRITI_SUPABASE_PROJECT_REF','SMRITI_SUPABASE_PUBLISHABLE_KEY'])if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
});
test('signup validation rejects role and privilege injection',()=>{assert.equal(credentials.safeParse({email:'synthetic@example.invalid',password:'long-test-password',role:'clinician'}).success,false);});
test('mutation origin check rejects missing and cross-origin headers',()=>{assert.equal(sameOrigin(new Request('https://smriti.example/api/auth/logout',{method:'POST'})),false);assert.equal(sameOrigin(new Request('https://smriti.example/api/auth/logout',{method:'POST',headers:{origin:'https://attacker.example'}})),false);assert.equal(sameOrigin(new Request('https://smriti.example/api/auth/logout',{method:'POST',headers:{origin:'https://smriti.example'}})),true);});
test('API errors never permit shared caching',()=>{const response=json({error:'forbidden'},403);assert.equal(response.status,403);assert.match(response.headers.get('cache-control'),/private, no-store/);});

test('auth body limit rejects oversized requests before JSON parsing',async()=>{assert.equal(await limitedBody(new Request('https://smriti.example/api/auth/login',{method:'POST',body:'x'.repeat(4097)})),null);assert.equal(await limitedBody(new Request('https://smriti.example/api/auth/login',{method:'POST',body:'{}'})),'{}');});
