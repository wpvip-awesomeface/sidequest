import {createHash} from './rand.js';
export function ensureCalendar(s){s.calendar??={enabled:false,selected:[],events:[],lastSync:null,error:'',revision:0};s.calendar.autoQuests??=true;s.calendar.provider??='mac';}
const text=(v,n)=>String(v??'').trim().slice(0,n);
function addEventQuest(s,e,makeQuest,automatic=false){
 const q=makeQuest(text(e.title,180),{source:'calendar',calendarEventId:e.id,calendarAuto:automatic,calendarName:e.calendarName,calendarStart:e.start,description:`From ${e.calendarName}. ${e.allDay?'All-day event':new Date(e.start).toLocaleString()}. Calendar events are never changed by Sidequest.`,minutes:e.allDay?25:Math.max(5,Math.min(120,Math.round((e.end-e.start)/60000)||25))});
 s.tasks.push(q);return q;
}
export function createMeetingQuests(s,makeQuest,now=new Date()){
 ensureCalendar(s);const c=s.calendar;if(!c.enabled||!c.autoQuests)return;
 const start=new Date(now);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);
 for(const e of c.events){
  if(e.allDay||e.start>=+end||e.end<=+start||s.tasks.some(t=>t.calendarEventId===e.id))continue;
  addEventQuest(s,e,makeQuest,true);
 }
}
export function calendarAction(s,a,makeQuest,now=new Date()){
 if(!a.type?.startsWith('calendar-'))return false;ensureCalendar(s);const c=s.calendar;
 if(a.type==='calendar-quest'){
  const e=c.events.find(e=>e.id===a.id);if(!e)throw Error('That event is no longer on your schedule. Refresh your calendar.');
  if(s.tasks.some(t=>t.calendarEventId===e.id))throw Error('This event already has a quest.');
  addEventQuest(s,{...e,title:text(a.title||e.title,180)},makeQuest);return true;
 }
 if(a.expectedCalendarRevision!==c.revision)throw Error('Your calendar selection changed in another tab. Reopen calendars to continue.');
 if(a.type==='calendar-auto'){c.autoQuests=a.enabled===true;c.revision++;createMeetingQuests(s,makeQuest,now);return true;}
 if(a.type==='calendar-select'){
  if(!Array.isArray(a.calendars)||a.calendars.length>50)throw Error('Choose up to 50 calendars.');
  const selected=a.calendars.map(x=>({id:text(x.id,500),name:text(x.name,160),account:text(x.account,160)}));if(selected.some(x=>!x.id)||new Set(selected.map(x=>x.id)).size!==selected.length)throw Error('Invalid calendar selection.');
  c.provider=a.provider==='google'?'google':'mac';c.selected=selected;c.enabled=selected.length>0;c.events=c.events.filter(e=>selected.some(x=>x.id===e.calendarId));c.lastSync=null;c.error='';c.revision++;return true;
 }
 if(a.type==='calendar-disconnect'){c.enabled=false;c.selected=[];c.events=[];c.lastSync=null;c.error='';c.revision++;return true;}
 if(a.type==='calendar-error'){c.error=text(a.error||'Calendar refresh failed. Try again from the desktop app.',240);return true;}
 if(a.type==='calendar-sync'){
  if(!c.enabled)throw Error('Choose calendars first.');if(!Array.isArray(a.events)||a.events.length>1000)throw Error('Calendar returned too many events. Choose fewer calendars.');
  const start=new Date(now);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+14);
  const result=new Map();for(const raw of a.events){const source=c.selected.find(x=>x.id===raw.calendarId);if(!source)throw Error('An event came from an unselected calendar.');const startTime=Number(raw.start),endTime=Number(raw.end),occurrence=Number(raw.occurrence??raw.start);if(!Number.isFinite(startTime)||!Number.isFinite(endTime)||!Number.isFinite(occurrence)||endTime<startTime||!raw.externalId)throw Error('Invalid calendar event.');if(endTime<=+start||startTime>=+end||raw.cancelled||raw.declined)continue;const id=createHash('sha256').update(JSON.stringify([source.id,text(raw.externalId,1000),occurrence])).digest('hex').slice(0,32);result.set(id,{id,calendarId:source.id,calendarName:source.name,title:text(raw.title||'Untitled event',300),start:startTime,end:endTime,allDay:raw.allDay===true,"location":text(raw["location"],300)});}
  c.events=[...result.values()].sort((a,b)=>a.start-b.start||a.title.localeCompare(b.title));c.lastSync=+now;c.error='';createMeetingQuests(s,makeQuest,now);return true;
 }
 throw Error('Unknown calendar action.');
}
