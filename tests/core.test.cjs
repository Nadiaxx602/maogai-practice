const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const reference = require('./answer-reference.json');
const C = require('../docs/quiz-core.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../docs/data.js'),'utf8'),context);
const Q = JSON.parse(JSON.stringify(context.window.QUESTION_BANK));
assert.equal(Q.length,298);
assert.equal(new Set(Q.map(q=>q.id)).size,298);
assert.equal(Q.filter(q=>q.type==='单选').length,197);
assert.equal(Q.filter(q=>q.type==='多选').length,101);
const chapters=[...new Set(Q.map(q=>q.chapter))];
assert.deepEqual(chapters.map(ch=>ch.split(' ')[0]),['绪论','第一章','第二章','第三章','第五章','第六章','第七章']);
assert.deepEqual(chapters.map(ch=>Q.filter(q=>q.chapter===ch).length),[26,44,50,30,50,53,45]);
for(const ch of chapters){
  const qs=Q.filter(q=>q.chapter===ch);
  assert.deepEqual(qs.map(q=>q.order),qs.map((_,i)=>i+1));
}
const find=(chapter,order)=>Q.find(q=>q.chapter.startsWith(chapter+' ')&&q.order===order);
for(const [chapter,order,answer] of [['第一章',35,'ABCD'],['第五章',18,'C'],['第六章',6,'C'],['第六章',42,'ABCD'],['第七章',25,'A'],['第七章',41,'AB'],['第七章',15,'A']]){
  assert.equal(find(chapter,order).answer,answer,`${chapter}第${order}题 must retain the latest source answer`);
}
assert.equal(reference.records.length,257);
const normalizeText=text=>text.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
const latestCorrections={10:['马克思列宁主义'],67:['理论联系实际','坚持在实践中检验真理和发展真理','一切从实际出发']};
for(const row of reference.records){
  const q=Q.find(q=>q.id===row.id);
  // Later explicit corrections and course screenshots supersede Excel answers.
  const expected=latestCorrections[row.id]||row.answers;
  assert.deepEqual([...q.answer].map(a=>normalizeText(q.options[a])).sort(),expected.map(normalizeText).sort(),`Excel row ${row.row}, with latest user corrections: answer CONTENT must match`);
}
assert.equal(find('第二章',27).answer,'D');
assert.equal(find('第二章',27).options.D,'以武装的革命反对武装的反革命');
assert.ok(find('第二章',27).options.B.includes('目标是争取民族独立'));
assert.equal(find('绪论',10).answer,'C');
assert.equal(find('绪论',10).explanation,'C. 马克思列宁主义');
assert.equal(find('绪论',10).note,'');
assert.equal(find('第一章',41).answer,'ACD');
assert.equal(find('第一章',41).options.B,'调查研究');
assert.equal(find('第一章',41).explanation,'A. 理论联系实际；C. 坚持在实践中检验真理和发展真理；D. 一切从实际出发');
assert.equal(find('第一章',41).note,'');
assert.equal(C.correct(['A','C','D'],find('第一章',41).answer),true);
assert.equal(C.correct(['A','B','C','D'],find('第一章',41).answer),false);
assert.ok(find('第七章',15).options.A.endsWith('坚持党的先进性'));
for(const q of Q){
  assert.ok(q.question.trim());assert.ok(q.explanation.trim());
  assert.ok(Object.keys(q.options).length>=4);
  assert.ok(Object.values(q.options).every(s=>s.trim()));
  for(const a of q.answer)assert.ok(Object.hasOwn(q.options,a));
  if(q.type==='单选')assert.equal(q.answer.length,1);
}
const allCorrect = Object.fromEntries(Q.map(q=>[q.id,q.answer.split('')]));
assert.equal(C.grade(Q,allCorrect).score,100);
assert.equal(C.grade(Q,{}).unanswered,298);
assert.equal(C.grade(Q,{}).wrong,0);
assert.equal(C.correct(['B','A'],'AB'),true);
assert.equal(C.correct(['A'],'AB'),false);
assert.equal(C.correct(['A','B','C'],'AB'),false);
assert.equal(C.correct([],'AB'),false);
assert.equal(C.correct(['C'],'C'),true);
const partial={1:['C'],2:['B']};
const score=C.grade(Q.slice(0,3),partial);
assert.equal(score.right,1);assert.equal(score.wrong,1);assert.equal(score.unanswered,1);assert.equal(score.score,33);
const source = [1,2,3,4,5], shuffled=C.shuffle(source,()=>0.25);
assert.deepEqual(source,[1,2,3,4,5]);assert.deepEqual([...shuffled].sort(),source);assert.notDeepEqual(shuffled,source);
const chapter=Q[0].chapter;
const selected=C.selectQuestions(Q,{chapter,type:'多选',count:'100',order:'sequential'});
assert.equal(selected.length,5);assert.ok(selected.every(q=>q.chapter===chapter&&q.type==='多选'));
assert.equal(C.selectQuestions(Q,{chapter:'all',type:'all',count:'20',order:'random'}).length,20);
assert.equal(C.selectQuestions(Q,{chapter:'all',type:'all',count:'all',order:'sequential'}).length,298);
console.log('Passed: 298 questions, seven chapter counts and original numbers, seven user confirmations, exact multi-choice grading, scores, filters, random selection.');
console.log('Passed: 257 reference answers with latest corrections to questions 10 and 67, original photo order for revolution question 27.');
