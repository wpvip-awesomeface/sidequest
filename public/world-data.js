export const biomes=[
 {id:'forest',name:'Mosswood',symbol:'♧',color:'#a8c886',sky:'#739a8e',ground:'#597b45',foes:['bramble','imp','moth'],hint:'The trees have started returning letters nobody sent.'},
 {id:'coast',name:'Tideglass Coast',symbol:'≈',color:'#9acfd5',sky:'#6bafb4',ground:'#bfad77',foes:['crab','pirate','moth'],hint:'A lighthouse flashes a message beneath the water.'},
 {id:'ruins',name:'Clockwork Ruins',symbol:'♜',color:'#c3b498',sky:'#958d9e',ground:'#716e65',foes:['golem','knight','imp'],hint:'The stopped clock has just struck thirteen.'},
 {id:'cavern',name:'Lantern Hollows',symbol:'◆',color:'#b8a0dc',sky:'#292c4b',ground:'#49425d',foes:['bat','slime','golem'],hint:'Someone is trading shadows for directions.'},
 {id:'marsh',name:'Whisperfen',symbol:'≋',color:'#9ebd9d',sky:'#556e79',ground:'#3f665b',foes:['slime','witch','bramble'],hint:'The ferryman recognizes a passenger you have never met.'},
 {id:'snow',name:'Frostbell Pass',symbol:'❄',color:'#c7e3e7',sky:'#8cacbc',ground:'#b3c9cc',foes:['wolf','knight','bat'],hint:'There are warm footprints in the freshly fallen snow.'},
 {id:'desert',name:'Amber Expanse',symbol:'☼',color:'#e4bd82',sky:'#c2927c',ground:'#c8a063',foes:['scarab','pirate','golem'],hint:'A buried doorway has appeared in yesterday’s map.'},
 {id:'sky',name:'Starfall Isles',symbol:'✧',color:'#c1b6e2',sky:'#63668f',ground:'#7b8194',foes:['moth','witch','knight'],hint:'A drifting island is following you home.'}
];
export const foes={
 bramble:{name:'Bramble Jack',species:'bramble',color:'#93b765',quirk:'collects lost promises'},
 imp:{name:'Pip the Pilferer',species:'imp',color:'#ce9c69',quirk:'steals things to give them back dramatically'},
 moth:{name:'The Lantern Moth',species:'moth',color:'#d4bbdf',quirk:'can read the writing on dreams'},
 crab:{name:'Captain Clack',species:'crab',color:'#df937a',quirk:'insists every bridge is a toll bridge'},
 pirate:{name:'Mara of the Map',species:'pirate',color:'#b5a4cf',quirk:'has half a map and a whole grudge'},
 golem:{name:'The Unfinished Sentinel',species:'golem',color:'#aaa899',quirk:'is waiting for one last instruction'},
 knight:{name:'Sir Almost',species:'knight',color:'#b7cbcc',quirk:'never quite finishes a challenge'},
 bat:{name:'Echo the Eavesdropper',species:'bat',color:'#ae9ecc',quirk:'remembers every overheard secret'},
 slime:{name:'The Doubt Puddle',species:'slime',color:'#8ebbb1',quirk:'grows braver when someone listens'},
 witch:{name:'Auntie Perhaps',species:'witch',color:'#b698ca',quirk:'offers advice in inconvenient riddles'},
 wolf:{name:'The Frost Courier',species:'wolf',color:'#cfdee2',quirk:'guards a letter it cannot deliver'},
 scarab:{name:'Keeper of Small Things',species:'scarab',color:'#e0ba6e',quirk:'thinks every little object is a treasure'}
};
export const biomeFor=id=>biomes.find(b=>b.id===id)||biomes[0];
export const locationFor=s=>s.world?.locations.find(l=>l.id===s.world.location)||{id:'place-0',name:'Mosswood Clearing',biome:'forest',visits:1};
export const foeFor=s=>{const task=s.tasks.find(t=>t.id===(s.battle?.taskId||s.selected));return {...(foes[task?.foeId]||foes.bramble),name:task?.foe||foes.bramble.name,id:task?.foeId||'bramble'};};
export const lootRules={Uncommon:{wins:8,gap:5,chance:.08},Rare:{wins:25,gap:8,chance:.03},Epic:{wins:60,gap:15,chance:.01}};
