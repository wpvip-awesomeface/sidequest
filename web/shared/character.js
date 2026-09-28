export const hairstyles = [
 {id:'crop',name:'Little crop',pixels:[[5,1,6,2],[4,2,8,2],[5,4,1,1]]},
 {id:'sweep',name:'Side sweep',pixels:[[6,0,5,2],[4,2,8,2],[4,4,3,1],[4,5,1,1]]},
 {id:'bob',name:'Woodland bob',pixels:[[5,1,6,2],[4,2,8,2],[4,4,1,4],[11,4,1,4],[5,4,2,1]]},
 {id:'curls',name:'Soft curls',pixels:[[5,0,2,2],[8,0,2,2],[4,2,8,2],[3,3,2,3],[11,3,2,3],[4,6,2,1],[10,6,2,1]]},
 {id:'spikes',name:'Bedhead',pixels:[[5,0,1,3],[8,0,1,3],[10,1,1,2],[4,2,8,2],[5,4,1,1]]},
 {id:'ponytail',name:'Ponytail',pixels:[[5,1,6,3],[4,2,8,2],[11,3,3,2],[13,5,2,3],[12,7,2,2]]},
 {id:'braids',name:'Twin braids',pixels:[[5,1,6,3],[4,2,8,2],[4,4,1,2],[11,4,1,2],[3,6,2,2],[11,6,2,2],[4,8,1,2],[11,8,1,2]]},
 {id:'mohawk',name:'Tiny mohawk',pixels:[[7,0,2,4],[6,1,1,2],[9,1,1,2]]},
 {id:'bun',name:'Top knot',pixels:[[7,0,3,2],[5,2,6,2],[4,3,1,2],[11,3,1,2]]},
 {id:'bald',name:'Bare & brave',pixels:[]}
];
export const defaultAppearance={hairStyle:'crop',hairColor:'#bda16c',shirtColor:'#aac77a',pantsColor:'#866647',skinColor:'#f4d29b'};
export function normalizeAppearance(value={}){const result={...defaultAppearance};if(hairstyles.some(h=>h.id===value.hairStyle))result.hairStyle=value.hairStyle;for(const key of ['hairColor','shirtColor','pantsColor','skinColor'])if(/^#[0-9a-f]{6}$/i.test(value[key]||''))result[key]=value[key];return result;}
