import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createModelChain,runModelChain} from '../lib/voice/fallback.ts';

test('five-model fallbacks use three Groq and two Gemini models with no duplicate first model',()=>{
 const chain=createModelChain({
  primary:{provider:'groq',model:'openai/gpt-oss-120b',key:'example-groq'},
  groqKey:'example-groq',geminiKey:'example-gemini'
 });
 assert.deepEqual(chain.map(x=>x.model),[
  'openai/gpt-oss-120b','openai/gpt-oss-20b','qwen/qwen3.8-27b',
  'gemini-3.5-flash-lite','gemini-3.8-flash'
 ]);
 assert.equal(chain.length,5);
 assert.ok(chain.slice(0,3).every(x=>x.key==='example-groq'));
 assert.ok(chain.slice(3).every(x=>x.key==='example-gemini'));
});
test('when one model fails, next model succeeds without parallel calls',async()=>{
 const chain=createModelChain({primary:{provider:'groq',model:'openai/gpt-oss-120b',key:'g'},groqKey:'g',geminiKey:'e'});
 const attempts=[],failures=[];
 const reply=await runModelChain(chain,new AbortController().signal,async candidate=>{
  attempts.push(candidate.model);
  if(attempts.length===1)throw new Error('ai_model_unavailable');
  return {reply:'Hello!'};
 },failure=>failures.push(failure));
 assert.equal(reply.model,'openai/gpt-oss-20b');
 assert.equal(reply.provider,'groq');
 assert.deepEqual(attempts,['openai/gpt-oss-120b','openai/gpt-oss-20b']);
 assert.deepEqual(failures.map(x=>x.error),['ai_model_unavailable']);
});
test('after three Groq failures, Gemini is attempted and used',async()=>{
 const chain=createModelChain({primary:{provider:'groq',model:'openai/gpt-oss-120b',key:'g'},groqKey:'g',geminiKey:'e'});
 const calls=[];
 const result=await runModelChain(chain,new AbortController().signal,async c=>{
  calls.push(c.model);
  if(c.provider==='groq')throw new Error('provider_rate_limit');
  return {reply:'A quiet story'};
 });
 assert.equal(result.provider,'gemini');
 assert.equal(result.model,'gemini-3.5-flash-lite');
 assert.equal(calls.length,4);
});
test('Gemini second model runs if the first Gemini model fails',async()=>{
 const chain=createModelChain({primary:{provider:'groq',model:'openai/gpt-oss-120b',key:'g'},groqKey:'g',geminiKey:'e'});
 const tried=[];
 const result=await runModelChain(chain,new AbortController().signal,async c=>{
  tried.push(c.model);
  if(tried.length<5)throw new Error('ai_unavailable');
  return {reply:'Recovered on fifth model'};
 });
 assert.equal(result.model,'gemini-3.8-flash');
 assert.equal(tried.length,5);
});
test('an invalid API key skips other models using that same key and tries a different provider',async()=>{
 const chain=createModelChain({primary:{provider:'groq',model:'openai/gpt-oss-120b',key:'g'},groqKey:'g',geminiKey:'e'});
 const tried=[];
 const result=await runModelChain(chain,new AbortController().signal,async c=>{
  tried.push(c.provider+':'+c.model);
  if(c.provider==='groq')throw new Error('ai_auth');
  return 'okay';
 });
 assert.deepEqual(tried,['groq:openai/gpt-oss-120b','gemini:gemini-3.5-flash-lite']);
 assert.equal(result.provider,'gemini');
});
test('policy/safety errors do not trigger fallback',async()=>{
 const chain=createModelChain({primary:{provider:'groq',model:'openai/gpt-oss-120b',key:'g'},groqKey:'g',geminiKey:'e'});
 let calls=0;
 await assert.rejects(runModelChain(chain,new AbortController().signal,async()=>{
  calls++;throw new Error('unsafe_output');
 }),/unsafe_output/);
 assert.equal(calls,1);
});
test('aborted conversation does not try another model',async()=>{
 const controller=new AbortController();
 const chain=createModelChain({primary:{provider:'groq',model:'openai/gpt-oss-120b',key:'g'},groqKey:'g',geminiKey:'e'});
 let calls=0;
 await assert.rejects(runModelChain(chain,controller.signal,async()=>{
  calls++;controller.abort();throw new Error('ai_unavailable');
 }),/call_cancelled/);
 assert.equal(calls,1);
});
test('a timeout on one model falls back to the next',async()=>{
 const chain=createModelChain({primary:{provider:'groq',model:'openai/gpt-oss-120b',key:'g'},groqKey:'g'});
 let calls=0;
 const result=await runModelChain(chain,new AbortController().signal,async(_candidate,signal)=>{
  calls++;
  if(calls===1)await new Promise((_,reject)=>{
   signal.addEventListener('abort',()=>reject(new Error('call_cancelled')),{once:true});
  });
  return 'recovered';
 },undefined,110);
 assert.equal(result.model,'openai/gpt-oss-20b');
 assert.equal(calls,2);
});
test('a failed chain does not invent a reply',async()=>{
 const chain=createModelChain({primary:{provider:'groq',model:'openai/gpt-oss-120b',key:'g'},groqKey:'g'});
 let count=0;
 await assert.rejects(runModelChain(chain,new AbortController().signal,async()=>{
  count++;throw new Error('ai_unavailable');
 }),/ai_unavailable/);
 assert.equal(count,3);
});
