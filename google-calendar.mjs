import {randomBytes,createHash} from 'node:crypto';
const scopes=['https://www.googleapis.com/auth/calendar.calendarlist.readonly','https://www.googleapis.com/auth/calendar.events.readonly'];
export function parseGoogleClient(input){
 let value;try{value=typeof input==='string'?JSON.parse(input):input;}catch{throw Error('Choose the OAuth client JSON downloaded from Google Cloud.');}
 const c=value?.installed;
 if(!c||typeof c.client_id!=='string'||!c.client_id.endsWith('.apps.googleusercontent.com')||typeof c.client_secret!=='string'||!c.client_secret)throw Error('Use a Google OAuth client of type Desktop app, downloaded as JSON.');
 return {client_id:c.client_id,client_secret:c.client_secret};
}
function eventTime(value){if(value?.dateTime)return Date.parse(value.dateTime);if(value?.date){const [y,m,d]=value.date.split('-').map(Number);return +new Date(y,m-1,d);}return NaN;}
export function googleEvent(calendarId,event){
 if(event.status==='cancelled'||event.attendees?.some(a=>a.self&&a.responseStatus==='declined'))return null;
 const start=eventTime(event.start),end=eventTime(event.end);if(!Number.isFinite(start)||!Number.isFinite(end))return null;
 return {calendarId,externalId:event.recurringEventId||event.id,occurrence:eventTime(event.originalStartTime)||start,title:event.summary||'Untitled meeting',start,end,allDay:!!event.start.date,location:event.location||''};
}
export function googleCalendar({store,fetcher=fetch,now=()=>Date.now()}){
 let saved={},pending=null,warning='';
 const ready=store.load().then(value=>{if(value)saved=JSON.parse(value);}).catch(()=>{warning='Unable to unlock the Google connection in Keychain. Try connecting again.';});
 const persist=async next=>{await store.save(JSON.stringify(next));saved=next;warning='';};
 async function tokenRequest(body){
  const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body),signal:AbortSignal.timeout(15000)});
  const data=await r.json();if(!r.ok||!data.access_token)throw Error(data.error==='invalid_grant'?'Google sign-in expired or was revoked. Connect Google again.':'Google could not complete sign-in. Check the Desktop app client and Calendar API setup.');
  if(data.scope&&!scopes.every(scope=>data.scope.split(' ').includes(scope)))throw Error('Allow both calendar-list and event read access, then connect again.');
  return {access_token:data.access_token,refresh_token:data.refresh_token||(body.grant_type==='refresh_token'?saved.refresh_token:undefined),expires_at:now()+Number(data.expires_in||3600)*1000};
 }
 async function access(){await ready;if(!saved.refresh_token)throw Error('Connect Google Calendar first.');if(!saved.access_token||saved.expires_at<now()+60000)await persist({...saved,...await tokenRequest({...saved.client,refresh_token:saved.refresh_token,grant_type:'refresh_token'})});return saved.access_token;}
 async function list(path,parameters,limit){
  const token=await access(),items=[];let pageToken='';let pages=0;
  do{
   if(++pages>100)throw Error('Too many calendar pages. Choose fewer calendars.');
   const url=new URL('https://www.googleapis.com/calendar/v3/'+path);url.search=new URLSearchParams({...parameters,...(pageToken?{pageToken}:{})});
   const r=await fetcher(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
   if(!r.ok)throw Error(r.status===401?'Google sign-in expired. Connect Google again.':'Google Calendar could not be read. Check Calendar API access and try again.');
   const data=await r.json();items.push(...(data.items||[]));if(items.length>limit)throw Error('Too many events or calendars. Choose fewer calendars.');pageToken=data.nextPageToken||'';
  }while(pageToken);return items;
 }
 return {
  ready,
  status(){return {configured:!!saved.client,connected:!!saved.refresh_token,warning};},
  async configure(input){await ready;const client=parseGoogleClient(input);if(saved.refresh_token)throw Error('Disconnect Google before changing its OAuth client.');await persist({client});pending=null;return this.status();},
  async start(redirect){await ready;if(!saved.client)throw Error('Set up the Google Desktop app OAuth client first.');
   const verifier=randomBytes(32).toString('base64url'),state=randomBytes(32).toString('base64url');pending={verifier,state,redirect,expires:now()+600000};
   const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:saved.client.client_id,redirect_uri:redirect,response_type:'code',scope:scopes.join(' '),state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',access_type:'offline',prompt:'consent'});return {url:url.href};
  },
  async callback(params){await ready;const flow=pending;
   if(!flow||params.get('state')!==flow.state||flow.expires<now())throw Error('This sign-in link expired. Return to Sidequest and connect again.');pending=null;
   if(params.get('error'))throw Error('Google access was not granted. Return to Sidequest to try again.');
   if(!params.get('code'))throw Error('Google did not return a sign-in code.');
   const tokens=await tokenRequest({...saved.client,code:params.get('code'),redirect_uri:flow.redirect,code_verifier:flow.verifier,grant_type:'authorization_code'});
   if(!tokens.refresh_token)throw Error('Google did not provide offline access. Connect again and allow access.');
   await persist({...saved,...tokens});
  },
  async calendars(){return (await list('users/me/calendarList',{maxResults:'250',minAccessRole:'reader',fields:'nextPageToken,items(id,summary,primary)'},500)).map(c=>({id:'google:'+c.id,name:c.summary||c.id,account:c.primary?'Google · primary':'Google'}));},
  async events(selected,date=new Date()){
   const start=new Date(date);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+14);const events=[];
   for(const c of selected){if(!c.id.startsWith('google:'))throw Error('Choose your Google calendars again.');
    const rows=await list('calendars/'+encodeURIComponent(c.id.slice(7))+'/events',{singleEvents:'true',timeMin:start.toISOString(),timeMax:end.toISOString(),maxResults:'1000',maxAttendees:'1',fields:'nextPageToken,items(id,recurringEventId,originalStartTime,summary,start,end,status,location,attendees(self,responseStatus))'},1000);
    for(const row of rows){const event=googleEvent(c.id,row);if(event)events.push(event);}if(events.length>1000)throw Error('More than 1,000 events. Choose fewer calendars.');
   }return events;
  },
  async disconnect(){await ready;const client=saved.client;await store.forget();saved={};pending=null;warning='';if(client)await persist({client});}
 };
}
