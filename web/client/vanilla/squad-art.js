import {activePet} from './squad-data.js';
import {drawEnemy} from './scenes.js';
import {foes} from './world-data.js';
import {drawPet} from './pet-art.js';
export function drawSquad(c,s,hero,time){const q=s.squad;if(!q)return;const w=c.canvas.width,h=c.canvas.height,p=activePet(s);c.clearRect(0,0,w,h);const x=p?62:102,y=50+Math.round(Math.sin(time*2));c.fillStyle='#0c171a66';c.fillRect(x+13,151,70,5);hero(c,'hero',x,y,6,s.equipped,s.appearance);if(p){c.fillRect(187,152,52,4);drawPet(c,p,181,97+Math.round(Math.sin(time*2+1)),4,time,q.trick);}c.fillStyle='#b8ca9066';c.fillRect(w/2-12,h-12,24,1);}
export function drawHome(c,s,hero,time){const q=s.squad;if(!q)return;const r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);};c.clearRect(0,0,640,400);
// A cutaway room nestled around a living trunk, with forest light through windows.
r(0,0,640,400,'#172b27');for(let i=0;i<12;i++){r(i*63-8,7+(i%3)*10,67,34,'#2b4a37');r(i*61,22,43,40,'#35563d');}
r(24,58,592,263,'#674934');r(36,70,568,222,'#956b46');for(let y=74;y<294;y+=22){r(36,y,568,2,'#795539');for(let x=50+(y%3)*20;x<600;x+=116)r(x,y+8,29,1,'#a37c51');}
// Deep windows show treetops; stepped corners keep the eight-bit shape.
for(const x of [69,390]){r(x-8,100,146,114,'#543e30');r(x,96,130,118,'#c5a274');r(x+8,106,114,96,'#a4c2a8');r(x+8,151,114,51,'#648e66');for(let i=0;i<4;i++){r(x+11+i*28,136+(i%2)*13,24,32,'#416d4b');r(x+20+i*28,158,4,43,'#6e7450');}r(x+61,103,7,102,'#bc9765');r(x+8,153,114,6,'#bc9765');r(x-7,208,144,9,'#d0ae77');}
// Structural beams and roots, not a bed-shaped frame.
r(20,52,600,18,'#493d2c');r(20,69,600,5,'#b18b57');r(31,72,14,236,'#634c33');r(589,72,15,239,'#634c33');for(let i=0;i<12;i++){r(23+i*18,49-i*3,22,8,'#745b3c');r(397+i*18,16+i*3,22,8,'#745b3c');}
r(539,30,37,306,'#5c4831');r(547,34,8,284,'#89613e');r(566,74,5,243,'#3f3827');r(525,274,24,63,'#5c4831');r(573,292,22,45,'#5c4831');r(526,67,22,12,'#5c4831');r(508,49,26,12,'#5c4831');r(496,41,25,13,'#477143');
// Planked floor and a woven welcome rug.
r(20,291,600,100,'#8a6542');for(let y=292;y<391;y+=17){r(20,y,600,2,'#5f4834');for(let x=30+(y%4)*30;x<620;x+=93)r(x,y,2,17,'#705135');}r(15,389,610,8,'#4c3b2b');r(222,316,183,49,'#5f7161');r(229,322,169,37,'#8a9b75');r(236,328,155,25,'#657d68');for(let x=224;x<405;x+=8){r(x,312,3,5,'#bdb383');r(x,365,3,5,'#bdb383');}
const visible=id=>q.home.includes(id)&&!(q.homeHidden||[]).includes(id),tone=(id,colors)=>colors[q.homeStyles?.[id]||0];
// Furnishings each have an identifiable silhouette and a dedicated place.
if(visible('cushions')){const col=tone('cushions',['#b78d9b','#839cb1','#a4ac75']);r(69,264,107,12,'#4e4230');r(74,275,8,29,'#4e4230');r(163,275,8,29,'#4e4230');r(72,251,100,17,col);r(78,234,29,23,col);r(137,234,28,23,col);r(84,238,17,3,'#e0c5af');r(142,238,17,3,'#e0c5af');}
if(visible('lanterns'))for(const x of [53,582]){const col=tone('lanterns',['#f0cc80','#b5d9cc','#d3b3de']);r(x,90,2,32,'#3c392a');r(x-8,120,18,4,'#483e2b');r(x-5,124,12,20,col);r(x-8,144,18,4,'#483e2b');r(x,127,2,13,'#fff0ba');}
if(visible('garden'))for(let i=0;i<4;i++){const x=83+i*26;r(x,197,16,12,'#ad7453');r(x-2,194,20,4,'#ce966b');r(x+6,177,3,17,'#537c44');r(x,181,9,5,'#86a15c');r(x+9,174,8,5,'#86a15c');r(x+4,169,6,7,tone('garden',['#ebc889','#b79fd0','#de9ca0']));}
if(visible('pet-beds')){const col=tone('pet-beds',['#8198b6','#b5a270','#aa87a8']);r(437,320,74,27,'#534435');r(441,317,66,27,col);r(448,323,52,15,'#d4c9a1');r(429,344,10,5,'#b89464');}
if(visible('library')){r(248,119,90,142,'#503e30');r(254,125,78,130,'#775739');for(let y=134;y<245;y+=35){for(let i=0;i<9;i++)r(260+i*7,y+(i%2)*4,5,24-(i%2)*4,['#a6b686','#bf876f','#829eb0'][((q.homeStyles?.library||0)+i)%3]);r(253,y+25,80,5,'#bc9967');}r(250,261,10,12,'#503e30');r(326,261,10,12,'#503e30');}
if(visible('observatory')){const col=tone('observatory',['#bfa3d2','#a3c8be','#d9b978']);r(431,233,6,76,'#614f38');r(407,301,31,5,'#614f38');r(439,301,21,5,'#614f38');for(let i=0;i<5;i++)r(406+i*9,225-i*5,18,14,col);r(448,199,10,20,'#e0d2b2');r(457,201,4,16,'#485e60');}
const keeps=q.keepsakes.slice(-6);keeps.forEach((k,i)=>{const x=visible('library')?70+i*24:239+i%3*30,y=visible('library')?80:151+Math.floor(i/3)*39;r(x,y,23,28,visible('gallery')?tone('gallery',['#dfbd70','#b9cad0','#ba997d']):'#5d4935');r(x+4,y+4,15,20,'#324a40');r(x+9,y+8,5,11,k.color);});
const p=activePet(s);hero(c,'hero',264,279+Math.round(Math.sin(time*2)),4,s.equipped,s.appearance);if(p)drawPet(c,p,342,302,3,time,q.trick);const others=q.adventurers.filter(a=>a.id!==q.activeAdventurer).slice(0,2);others.forEach((a,i)=>hero(c,'hero',100+i*60,316,3,a.equipped,a.appearance));q.pets.filter(a=>a.id!==q.activePet).slice(0,2).forEach((p,i)=>drawPet(c,p,440+i*40,350,2,time));q.friends.slice(0,2).forEach((f,i)=>drawEnemy(c,foes[f.id]?.species||'imp',48+i*40,345,2,foes[f.id]?.color,time));
}
