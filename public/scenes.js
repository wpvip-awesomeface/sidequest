import {drawPet} from './pet-art.js';
import {activePet} from './squad-data.js';
import {biomeFor,locationFor,foeFor,foes} from './world-data.js';
export function drawEnemy(c,species,x,y,scale,color='#aac77a',time=0){
 const r=(a,b,w,h,col=color)=>{c.fillStyle=col;c.fillRect(Math.round(x+a*scale),Math.round(y+b*scale),w*scale,h*scale);};
 const dark='#26343b',eye='#f6e5ad';
 if(species==='slime'){r(3,7,10,7);r(1,10,14,5);r(5,5,6,3);r(4,8,3,1,'#d1e9cc');r(5,10,1,2,dark);r(10,10,1,2,dark);r(7,13,2,1,dark);}
 else if(species==='bat'||species==='moth'){const flap=Math.round(Math.sin(time*5)*2);r(6,5,4,8);r(2,5+flap,4,5);r(0,3+flap,3,5);r(10,5+flap,4,5);r(13,3+flap,3,5);if(species==='moth'){r(1,7+flap,4,6,'#b794cf');r(11,7+flap,4,6,'#b794cf');r(2,8+flap,2,2,eye);r(12,8+flap,2,2,eye);}r(6,3,1,3);r(9,3,1,3);r(6,7,1,1,eye);r(9,7,1,1,eye);}
 else if(species==='crab'||species==='scarab'){r(4,6,8,7);r(6,4,4,3);for(let i=0;i<3;i++){r(2,7+i*3,3,1);r(11,7+i*3,3,1);}if(species==='crab'){r(0,3,4,4);r(12,3,4,4);r(1,1,1,3);r(14,1,1,3);r(5,4,1,2,eye);r(10,4,1,2,eye);}else{r(7,5,2,8,'#8f8c4b');r(6,2,1,3);r(9,2,1,3);r(6,5,1,1,eye);r(9,5,1,1,eye);}}
 else if(species==='golem'){r(5,1,7,5);r(3,6,11,7);r(0,7,3,6);r(14,7,2,6);r(3,13,4,3);r(10,13,4,3);r(6,3,2,1,eye);r(10,3,1,1,eye);r(7,8,3,3,'#86c4bf');r(1,8,1,3,'#737c75');}
 else if(species==='wolf'){r(4,5,9,7);r(10,3,5,5);r(11,0,2,4);r(14,1,1,3);r(13,6,3,2);r(3,11,3,4);r(10,11,3,4);r(0,3,3,6);r(2,7,3,3);r(12,5,1,1,dark);}
 else{r(5,3,6,5);r(4,8,8,5);r(3,9,2,5);r(11,9,2,5);r(5,13,2,3);r(9,13,2,3);r(6,5,1,1,eye);r(9,5,1,1,eye);
 if(species==='bramble'){r(3,0,2,5);r(11,0,2,5);r(1,9,2,2);r(13,10,2,2);r(7,7,2,1,dark);}
 if(species==='imp'){r(2,2,4,2);r(10,2,4,2);r(7,7,2,1,dark);r(13,12,3,2);}
 if(species==='witch'){r(4,2,8,2,'#51455d');r(6,0,4,3,'#51455d');r(7,-2,2,3,'#51455d');r(2,13,12,3);r(14,5,1,11,'#c5a57d');r(13,4,3,2,'#ddd7b1');}
 if(species==='knight'){r(4,2,8,5,'#9bafb9');r(5,4,6,1,dark);r(7,0,2,3,'#aa7180');r(1,8,3,6,'#697e92');r(14,6,1,8,eye);}
 if(species==='pirate'){r(3,1,10,3,'#42404d');r(5,0,6,2,'#42404d');r(5,5,3,1,dark);r(8,9,2,4,'#dfbf80');r(13,9,2,4,'#d7d6bd');}}
}
export function drawScene(c,state,time,drawHero,reduced=false){const loc=locationFor(state),b=biomeFor(loc.biome);const r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);};const w=480,h=194;c.clearRect(0,0,w,h);r(0,0,w,h,b.sky);
 const cloud=(x,y,col='#d4dec8')=>{r(x,y,45,5,col);r(x+8,y-4,25,5,col);};
 const pine=(x,y,size,col)=>{r(x+6*size,y+18*size,3*size,17*size,'#675a3c');for(let n=0;n<4;n++)r(x+(6-n*2)*size,y+n*5*size,(3+n*4)*size,6*size,col);};
 const arch=(x,y,col)=>{r(x,y,9,48,col);r(x+38,y,9,48,col);r(x,y,47,8,col);r(x+8,y-6,31,8,col);};
 if(['forest','coast','desert','snow','sky'].includes(b.id)){r(337,25,20,20,'#e6d7a5');r(333,29,28,12,'#e6d7a5');cloud(64,28);cloud(384,49);}
 if(b.id==='forest'){for(let i=0;i<15;i++)pine(i*36-10,60+(i%3)*6,1,'#4d8165');r(0,112,w,82,b.ground);for(let y=113;y<h;y+=4)r(242-(y-113)*.5,y,28+(y-113)*1.15,4,'#b1a473');pine(-20,6,3,'#30583b');pine(33,32,2.5,'#3b6940');pine(420,11,3,'#365e3c');arch(367,82,'#738468');}
 if(b.id==='coast'){r(0,78,w,60,'#4d8f9c');for(let i=0;i<12;i++)r((i*47+time*4)%500-20,86+(i%4)*11,28,1,'#a4d1c9');r(0,138,w,56,b.ground);r(0,134,210,7,'#ded2a0');r(330,132,150,8,'#ded2a0');r(48,62,14,65,'#dad5bd');r(44,61,22,8,'#a57564');r(48,52,14,10,'#e7d694');r(52,38,6,15,'#6a7476');r(370,120,56,12,'#796a52');r(390,75,3,47,'#715e47');r(395,80,24,28,'#ddd1a2');}
 if(b.id==='ruins'){for(let i=0;i<6;i++){r(i*93,60+(i%2)*18,63,70,'#737481');r(i*93+8,48+(i%2)*18,12,22,'#737481');}r(0,126,w,68,b.ground);arch(50,67,'#b0a796');arch(381,52,'#9c978b');r(204,55,67,66,'#817e82');r(210,42,55,20,'#b6ac92');r(229,59,17,17,'#d7c59c');r(237,61,2,10,'#5b6370');for(let i=0;i<25;i++)r(i*22%480,138+(i%4)*11,16,2,'#928f7c');}
 if(b.id==='cavern'){r(0,0,w,30,'#1d2338');for(let i=0;i<15;i++){r(i*35,25,18,14+(i%4)*8,'#3e3b59');r(i*35+6,35,6,20+(i%4)*5,'#3e3b59');}r(0,127,w,67,b.ground);for(const [x,y]of [[44,97],[105,118],[357,106],[429,88]]){r(x,y,12,35,'#7675ac');r(x+3,y-9,6,10,'#b0b0e1');r(x+5,y+3,3,27,'#bfcde6');r(x+13,y+15,11,20,'#9a85c3');}r(196,109,81,10,'#2b374e');r(182,119,110,14,'#2e4b65');}
 if(b.id==='marsh'){r(0,82,w,72,'#446e71');for(let i=0;i<9;i++){pine(i*59,40+(i%2)*10,1.8,'#354f4b');r(i*64,106+(i%3)*11,55,1,'#8bafa1');}r(0,154,w,40,b.ground);r(130,148,233,16,'#7c7860');for(let i=0;i<11;i++)r(130+i*22,148,2,16,'#444e45');r(368,134,23,5,'#b8ac83');r(376,117,5,18,'#937353');r(373,114,11,10,'#e5c990');}
 if(b.id==='snow'){for(let i=0;i<5;i++){r(i*119-10,70,109,73,'#7895a5');r(i*119+20,51,48,24,'#c5d5d6');r(i*119+32,44,24,10,'#dae3da');}r(0,131,w,63,b.ground);pine(24,48,2.5,'#587976');pine(410,56,2.3,'#587976');r(21,64,40,4,'#d8e4d9');for(let i=0;i<35;i++)r((i*39+time*4)%480,(i*31+time*9)%190,1,2,'#e5eae0');}
 if(b.id==='desert'){r(0,104,w,90,b.ground);for(let i=0;i<4;i++){r(i*137-30,94+(i%2)*10,130,30,'#ad8356');r(i*137,87+(i%2)*10,62,10,'#ad8356');}arch(370,58,'#dfbf85');r(49,104,6,43,'#748252');r(38,115,6,17,'#748252');r(38,128,14,4,'#748252');r(56,111,12,5,'#748252');r(63,104,5,13,'#748252');for(let i=0;i<50;i++)r(i*41%480,148+(i%5)*8,6,1,'#dfb97c');}
 if(b.id==='sky'){for(let i=0;i<12;i++){r(i*41,30+(i%5)*15,2,2,'#ddd9c0');}cloud(26,112,'#aaa8be');cloud(391,119,'#b7b4c8');r(110,150,275,15,b.ground);r(133,164,229,8,'#5c647e');r(157,172,180,8,'#4d5670');r(198,179,92,10,'#444e66');arch(340,81,'#b6b2c4');r(75,85,59,8,'#9399ab');r(90,93,30,9,'#747b94');}
 // Deterministic ground flecks retain the handmade pixel texture.
 for(let i=0;i<65;i++)r((i*73+loc.region*11)%480,164+(i*13)%28,2,1,b.color);
 const battle=state.battle,active=!!battle&&!battle.pausedAt&&!state.resting&&!reduced;const phase=active?time%6:0;
 const approach=state.world?.approach||'fight';const heroStrike=active&&phase>.4&&phase<1.8,enemyStrike=active&&phase>3.2&&phase<4.6;
 let heroX=170+(heroStrike?Math.sin((phase-.4)/1.4*Math.PI)*53:0),enemyX=300-(enemyStrike?Math.sin((phase-3.2)/1.4*Math.PI)*48:0);
 const bob=active?Math.round(Math.sin(time*4)*2):Math.round(Math.sin(time*1.5));
 r(heroX+7,165,31,3,'#17283066');r(enemyX+2,165,43,3,'#17283066');
 if(enemyStrike&&phase>4&&phase<4.3)heroX-=6;
 drawHero(c,'hero',heroX,117+bob,3,state.equipped,state.appearance);
 const enemy=foeFor(state);const showEnemy=!!battle||(!state.lastReward&&!state.resting);
 if(showEnemy)drawEnemy(c,enemy.species,enemyX,117-bob,3,enemy.color,time);
 const companion=activePet(state);if(companion)drawPet(c,companion,heroX-43,140,1.7,time,state.squad.trick);
 const ally=Object.values(state.world?.relationships||{}).find(r=>r.status==='ally'&&r.id!==enemy.id);
 if(ally){const type=foes[ally.id];drawEnemy(c,type?.species||'imp',68,137,2,type?.color,time);if(heroStrike)r(141+(phase-.4)*90,134,4,2,'#d6e8b1');}
 if(active&&(heroStrike||enemyStrike)){
 const progress=heroStrike?(phase-.4)/1.4:(phase-3.2)/1.4;
 const x=heroStrike?heroX+43+progress*24:enemyX-progress*45;const col=approach==='parley'?'#efd0b0':heroStrike?'#eef1c0':'#e7a17d';
 if(approach==='parley'){r(x,123,3,3,col);r(x+4,123,3,3,col);r(x+1,126,5,2,col);r(x+2,128,3,2,col);}else{r(x,123,2,14,col);r(x+3,118,2,11,col);r(x-3,133,2,7,col);}
 for(let i=0;i<4;i++)r(x+(i-2)*5,126+(i%2?1:-1)*progress*15,2,2,col);
 }
 if(!battle){r(216,157,12,6,'#916d41');r(220,148-Math.round(Math.sin(time*7)),5,11,'#e4ab5a');r(222,145,2,11,'#f6d787');}
 if(state.resting){c.fillStyle='#14223e55';c.fillRect(0,0,w,h);}if(reduced&&battle){r(237,125,3,16,'#edd89e');r(231,131,15,3,'#edd89e');}
}
