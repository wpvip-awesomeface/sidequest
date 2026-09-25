import test from 'node:test';
import assert from 'node:assert/strict';
import {googleCalendar,parseGoogleClient,googleEvent} from '../google-calendar.mjs';
const client={installed:{client_id:'test.apps.googleusercontent.com',client_secret:'test-secret'}};
function fixture(){let data='',clock=100000;const requests=[];const store={async load(){return data;},async save(value){data=value;},async forget(){data='';}};const fetcher=async(url,options)=>{requests.push({url:String(url),options});return {ok:true,json:async()=>({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600})};};return {store,fetcher,requests,now:()=>clock,advance:()=>clock+=700000};}
async function connect(g){await g.configure(client);const {url}=await g.start('http://127.0.0.1:12345/oauth/google/callback');const params=new URLSearchParams({state:new URL(url).searchParams.get('state'),code:'test-code'});await g.callback(params);return params;}
test('Google requires a Desktop client and ignores untrusted endpoint URLs',()=>{
 assert.throws(()=>parseGoogleClient({web:client.installed}),/Desktop/);assert.throws(()=>parseGoogleClient('bad'),/JSON/);
 assert.deepEqual(parseGoogleClient({installed:{...client.installed,token_uri:'https://evil.invalid'}}),client.installed);
});
test('Google OAuth uses PKCE, rejects incorrect state and replay, and restores from secure storage',async()=>{
 const f=fixture(),g=googleCalendar(f);await g.configure(client);
 const {url}=await g.start('http://127.0.0.1:12345/oauth/google/callback');const u=new URL(url);
 assert.equal(u.origin,'https://accounts.google.com');assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.equal(u.searchParams.get('access_type'),'offline');assert.ok(!url.includes('test-secret'));
 await assert.rejects(g.callback(new URLSearchParams({state:'wrong',code:'x'})),/expired/);assert.equal(f.requests.length,0);
 const params=new URLSearchParams({state:u.searchParams.get('state'),code:'test-code'});await g.callback(params);
 assert.ok(f.requests[0].options.body.get('code_verifier'));await assert.rejects(g.callback(params),/expired/);
 const reopened=googleCalendar(f);await reopened.ready;assert.equal(reopened.status().connected,true);assert.ok(!JSON.stringify(reopened.status()).includes('test-refresh'));
 await reopened.disconnect();const after=googleCalendar(f);await after.ready;assert.equal(after.status().connected,false);assert.equal(after.status().configured,true);
});
test('expired and denied Google authorization never persists a connection',async()=>{
 const f=fixture(),g=googleCalendar(f);await g.configure(client);let {url}=await g.start('http://127.0.0.1:12345/oauth/google/callback');f.advance();await assert.rejects(g.callback(new URLSearchParams({state:new URL(url).searchParams.get('state'),code:'x'})),/expired/);
 ({url}=await g.start('http://127.0.0.1:12345/oauth/google/callback'));await assert.rejects(g.callback(new URLSearchParams({state:new URL(url).searchParams.get('state'),error:'access_denied'})),/not granted/);assert.equal(g.status().connected,false);
});
test('Google event projection excludes declined/cancelled events and private notes',()=>{
 const event={id:'occurrence',recurringEventId:'series',start:{dateTime:'2026-09-24T10:00:00-04:00'},end:{dateTime:'2026-09-24T11:00:00-04:00'},originalStartTime:{dateTime:'2026-09-24T09:00:00-04:00'},summary:'Planning',description:'private',attendees:[{email:'private'}]};
 const result=googleEvent('google:work',event);assert.equal(result.externalId,'series');assert.notEqual(result.start,result.occurrence);assert.equal(result.description,undefined);assert.equal(result.attendees,undefined);
 assert.equal(googleEvent('google:work',{...event,status:'cancelled'}),null);assert.equal(googleEvent('google:work',{...event,attendees:[{self:true,responseStatus:'declined'}]}),null);
 const allDay=googleEvent('google:work',{id:'all',start:{date:'2026-09-24'},end:{date:'2026-09-25'}});assert.equal(allDay.allDay,true);assert.equal(allDay.start,+new Date(2026,8,24));
});
test('Google calendar reads page through results and carry read-only bearer authorization',async()=>{
 const f=fixture();let pages=0;const base=f.fetcher;f.fetcher=async(url,options)=>{
  if(String(url).includes('/token'))return base(url,options);
  assert.equal(options.headers.Authorization,'Bearer test-access');assert.equal(options.method,undefined);
  assert.equal(new URL(url).origin,'https://www.googleapis.com');pages++;
  return {ok:true,json:async()=>pages===1?{items:[{id:'a',summary:'Work'}],nextPageToken:'next'}:{items:[{id:'b',summary:'Home'}]}};
 };const g=googleCalendar(f);await connect(g);const calendars=await g.calendars();assert.equal(pages,2);assert.deepEqual(calendars.map(c=>c.id),['google:a','google:b']);
});
test('secure storage failure does not claim Google is connected',async()=>{
 const f=fixture(),g=googleCalendar(f);await g.configure(client);f.store.save=async()=>{throw Error('Keychain locked');};const {url}=await g.start('http://127.0.0.1:12345/oauth/google/callback');
 await assert.rejects(g.callback(new URLSearchParams({state:new URL(url).searchParams.get('state'),code:'test'})),/locked/);assert.equal(g.status().connected,false);
});
