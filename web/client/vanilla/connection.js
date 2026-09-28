import {bridgeFetch} from './bridge.js';
export const draftKey='sidequest.setupDraft.v1';
export function readDraft(storage){try{const value=JSON.parse(storage.getItem(draftKey));return value&&value.draft&&typeof value.draft.name==='string'&&value.draft.settings?value:null;}catch{return null;}}
export function storeDraft(storage,value){try{storage.setItem(draftKey,JSON.stringify(value));}catch{}}
export function clearDraft(storage){try{storage.removeItem(draftKey);}catch{}}
// Retry only an explicitly rejected session token. A network error may follow a
// committed mutation, so never automatically replay a write in that case.
export function createClient({fetcher=bridgeFetch,onConnection=()=>{}}={}){
 let token,build,latestBuild;
 function report(value){if(value.serverBuild)latestBuild=value.serverBuild;if(!build)build=latestBuild;onConnection(latestBuild&&build!==latestBuild?'update':'ready');}
 async function refresh(){const response=await fetcher('/api/state',{signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('The local campfire is not ready yet.');const next=await response.json();token=next.token;report(next);return next;}
 async function request(path,data){try{if(!token)await refresh();for(let attempt=0;attempt<2;attempt++){const response=await fetcher('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Sidequest-Token':token},body:JSON.stringify(data),signal:AbortSignal.timeout(65000)});if(response.status===403&&attempt===0){await refresh();continue;}const value=await response.json();if(!response.ok){const error=Error(value.error||'Something went wrong.');error.status=response.status;throw error;}report(value);return value;}}catch(error){if(!error.status){onConnection('offline');error.message='Connection interrupted. Your last save is safe. Reconnect below, then check the result before trying again.';}throw error;}}
 return {refresh,request};
}
export function prepareReload(){window.dispatchEvent(new Event('sidequest:before-reload'));try{return sessionStorage.getItem(draftKey);}catch{return null;}}
export function reloadApp(){prepareReload();location.reload();}
