import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {connectionStore} from '../credentials.mjs';

test('Linear credentials survive a new store, stay out of disk metadata, and disconnect forgets them',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'sidequest-keys-'));const entries=new Map();
 const vault=async(op,id,value)=>{if(op==='set')entries.set(id,value);if(op==='delete')entries.delete(id);return entries.get(id)||'';};
 try{
  const first=connectionStore(dir,vault);assert.equal(await first.load(),'');
  await first.save('test-secret');
  assert.equal(readFileSync(join(dir,'connections.json'),'utf8').includes('test-secret'),false);
  const restarted=connectionStore(dir,vault);assert.equal(await restarted.load(),'test-secret');
  await restarted.forget();assert.equal(entries.size,0);assert.equal(await connectionStore(dir,vault).load(),'');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('failed secure storage never claims persistence and failed deletion retains recovery marker',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'sidequest-keys-'));let fail=true;
 const vault=async()=>{if(fail)throw Error('locked');return 'test-secret';};
 try{
  const store=connectionStore(dir,vault);await assert.rejects(store.save('test-secret'),/locked/);
  assert.equal(await store.load(),'');fail=false;await store.save('test-secret');fail=true;
  await assert.rejects(store.forget(),/locked/);fail=false;assert.equal(await store.load(),'test-secret');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('separate save directories use different credential accounts',async()=>{
 const dirs=[mkdtempSync(join(tmpdir(),'sidequest-keys-')),mkdtempSync(join(tmpdir(),'sidequest-keys-'))];const accounts=[];
 try{for(const dir of dirs)await connectionStore(dir,async(op,id)=>accounts.push(id)).save('test');assert.notEqual(accounts[0],accounts[1]);}
 finally{for(const dir of dirs)rmSync(dir,{recursive:true,force:true});}
});
