import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join,resolve} from 'node:path';

export function keychainVault(root) {
 const packaged=join(root,'../runtime/connection-keys');
 const helper=existsSync(packaged)?packaged:join(root,'dist/Sidequest.app/Contents/Resources/runtime/connection-keys');
 return (operation,account,value)=>new Promise((resolve,reject)=>{
  if(process.platform!=='darwin'||!existsSync(helper))return reject(Error('Secure storage is unavailable. Use the updated Mac app to remember this key.'));
  const child=execFile(helper,[],{timeout:30000,maxBuffer:65536},(error,stdout)=>{
   if(error)return reject(Error('macOS Keychain could not save or unlock the connection. Allow access when prompted, then connect again.'));
   try{resolve(JSON.parse(stdout).value??'');}catch{reject(Error('Unable to read the saved connection.'));}
  });
  child.stdin.on('error',()=>{});
  child.stdin.end(JSON.stringify({operation,account,...(value===undefined?{}:{value})}));
 });
}
export function connectionStore(dataDir,vault,service='linear') {
 if(!['linear','google'].includes(service))throw Error('Unknown connection service.');
 const marker=join(dataDir,service==='linear'?'connections.json':'google-connection.json');
 const account=service+':'+createHash('sha256').update(resolve(dataDir)).digest('hex');
 const marked=()=>{try{return JSON.parse(readFileSync(marker,'utf8')).linearStored===true;}catch{return false;}};
 const mark=value=>{writeFileSync(marker+'.tmp',JSON.stringify({linearStored:value}),{mode:0o600});renameSync(marker+'.tmp',marker);};
 return {
  async load(){return marked()?await vault('get',account):'';},
  async save(value){await vault('set',account,value);mark(true);},
  async forget(){if(marked())await vault('delete',account);mark(false);}
 };
}
