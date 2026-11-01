(function(root){
  'use strict';
  const normalize = value => [...new Set(Array.isArray(value) ? value : String(value || '').split(''))].sort();
  const correct = (selected, answer) => normalize(selected).join('') === normalize(answer).join('') && normalize(selected).length > 0;
  function shuffle(list, random = Math.random) {
    const result = [...list];
    for (let i=result.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
    return result;
  }
  function grade(questions, answers) {
    let right=0, unanswered=0;
    const details=questions.map(q=>{
      const selected=normalize(answers[q.id]);
      const ok=correct(selected,q.answer);
      if(ok)right++; if(!selected.length)unanswered++;
      return {id:q.id,selected,correct:ok,unanswered:!selected.length};
    });
    return {total:questions.length,right,wrong:questions.length-right-unanswered,unanswered,
      score:questions.length ? Math.round(right/questions.length*100) : 0,details};
  }
  function selectQuestions(questions, config, random=Math.random) {
    let result=questions.filter(q=>(config.chapter==='all'||q.chapter===config.chapter)&&(config.type==='all'||q.type===config.type));
    if(config.order==='random')result=shuffle(result,random);
    return result.slice(0,config.count==='all'?result.length:Math.max(1,Number(config.count)||20));
  }
  function migrateQuestionBank(value, migration, questions) {
    if(!migration || value.bankRevision===migration.revision)return value;
    const db=JSON.parse(JSON.stringify(value)), byId=new Map(questions.map(q=>[q.id,q]));
    // An already migrated bank must only receive the subsequent answer changes.
    const transition=migration.fromRevisions?.[value.bankRevision]||migration;
    const affected=new Set(transition.affectedIds), letters=transition.letters||{};
    const remap=(id,selected)=>normalize(selected).map(a=>letters[id]?.[a]||a).sort();
    const remapAnswers=answers=>Object.fromEntries(Object.entries(answers||{}).map(([id,a])=>[id,remap(id,a)]));
    db.history=db.history.map(result=>{
      const answers=remapAnswers(result.answers||Object.fromEntries((result.details||[]).map(d=>[d.id,d.selected])));
      return {...result,answers,...grade(result.ids.map(id=>byId.get(id)),answers)};
    });
    if(db.session)db.session.answers=remapAnswers(db.session.answers);
    // Per-attempt selections are only available in the saved reports and current
    // session. Rebuild affected statistics from those records, retaining the rest.
    for(const id of affected){delete db.seen[id];delete db.wrong[id];}
    function replay(id,selected,at){
      if(!affected.has(id))return;
      const ok=correct(selected,byId.get(id).answer),old=db.seen[id]||{attempts:0,right:0};
      db.seen[id]={attempts:old.attempts+1,right:old.right+(ok?1:0),lastCorrect:ok,lastAt:at};
      if(ok)delete db.wrong[id];
      else db.wrong[id]={count:(db.wrong[id]?.count||0)+1,lastAt:at};
    }
    [...db.history].sort((a,b)=>a.finishedAt-b.finishedAt).forEach(result=>{
      for(const id of result.ids){const selected=result.answers[id]||[];if(result.mode==='exam'||selected.length)replay(id,selected,result.finishedAt);}
    });
    if(db.session)for(const id of db.session.ids){if(db.session.checked?.[id])replay(id,db.session.answers[id]||[],db.session.startedAt);}
    db.bankRevision=migration.revision;
    db.bankUpdateNotice=true;
    return db;
  }
  const api={normalize,correct,shuffle,grade,selectQuestions,migrateQuestionBank};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.QuizCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
