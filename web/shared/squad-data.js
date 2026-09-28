export const petSpecies=['fox','cat','bird','frog'];
export const supportStyles={warm:'Warm encouragement',quiet:'Quiet company',playful:'Playful sidekick',direct:'One clear next step'};
export const tricks=[{level:1,name:'Sit with you',action:'sit'},{level:2,name:'Happy spin',action:'spin'},{level:4,name:'Little leap',action:'leap'},{level:7,name:'Starlight shower',action:'stars'}];
export const upgrades=[
 {id:'cushions',name:'Reading nook',cost:40,description:'Soft cushions for small victories.',color:'#bb9ba9'},
 {id:'lanterns',name:'Firefly lanterns',cost:80,description:'A warm welcome after every journey.',color:'#e9cf81'},
 {id:'garden',name:'Window garden',cost:120,description:'A little green, always thriving. No watering chores.',color:'#a6bf83'},
 {id:'pet-beds',name:'Companion corner',cost:160,description:'A cozy sleeping spot for the whole menagerie.',color:'#9eaed0'},
 {id:'library',name:'Story library',cost:220,description:'Shelves for the chapters you have lived.',color:'#bf9c78'},
 {id:'observatory',name:'Stargazing loft',cost:350,description:'A place to imagine where you will go next.',color:'#a9a0d8'},
 {id:'gallery',name:'Hall of small victories',cost:500,description:'A golden frame for your chapter keepsakes.',color:'#ddbd72'}
];
export function memberLevel(xp=0){let level=1,remaining=xp,needed=120;while(remaining>=needed){remaining-=needed;needed=120+(++level-1)*40;}return {level,remaining,needed};}
export const activePet=s=>s.squad?.pets.find(p=>p.id===s.squad.activePet);
