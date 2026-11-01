const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const C = require('../docs/quiz-core.js');
const data={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../docs/data.js'),'utf8'),data);
const bank=JSON.parse(JSON.stringify(data.window.QUESTION_BANK));
const migration=JSON.parse(JSON.stringify(data.window.QUESTION_BANK_MIGRATION));
const code=fs.readFileSync(path.join(__dirname,'../docs/app.js'),'utf8');
const KEY='maogai-study-room-photos-20261101-v2';
function mount(initial,now=200000,storageFails=false,storedKey=KEY){
 let saved=initial,tick;
 const backups={};
 const elements=new Map(),listeners={};
 const document={title:'',addEventListener(name,handler){listeners[name]=handler;},querySelector(){return null;},getElementById(id){if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},close(){},showModal(){},querySelector(){return {};}});return elements.get(id);}};
 const context={document,window:{QUESTION_BANK:bank,QUESTION_BANK_MIGRATION:migration,QuizCore:C,scrollTo(){}},localStorage:{getItem(key){if(storageFails)throw Error('blocked');if(key!==KEY)return backups[key]||null;return saved&&key===storedKey?JSON.stringify(saved):null;},setItem(key,value){if(storageFails)throw Error('blocked');if(key!==KEY){backups[key]=value;return;}saved=JSON.parse(value);}},Date:class extends Date{static now(){return now;}},setInterval(fn){tick=fn;},setTimeout(){},clearTimeout(){},console};
 vm.runInNewContext(code,context);
 return{state:()=>saved,backups,html:()=>elements.get('app').innerHTML,tick:()=>tick(),advance:n=>now=n,click:(action,extra={})=>listeners.click({target:{closest:()=>({dataset:{action,...extra}})},preventDefault(){}})};
}
const initial={version:2,wrong:{},seen:{},history:[],session:{id:'timed-test',mode:'exam',ids:[1,2],answers:{1:['C']},checked:{},flags:{},index:0,startedAt:100000,deadline:150000,title:'模拟考试'}};
const expired=mount(initial);
assert.equal(expired.state().session,null);
assert.equal(expired.state().history.length,1);
assert.equal(expired.state().history[0].score,50);
assert.equal(expired.state().history[0].unanswered,1);
assert.equal(expired.state().history[0].elapsed,50000);
assert.equal(expired.state().seen[1].attempts,1);
assert.equal(expired.state().wrong[2].count,1);
expired.tick();assert.equal(expired.state().history.length,1);
const running=mount(initial,120000);
assert.ok(running.html().includes('还有一场模拟考试等你继续'));
assert.equal(running.state().session.answers[1][0],'C');
running.advance(150001);running.tick();assert.equal(running.state().session,null);
assert.equal(running.state().history[0].score,50);
const unavailable=mount(null,200000,true);
assert.ok(unavailable.html().includes('浏览器存储暂不可用'));
console.log('Passed: expired-exam recovery, deadline auto-submit, no duplicate grading, saved selection, unavailable-storage fallback.');
const full=mount(null);
full.click('nav',{page:'all'});
assert.ok(full.html().includes('全部题混合练习'));
assert.ok(full.html().includes('第七章 科学发展观'));
full.click('start-all');
assert.equal(full.state().session.mode,'all');
const mixedOrder=[...full.state().session.ids];
assert.deepEqual([...mixedOrder].sort((a,b)=>a-b),bank.map(q=>q.id));
assert.notDeepEqual(mixedOrder,bank.map(q=>q.id));
assert.equal(full.state().session.config.order,'random');
assert.equal(full.state().session.deadline,null);
const firstId=mixedOrder[0];
full.click('choose',{letter:'C'});full.click('check');full.click('next');
assert.equal(full.state().session.index,1);
assert.equal(full.state().seen[firstId].attempts,1);
const recovered=mount(full.state());
recovered.click('nav',{page:'all'});
assert.ok(recovered.html().includes('继续第2题'));
assert.ok(recovered.html().includes('已确认 1 / 298 题'));
recovered.click('resume');
assert.ok(recovered.html().includes('2 / 298'));
assert.deepEqual(recovered.state().session.ids,mixedOrder);
assert.deepEqual(recovered.state().session.answers[firstId],['C']);
recovered.click('jump',{index:'297'});
assert.ok(recovered.html().includes('298 / 298'));
assert.equal(recovered.state().session.ids[297],mixedOrder[297]);
recovered.click('next');
assert.equal(recovered.state().session.index,297);
assert.equal(recovered.state().session.ids.length,298);
const chapters=[...new Set(bank.map(q=>q.chapter))];
chapters.forEach((chapter,i)=>{
 const practice=mount(null);
 practice.click('chapter',{chapter:String(i)});
 const session=practice.state().session;
 assert.equal(session.config.chapter,chapter);
 assert.deepEqual(session.ids,bank.filter(q=>q.chapter===chapter).map(q=>q.id));
 assert.equal(session.deadline,null);
});
const old=mount({...initial,version:1},120000,false,'maogai-study-room-v1');
assert.ok(!old.html().includes('还有一场模拟考试等你继续'));
old.click('chapter',{chapter:'6'});
assert.equal(old.state().version,2);
assert.deepEqual(old.state().history,[]);
assert.deepEqual(old.state().seen,{});
console.log('Passed: all 298 shuffled exactly once, order and answer persistence, resume, last-question boundary, seven independent full-chapter entries, and old-storage isolation.');

// The reported regression: old B is the correct text, old D is a wrong text.
const legacy={version:2,wrong:{97:{count:3,lastAt:100}},seen:{97:{attempts:4,right:0},1:{attempts:10,right:8}},history:[
 {id:'report',mode:'practice',ids:[97],answers:{97:['D']},finishedAt:900,score:100,right:1,wrong:0,unanswered:0,details:[{id:97,selected:['D'],correct:true}]}
],session:{id:'continue',mode:'practice',ids:[97,1],answers:{97:['B']},checked:{97:true},flags:{97:true},index:1,startedAt:1000,deadline:null}};
const repaired=mount(legacy,1200);
assert.deepEqual(repaired.state().session.answers[97],['D']);
assert.deepEqual(repaired.state().session.ids,[97,1]);
assert.equal(repaired.state().session.index,1);
assert.equal(repaired.state().session.flags[97],true);
assert.deepEqual(repaired.state().history[0].answers[97],['B']);
assert.equal(repaired.state().history[0].score,0);
assert.equal(repaired.state().history[0].details[0].correct,false);
assert.deepEqual(repaired.state().seen[1],legacy.seen[1]);
assert.equal(repaired.state().seen[97].attempts,2);
assert.equal(repaired.state().seen[97].right,1);
assert.equal(repaired.state().wrong[97],undefined);
assert.deepEqual(JSON.parse(repaired.backups[KEY+'-before-excel-audit']),legacy);
const once=JSON.parse(JSON.stringify(repaired.state()));
assert.deepEqual(C.migrateQuestionBank(once,migration,bank),once);
assert.deepEqual(mount(once).state(),once);
const multiId=migration.affectedIds.find(id=>bank.find(q=>q.id===id).type==='多选'&&migration.letters[id]);
const multiMap=migration.letters[multiId], correctOld=Object.keys(multiMap).filter(a=>bank.find(q=>q.id===multiId).answer.includes(multiMap[a]));
const multi={...legacy,session:{...legacy.session,ids:[multiId],index:0,answers:{[multiId]:correctOld},checked:{[multiId]:true}},history:[],seen:{},wrong:{}};
const multiFixed=C.migrateQuestionBank(multi,migration,bank);
assert.ok(C.correct(multiFixed.session.answers[multiId],bank.find(q=>q.id===multiId).answer));
assert.equal(multiFixed.seen[multiId].right,1);
console.log('Passed: legacy choices remapped by content, corrected scores and wrong-book, preserved progress/flags/unaffected statistics, backup, multi-choice migration and idempotence.');

// Existing Excel-v1 users have already had their option letters remapped.
const v1={version:2,bankRevision:'excel-20261101-v1',wrong:{10:{count:1,lastAt:900}},seen:{10:{attempts:1,right:0},97:{attempts:5,right:4}},history:[
 {id:'v1-report',mode:'practice',ids:[10,97],answers:{10:['C'],97:['D']},finishedAt:900,score:50,right:1,wrong:1,unanswered:0}
],session:{id:'v1-session',mode:'practice',ids:[10,97],answers:{10:['C'],97:['D']},checked:{},flags:{10:true},index:0,startedAt:1000,deadline:null}};
const v2=mount(v1,1200).state();
assert.deepEqual(v2.session.answers,v1.session.answers);
assert.deepEqual(v2.history[0].answers,v1.history[0].answers);
assert.equal(v2.history[0].score,100);
assert.equal(v2.seen[10].right,1);
assert.equal(v2.wrong[10],undefined);
assert.deepEqual(v2.seen[97],v1.seen[97]);
assert.equal(v2.session.flags[10],true);
assert.equal(v2.bankRevision,migration.revision);
assert.deepEqual(mount(v2,1200).state(),v2);
console.log('Passed: question 10 C regraded correctly for Excel-v1 users without repeating option remapping; progress and other statistics preserved.');

// Course screenshot confirms chapter 1 question 41: ACD, not ABCD.
for(const revision of ['excel-20261101-v1','excel-20261101-v2']){
 const previous={version:2,bankRevision:revision,wrong:{67:{count:1,lastAt:1000}},seen:{67:{attempts:2,right:1},97:{attempts:5,right:4}},history:[
  {id:'old-key',mode:'practice',ids:[67,97],answers:{67:['A','B','C','D'],97:['D']},finishedAt:900,score:100,right:2,wrong:0,unanswered:0}
 ],session:{id:'screenshot',mode:'practice',ids:[67,97],answers:{67:['A','C','D'],97:['D']},checked:{67:true},flags:{67:true},index:0,startedAt:1000,deadline:null}};
 const updated=mount(previous,1200).state();
 assert.deepEqual(updated.session.answers,previous.session.answers);
 assert.deepEqual(updated.history[0].answers,previous.history[0].answers);
 assert.equal(updated.history[0].score,50);
 assert.equal(updated.history[0].details[0].correct,false);
 assert.equal(updated.seen[67].attempts,2);
 assert.equal(updated.seen[67].right,1);
 assert.equal(updated.seen[67].lastCorrect,true);
 assert.equal(updated.wrong[67],undefined);
 assert.deepEqual(updated.seen[97],previous.seen[97]);
 assert.equal(updated.session.flags[67],true);
 assert.equal(updated.bankRevision,migration.revision);
 assert.deepEqual(mount(updated,1200).state(),updated);
}
console.log('Passed: course-confirmed ACD repairs saved results from v1 and v2, marks old ABCD wrong, preserves progress, and is idempotent.');

// Chapter 2 question 31 keeps website option order: course ABD means site ACD.
for(const revision of ['excel-20261101-v1','excel-20261101-v2','excel-20261101-v3']){
 const previous={version:2,bankRevision:revision,wrong:{101:{count:1,lastAt:1000}},seen:{101:{attempts:2,right:1},97:{attempts:5,right:4}},history:[
  {id:'old-ac',mode:'practice',ids:[101,97],answers:{101:['A','C'],97:['D']},finishedAt:900,score:100,right:2,wrong:0,unanswered:0}
 ],session:{id:'course31',mode:'practice',ids:[101,97],answers:{101:['A','C','D'],97:['D']},checked:{101:true},flags:{101:true},index:0,startedAt:1000,deadline:null}};
 const updated=mount(previous,1200).state();
 assert.deepEqual(updated.session.answers,previous.session.answers);
 assert.deepEqual(updated.history[0].answers,previous.history[0].answers);
 assert.equal(updated.history[0].score,50);
 assert.equal(updated.history[0].details[0].correct,false);
 assert.equal(updated.seen[101].attempts,2);
 assert.equal(updated.seen[101].right,1);
 assert.equal(updated.seen[101].lastCorrect,true);
 assert.equal(updated.wrong[101],undefined);
 assert.deepEqual(updated.seen[97],previous.seen[97]);
 assert.equal(updated.session.flags[101],true);
 assert.equal(updated.bankRevision,'excel-20261101-v4');
 assert.deepEqual(mount(updated,1200).state(),updated);
}
console.log('Passed: chapter 2 question 31 regrades ACD as correct and AC as incomplete from v1/v2/v3 without changing selected letters or progress.');
