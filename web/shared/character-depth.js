export const characterQuestions=[
 ['purpose','What is your adventurer hoping to find, beyond treasure?'],
 ['kindness','What small act of kindness do they never forget?'],
 ['principle','What would they refuse to do, even to win?'],
 ['trust','What makes them trust someone who used to be a rival?'],
 ['home','What place—or person—feels like home to them?'],
 ['courage','What makes them feel brave when they are uncertain?'],
 ['flaw','What do they tend to get wrong about other people?'],
 ['promise','What promise are they trying to keep?'],
 ['joy','What ordinary moment makes them unexpectedly happy?'],
 ['change','What belief have their travels started to change?'],
 ['loss','What would they like to find again someday?'],
 ['humor','What kind of joke can catch them off guard?'],
 ['conflict','How do they handle a disagreement with a friend?'],
 ['skill','What non-magical skill are they quietly proud of?'],
 ['boundaries','What should the narrator avoid assuming about them?'],
 ['legacy','What would they hope a new friend remembers about them?'],
 ['surprise','What would surprise the squad about their past?'],
 ['comfort','What helps them feel at ease somewhere unfamiliar?'],
 ['mercy','When would they offer an opponent a second chance?'],
 ['wonder','What mystery could tempt them off the planned route?'],
 ['lesson','What has a companion taught them lately?'],
 ['regret','What mistake are they learning to forgive themselves for?'],
 ['celebration','How do they celebrate a victory with their friends?'],
 ['future','What would a peaceful ending to this adventure look like?']
];
export function characterQuestion(s){const l=s.lore||{cursor:0};const [theme,text]=characterQuestions[l.cursor%characterQuestions.length];const round=Math.floor(l.cursor/characterQuestions.length);return {id:`${l.cursor}-${theme}`,theme,text:round?`After “${s.world?.mission.title||'your latest adventure'}”: ${text.charAt(0).toLowerCase()+text.slice(1)}`:text};}
export function questionDue(s){return !!s.lore&&s.world.totalWins>=s.lore.nextAt;}
