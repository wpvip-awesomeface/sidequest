import test from 'node:test';import assert from 'node:assert/strict';
import {initialState,migrateState,action} from '../engine.mjs';
import {dayEvents,agendaPage} from '../public/calendar-ui.js';
const now=new Date(2026,8,24,12),fresh=()=>migrateState(initialState());
const send=(s,type,data={})=>action(s,{type,expectedCalendarRevision:s.calendar.revision,...data},now);
const select=s=>send(s,'calendar-select',{calendars:[{id:'google-work',name:'Work',account:'Google'}]});
const event=(extra={})=>({calendarId:'google-work',externalId:'series-1',title:'Planning',start:+new Date(2026,8,24,13),end:+new Date(2026,8,24,14),...extra});
test('migration adds an opt-in calendar without changing quests or XP',()=>{const s=initialState(),tasks=structuredClone(s.tasks);migrateState(s);assert.equal(s.calendar.enabled,false);assert.deepEqual(s.tasks,tasks);assert.equal(s.xp,0);});
test('calendar snapshots deduplicate, replace moved or cancelled occurrences and exclude unselected data',()=>{const s=fresh();select(s);send(s,'calendar-sync',{events:[event(),event(),event({externalId:'cancelled',cancelled:true}),event({externalId:'declined',declined:true})]});assert.equal(s.calendar.events.length,1);const id=s.calendar.events[0].id;send(s,'calendar-sync',{events:[event({start:+new Date(2026,8,24,15),end:+new Date(2026,8,24,16),occurrence:event().start,title:'Moved planning'})]});assert.equal(s.calendar.events[0].id,id);assert.equal(s.calendar.events[0].title,'Moved planning');assert.throws(()=>send(s,'calendar-sync',{events:[event({calendarId:'private'})]}));send(s,'calendar-sync',{events:[]});assert.equal(s.calendar.events.length,0);});
test('each recurring occurrence can become one quest; importing or linking grants no rewards',()=>{const s=fresh();select(s);send(s,'calendar-sync',{events:[event(),event({start:event().start+86400000,end:event().end+86400000})]});const original=s.tasks.length;assert.equal(s.tasks.at(-1).calendarEventId,s.calendar.events[0].id);assert.equal(s.tasks.length,original);assert.equal(s.tasks.at(-1).source,'calendar');assert.throws(()=>send(s,'calendar-quest',{id:s.calendar.events[0].id}));send(s,'calendar-quest',{id:s.calendar.events[1].id});assert.equal(s.tasks.length,original+1);assert.equal(s.xp,0);assert.equal(s.gold,0);});
test('selection changes reject stale syncs and disconnect clears imported data but preserves deliberate quests',()=>{const s=fresh();select(s);const revision=s.calendar.revision;send(s,'calendar-sync',{events:[event()]});send(s,'calendar-disconnect');assert.equal(s.calendar.events.length,0);assert.equal(s.calendar.selected.length,0);assert.equal(s.calendar.enabled,false);assert.equal(s.tasks.at(-1).source,'calendar');assert.throws(()=>action(s,{type:'calendar-sync',expectedCalendarRevision:revision,events:[event()]},now));});
test('sync keeps two weeks only, omits notes and attendees, and preserves cached events on error',()=>{const s=fresh();select(s);send(s,'calendar-sync',{events:[event({notes:'secret notes',attendees:['someone']}),event({start:0,end:1}),event({start:event().start+15*86400000,end:event().end+15*86400000})]});assert.equal(s.calendar.events.length,1);assert.equal(s.calendar.events[0].notes,undefined);assert.equal(s.calendar.events[0].attendees,undefined);send(s,'calendar-error',{error:'Calendar access was revoked.'});assert.equal(s.calendar.events.length,1);assert.match(s.calendar.error,/revoked/);});
test('all-day and overnight events use overlap with local day, end boundaries are exclusive',()=>{const s=fresh();select(s);send(s,'calendar-sync',{events:[event({externalId:'all',start:+new Date(2026,8,24),end:+new Date(2026,8,25),allDay:true}),event({externalId:'overnight',start:+new Date(2026,8,23,23),end:+new Date(2026,8,24,1)})]});assert.equal(dayEvents(s,now).length,2);assert.equal(dayEvents(s,new Date(2026,8,25)).length,0);});
test('calendar selection validates identifiers and agenda escapes imported HTML',()=>{const s=fresh();assert.throws(()=>send(s,'calendar-select',{calendars:[{id:'same'},{id:'same'}]}));select(s);send(s,'calendar-sync',{events:[event({title:'<script>alert(1)</script>'})]});assert.ok(!agendaPage(s).includes('<script>'));});

test('automatic quests include today’s timed events only, without duplicate quests or free rewards',()=>{
 const s=fresh();select(s);const original=s.tasks.length;
 const events=[event(),event({externalId:'all-day',allDay:true}),event({externalId:'tomorrow',start:event().start+86400000,end:event().end+86400000}),event({externalId:'cancelled',cancelled:true})];
 send(s,'calendar-sync',{events});send(s,'calendar-sync',{events});
 assert.equal(s.tasks.length,original+1);assert.equal(s.tasks.at(-1).minutes,60);assert.equal(s.xp,0);assert.equal(s.gold,0);
 s.tasks.at(-1).status='done';send(s,'calendar-sync',{events});assert.equal(s.tasks.length,original+1);assert.equal(s.tasks.at(-1).status,'done');
});
test('automatic meeting quests can be disabled and reenabled; next day imports its cached meetings once',()=>{
 const s=fresh();select(s);send(s,'calendar-auto',{enabled:false});const original=s.tasks.length;
 send(s,'calendar-sync',{events:[event(),event({start:event().start+86400000,end:event().end+86400000})]});assert.equal(s.tasks.length,original);
 send(s,'calendar-auto',{enabled:true});assert.equal(s.tasks.length,original+1);
 const tomorrow=new Date(2026,8,25,12);action(s,{type:'calendar-error',expectedCalendarRevision:s.calendar.revision,error:'offline'},tomorrow);
 assert.equal(s.tasks.length,original+2);assert.notEqual(s.tasks.at(-1).calendarEventId,s.tasks.at(-2).calendarEventId);
});
