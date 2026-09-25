import {googleCalendar} from './google-calendar.mjs';
import {connectionStore,keychainVault} from './credentials.mjs';
import {validateStory} from './lore.mjs';
import {supportPrompt} from './squad.mjs';
import {narrativePrompt,pathsPrompt,applyPaths,cleanNarration} from './campaign.mjs';
import http from 'node:http';
import {assertProfileVersion,needsProfileVersion,onboardingPrompt} from './settings.mjs';
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync,openSync,closeSync,unlinkSync} from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {discoverProvider,providerCatalog,providerConfig,generateLocal,storyPrompt} from './providers.mjs';
import {initialState,migrateState,refreshDay,publicState,action,quest} from './engine.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const buildId=createHash('sha256').update(['google-calendar.mjs','public/google-calendar-ui.js','credentials.mjs','public/boot.js','public/index.html','server.mjs','engine.mjs','settings.mjs','providers.mjs','campaign.mjs','calendar.mjs','public/calendar-ui.js','lore.mjs','public/character-depth.js','public/lore-ui.js','public/atlas.js','squad.mjs','public/squad-data.js','public/squad-ui.js','public/squad-art.js','public/pet-art.js','public/world-data.js','public/scenes.js','public/journey.js','public/art.js','public/character.js','public/app.js','public/linear-link.js','public/setup.js','public/connection.js','public/style.css'].map(p=>readFileSync(join(root,p),'utf8')).join('')).digest('hex').slice(0,12);
const dataDir=process.env.SIDEQUEST_DATA_DIR||join(homedir(),'Library','Application Support','Sidequest');
mkdirSync(dataDir,{recursive:true,mode:0o700});
const lockPath=join(dataDir,'server.lock');
const discoveryPath=join(dataDir,'server.json');
try {const fd=openSync(lockPath,'wx',0o600);writeFileSync(fd,String(process.pid));closeSync(fd);}
catch {let alive=false;try{process.kill(Number(readFileSync(lockPath,'utf8')),0);alive=true;}catch{}if(alive){console.error('Sidequest is already running with this save. Close the other app or preview first.');process.exit(1);}writeFileSync(lockPath,String(process.pid),{mode:0o600});}
process.on('exit',()=>{try{if(readFileSync(lockPath,'utf8')===String(process.pid)){unlinkSync(lockPath);if(existsSync(discoveryPath))unlinkSync(discoveryPath);}}catch{}});
process.on('SIGTERM',()=>process.exit(0));process.on('SIGINT',()=>process.exit(0));
const statePath=join(dataDir,'save.json');
let state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):initialState();
state=migrateState(state);for(const b of state.world.beats)if(b.status==='writing'||(b.kind==='conclusion'&&b.chapter===state.world.chapter&&state.world.pathsStatus==='pending'))b.status='pending';
const providerKeys=new Map();
const providerKey=(id,port)=>providerKeys.get(`${id}:${port}`)||'';
let linearKey=process.env.LINEAR_API_KEY||'';
let linearRemembered=false,linearStorageWarning='';
const google=googleCalendar({store:connectionStore(dataDir,keychainVault(root),'google')});
const connections=connectionStore(dataDir,keychainVault(root));
const linearReady=connections.load().then(key=>{if(key&&!linearKey){linearKey=key;linearRemembered=true;}}).catch(error=>{linearStorageWarning=error.message;});
let lastSaved='';
const token=randomUUID();let modelStatus='Offline stories';let queue=Promise.resolve();
function save(){if(JSON.stringify(state)===lastSaved&&existsSync(statePath))return;state.revision=(state.revision||0)+1;writeFileSync(statePath+'.tmp',JSON.stringify(state,null,2),{mode:0o600});renameSync(statePath+'.tmp',statePath);lastSaved=JSON.stringify(state);}
function view(){return {...publicState(state),serverBuild:buildId,linearConnected:!!linearKey,linearRemembered,linearStorageWarning,googleCalendar:google.status(),modelStatus};}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req){let chunks='',size=0;for await(const chunk of req){size+=chunk.length;if(size>(req.url==='/api/action'?2097152:65536))throw Error('Request too large.');chunks+=chunk;}return JSON.parse(chunks||'{}');}
async function linearQuery(query,variables={}){const r=await fetch('https://api.linear.app/graphql',{method:'POST',headers:{'Content-Type':'application/json',Authorization:linearKey},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(20000)});const data=await r.json();if(!r.ok||data.errors)throw Error(data.errors?.[0]?.message||`Linear returned ${r.status}.`);return data.data;}
async function syncLinear(){if(!linearKey)throw Error('Add a Linear personal API key first.');let after=null;const all=[];do{const data=await linearQuery(`query Assigned($after: String) { viewer { assignedIssues(first: 100, after: $after, filter: {state: {type: {nin: ["completed", "canceled"]}}}) {nodes {id identifier title description priority sortOrder url state {name type}} pageInfo {hasNextPage endCursor}}}}`,{after});const conn=data.viewer.assignedIssues;all.push(...conn.nodes);after=conn.pageInfo.hasNextPage?conn.pageInfo.endCursor:null;if(all.length>5000)throw Error('Too many assigned issues to import in one sync.');}while(after);let added=0;for(const issue of all){const old=state.tasks.find(t=>t.linearId===issue.id);if(old){old.title=issue.title;old.url=issue.url;old.identifier=issue.identifier;old.description=issue.description||'';old.sortOrder=issue.sortOrder;old.linearState=issue.state.name;if(!old.priorityOverride)old.priority=issue.priority||4;}else {state.tasks.push(quest(issue.title,{description:issue.description||'',priority:issue.priority||4,sortOrder:issue.sortOrder,source:'linear',linearId:issue.id,identifier:issue.identifier,url:issue.url,linearState:issue.state.name}));added++;}}state.lastSync=Date.now();save();return {added,total:all.length};}
let storyQueue=Promise.resolve();
const scheduled=new Set();
function scheduleStories(){
 scheduleSupport();
 if(!state.settings.useModel||!state.settings.model){for(const b of state.world.beats)if(b.status==='pending')b.status='ready';return;}
 const pending=state.world.beats.filter(b=>b.status==='pending'&&!scheduled.has(b.id)).reverse();
 for(const b of pending){if(scheduled.size>=6&&b.kind!=='conclusion'){b.status='ready';continue;}scheduled.add(b.id);const snapshot=structuredClone(state),context=narrativePrompt(snapshot,b),settings={...state.settings};
 storyQueue=storyQueue.then(async()=>{const live=state.world.beats.find(x=>x.id===b.id);if(!live)return;if(state.profileRevision!==snapshot.profileRevision){live.status='ready';save();return;}live.status='writing';save();
 try{const text=validateStory(snapshot,b,cleanNarration(await generateLocal(settings,context,providerKey(settings.provider,settings.providerPort))));const target=state.world.beats.find(x=>x.id===b.id);if(target&&state.profileRevision!==snapshot.profileRevision){target.status='ready';save();return;}if(target){target.text=text.split(/\s+/).slice(0,65).join(' ');target.source='local model';target.status='ready';if(state.world.lastEvent===b.id)state.story=target.text;}modelStatus='Local storyteller connected';}
 catch{const target=state.world.beats.find(x=>x.id===b.id);if(target)target.status='fallback';modelStatus='Using built-in adventure';}
 save();
 if(b.kind==='conclusion'&&state.world.chapter===snapshot.world.chapter&&state.world.mission.status==='complete'){
 try{const response=await generateLocal(settings,pathsPrompt(structuredClone(state)),providerKey(settings.provider,settings.providerPort),fetch,{maxTokens:420,maxChars:2400,json:true});if(state.world.chapter===snapshot.world.chapter&&!applyPaths(state,snapshot.world.chapter,response))state.world.pathsStatus='built-in paths';}
 catch{if(state.world.chapter===snapshot.world.chapter)state.world.pathsStatus='built-in paths';}save();}
 }).catch(()=>{const target=state.world.beats.find(x=>x.id===b.id);if(target)target.status='fallback';save();}).finally(()=>scheduled.delete(b.id));
 }
}
const supportJobs=new Set();
function scheduleSupport(){const msg=state.squad?.support.message;if(!msg?.pending||supportJobs.has(msg.id)||supportJobs.size)return;supportJobs.add(msg.id);const snapshot=structuredClone(state);(async()=>{try{const text=cleanNarration(await generateLocal(snapshot.settings,supportPrompt(snapshot),providerKey(snapshot.settings.provider,snapshot.settings.providerPort)));if(state.squad.support.message?.id===msg.id&&state.profileRevision===snapshot.profileRevision){state.squad.support.message.text=text;state.squad.support.message.source='local model';}}catch{}finally{if(state.squad.support.message?.id===msg.id)state.squad.support.message.pending=false;supportJobs.delete(msg.id);save();}})();}
async function story(){scheduleStories();}
async function providers(body){
 const ports=body.ports||{};
 if(body.provider&&body.key!==undefined){const p=providerConfig(body.provider,ports[body.provider]);providerKeys.set(`${p.id}:${p.port}`,String(body.key).trim());}
 const detected=await Promise.all(providerCatalog.map(async p=>{
 const c=providerConfig(p.id,ports[p.id]);
 const result=await discoverProvider(c.id,c.port,providerKey(c.id,c.port));
 const app=p.id==='lmstudio'?'LM Studio':p.id==='ollama'?'Ollama':null;
 return {...result,installed:app?existsSync(`/Applications/${app}.app`)||existsSync(join(homedir(),'Applications',`${app}.app`)):false};
 }));return {providers:detected};
}
const server=http.createServer(async(req,res)=>{const expected=`127.0.0.1:${server.address().port}`;if(req.headers.host!==expected&&req.headers.host!==`localhost:${server.address().port}`){return json(res,403,{error:'Local connections only.'});}const url=new URL(req.url,`http://${expected}`);try{
if(url.pathname==='/oauth/google/callback'&&req.method==='GET'){
 let message='Google Calendar is connected. Return to Sidequest and click “Choose my Google calendars”.';let status=200;
 try{const finish=()=>google.callback(url.searchParams);const completion=queue.then(finish,finish);queue=completion.catch(()=>{});await completion;}catch(error){message=error.message;status=400;}
 const safe=message.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 res.writeHead(status,{'Content-Type':'text/html','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"});res.end(`<html><title>Sidequest · Google Calendar</title><body style="background:#202a25;color:#eee7cc;font:18px system-ui;padding:60px"><h1>Sidequest</h1><p>${safe}</p><p>You can close this tab.</p></body></html>`);return;
}
if(url.pathname==='/api/health' &&req.method==='GET')return json(res,200,{app:'sidequest',pid:process.pid,build:buildId});
if(url.pathname==='/api/state'&&req.method==='GET'){if(req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'Local connections only.'});refreshDay(state);scheduleStories();save();return json(res,200,{...view(),token});}
if(url.pathname.startsWith('/api/')&&req.method==='POST'){if(req.headers['x-sidequest-token']!==token)return json(res,403,{error:'Reload Sidequest to reconnect.'});const b=await body(req);if(url.pathname==='/api/providers')return json(res,200,await providers(b));
if(url.pathname==='/api/model-test'){const settings={...state.settings,...b.settings};const p=providerConfig(settings.provider,settings.providerPort);const text=await generateLocal(settings,onboardingPrompt(state,b.draft),providerKey(p.id,p.port));return json(res,200,{text});}
if(url.pathname==='/api/story'){await story();return json(res,200,view());}const run=async()=>{refreshDay(state);switch(url.pathname){case '/api/google':{
 await google.ready;
 if(b.operation==='status')return json(res,200,google.status());
 if(b.operation==='configure')return json(res,200,await google.configure(b.client));
 if(b.operation==='start')return json(res,200,await google.start(`http://127.0.0.1:${server.address().port}/oauth/google/callback`));
 if(b.operation==='list')return json(res,200,{calendars:await google.calendars()});
 if(b.operation==='disconnect'){await google.disconnect();if(state.calendar.provider==='google'){action(state,{type:'calendar-disconnect',expectedCalendarRevision:state.calendar.revision});save();}return json(res,200,view());}
 if(b.operation==='sync'){
  if(state.calendar.provider!=='google'||!state.calendar.enabled||b.expectedCalendarRevision!==state.calendar.revision)throw Error('Your calendar selection changed. Refresh and try again.');
  const revision=state.calendar.revision,events=await google.events(state.calendar.selected);
  action(state,{type:'calendar-sync',events,expectedCalendarRevision:revision});save();return json(res,200,view());
 }
 throw Error('Unknown Google Calendar operation.');
}case '/api/action':{assertProfileVersion(state,b);const draft=structuredClone(state);action(draft,b);if(needsProfileVersion(b))draft.profileRevision=(state.profileRevision||0)+1;state=draft;scheduleStories();save();return json(res,200,view());}case '/api/story':await story();return json(res,200,view());case '/api/linear':{await linearReady;
if(b.disconnect){await connections.forget();linearKey='';linearRemembered=false;linearStorageWarning='';return json(res,200,view());}
const previousKey=linearKey;const previousRemembered=linearRemembered;
if(b.key!==undefined){linearKey=String(b.key).trim();linearRemembered=false;}
let result;try{result=await syncLinear();}catch(error){linearKey=previousKey;linearRemembered=previousRemembered;throw error;}
if(!linearRemembered){try{await connections.save(linearKey);linearRemembered=true;linearStorageWarning='';}catch(error){linearStorageWarning=error.message;}}
return json(res,200,{...view(),syncResult:result});}case '/api/models':return json(res,200,await providers({}));default:return json(res,404,{error:'Not found.'});}};queue=queue.then(run,run).catch(e=>json(res,e.status||400,{error:e.message}));return;}
const files={'/google-calendar-ui.js':'google-calendar-ui.js','/boot.js':'boot.js','/linear-link.js':'linear-link.js','/calendar-ui.js':'calendar-ui.js','/':'index.html','/app.js':'app.js','/style.css':'style.css','/art.js':'art.js','/character.js':'character.js','/setup.js':'setup.js','/connection.js':'connection.js','/favicon.png':'favicon.png','/world-data.js':'world-data.js','/scenes.js':'scenes.js','/journey.js':'journey.js','/character-depth.js':'character-depth.js','/lore-ui.js':'lore-ui.js','/atlas.js':'atlas.js','/squad-data.js':'squad-data.js','/squad-ui.js':'squad-ui.js','/squad-art.js':'squad-art.js','/pet-art.js':'pet-art.js'};const file=files[url.pathname];if(!file||req.method!=='GET')return json(res,404,{error:'Not found.'});res.writeHead(200,{'Content-Type':file.endsWith('.png')?'image/png':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(readFileSync(join(root,'public',file)));
}catch(e){json(res,e.status||400,{error:e.message});}});
server.listen(Number(process.env.PORT||47831),'127.0.0.1',()=>{writeFileSync(discoveryPath,JSON.stringify({port:server.address().port,pid:process.pid}),{mode:0o600});save();console.log(`Sidequest ready at http://127.0.0.1:${server.address().port}`);});
