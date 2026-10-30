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
  const api={normalize,correct,shuffle,grade,selectQuestions};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.QuizCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
