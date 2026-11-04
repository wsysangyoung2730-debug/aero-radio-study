let transmitSelection='mixed',transmitGroup='',transmitExercise=null;

function transmitExampleGroups(){return [...new Set((DB.transmitExamples||[]).map(item=>item.group))]}
function makeTransmitExercise(source){
  const examples=DB.transmitExamples||[];
  if(source.startsWith('example:')){
    const example=examples.find(item=>item.id===source.slice(8));
    return example?{...example,source}:null;
  }
  if(source==='mixed'){
    const selected=transmitExampleGroups().map(group=>shuffle(examples.filter(item=>item.group===group))[0]).filter(Boolean);
    return {source,title:'숫자·단위 혼합 전문',text:selected.map(item=>item.text).join('\n'),meaning:selected.map(item=>item.meaning).join('\n'),note:'분야마다 한 문장씩 골랐습니다. 숫자와 단위를 한 덩어리로 확인한 뒤 송신해 보세요.'};
  }
  if(source==='random')return {source,title:'무작위 문자 식별 드릴',text:randomGroups(),meaning:'',note:'150자의 영문자·숫자를 식별하는 연습입니다.'};
  const sample=DB.samples.find(item=>item.id===source);
  return sample?{source,title:`첨부 샘플 ${sample.id} 전문`,text:sample.answer,meaning:'',note:'제공된 원본 샘플 전문입니다.'}:null;
}
function currentTransmitExercise(){
  if(!transmitExercise||transmitExercise.source!==transmitSelection)transmitExercise=makeTransmitExercise(transmitSelection);
  return transmitExercise||makeTransmitExercise('random');
}
function transmitExerciseInfo(exercise){return `<div class="transmit-exercise-meta"><span class="pill">${esc(exercise.title)}</span><span class="tiny muted">${normalize(exercise.text).length}자 · 영문자·숫자 기준</span></div>${exercise.meaning?`<details class="transmit-meaning"><summary>한국어 뜻 보기</summary><p>${esc(exercise.meaning)}</p></details>`:''}<p class="field-hint">${esc(exercise.note||'')}</p>`}
function transmitExampleCards(){
  const groups=transmitExampleGroups();
  if(!groups.includes(transmitGroup))transmitGroup=groups[0]||'';
  return (DB.transmitExamples||[]).filter(item=>item.group===transmitGroup).map(item=>`<button type="button" class="transmit-example-card ${transmitSelection===`example:${item.id}`?'selected':''}" data-action="transmit-example" data-id="${esc(item.id)}" aria-pressed="${transmitSelection===`example:${item.id}`}"><span class="tiny muted">${esc(item.title)}</span><strong>${esc(item.text)}</strong><span>${esc(item.meaning)}</span></button>`).join('');
}
function setTransmitExercise(source){
  const exercise=makeTransmitExercise(source);
  if(!exercise)return false;
  transmitSelection=source;transmitExercise=exercise;
  if($('#transmit-source'))$('#transmit-source').value=source;
  if($('#transmit-text'))$('#transmit-text').textContent=exercise.text;
  if($('#transmit-info'))$('#transmit-info').innerHTML=transmitExerciseInfo(exercise);
  if($('#transmit-examples'))$('#transmit-examples').innerHTML=transmitExampleCards();
  return true;
}
function transmitPracticePage(){
  const examples=DB.transmitExamples||[],groups=transmitExampleGroups(),exercise=currentTransmitExercise();
  return `<div class="practice-layout"><section class="panel"><div class="section-head"><h2>소리 내어 송신하기</h2><span class="pill warm">3분 타이머 · 자유 송신 연습</span></div>
    <p class="section-note">숫자와 단위가 들어간 짧은 문장을 골라 음성통화표로 송신해 보세요. 혼합 전문은 분야마다 한 문장씩 묶어 줍니다.</p>
    <div class="field"><label for="transmit-source">연습 전문</label><select id="transmit-source"><option value="mixed" ${transmitSelection==='mixed'?'selected':''}>숫자·단위 혼합 전문</option>${groups.map(group=>`<optgroup label="${esc(group)}">${examples.filter(item=>item.group===group).map(item=>`<option value="example:${esc(item.id)}" ${transmitSelection===`example:${item.id}`?'selected':''}>${esc(item.focus)} · ${esc(item.title)}</option>`).join('')}</optgroup>`).join('')}<optgroup label="원본·문자 드릴">${DB.samples.map(sample=>`<option value="${sample.id}" ${transmitSelection===sample.id?'selected':''}>첨부 샘플 ${sample.id} · ${normalize(sample.answer).length}자</option>`).join('')}<option value="random" ${transmitSelection==='random'?'selected':''}>무작위 문자 식별 드릴 · 150자</option></optgroup></select></div>
    <div class="spacer"></div><div id="transmit-text" class="transmit-text transmit-unit-text">${esc(exercise.text)}</div><div id="transmit-info" aria-live="polite">${transmitExerciseInfo(exercise)}</div>
    <div class="actions" style="margin-top:15px">${button('새 혼합 전문','new-unit-transmit','secondary small')}${button('무작위 문자 드릴','new-transmit','secondary small')}${button('통화표 보기','show-alphabet','ghost small')}</div>
    <div class="practice-countdown" id="practice-clock">${String(Math.floor(transmitSeconds/60)).padStart(2,'0')}:${String(transmitSeconds%60).padStart(2,'0')}</div><div class="actions">${button('타이머 시작','start-practice-timer','')}${button('일시정지','pause-practice-timer','secondary')}${button('초기화','reset-practice-timer','ghost')}</div>
    <div class="spacer"></div><div class="panel"><h3>내 송신 녹음하기</h3><p class="field-hint">녹음은 현재 기기에서 듣거나 저장할 수 있습니다. 녹음 시작 시 마이크 사용을 요청합니다.</p><div class="actions">${button(`${icon('mic',15)} 녹음 시작`,'record-start','secondary','id="record-start"')}${button('녹음 중지','record-stop','danger','id="record-stop" disabled')}</div><div id="record-result" aria-live="polite"></div></div>
    ${notice('숫자·단위 예제는 어휘와 문자 송신을 익히기 위한 자체 제작 문장입니다. 실기 음성통화표와 관제 교신의 숫자 읽기 방식은 구분해 연습하세요.')}
    </section><aside><section class="panel transmit-library"><div class="section-head"><div><div class="eyebrow">NUMBER & UNIT PRACTICE</div><h2>숫자·단위 예제 ${examples.length}개</h2></div></div><p class="section-note">문장을 누르면 송신 전문에 불러옵니다.</p><div class="field"><label for="transmit-group">예제 분야</label><select id="transmit-group">${groups.map(group=>`<option ${group===(transmitGroup||groups[0])?'selected':''}>${esc(group)}</option>`).join('')}</select></div><div id="transmit-examples" class="transmit-example-list">${transmitExampleCards()}</div></section>
    <section class="panel transmit-unit-guide"><h3>단위 함께 기억하기</h3><dl><div><dt>MILES</dt><dd>마일 · 거리</dd></div><div><dt>NAUTICAL MILES / NM</dt><dd>해리 · 거리</dd></div><div><dt>KILOMETRES / KM</dt><dd>킬로미터 · 거리</dd></div><div><dt>KNOTS / KT</dt><dd>노트 · 속도</dd></div></dl><p class="field-hint">속도 단위 ‘노트’의 영어 철자는 <b>KNOT</b>(복수 KNOTS)입니다. MILES와 NAUTICAL MILES도 서로 다른 거리 단위입니다.</p><a class="text-link" href="https://oceanservice.noaa.gov/facts/nautical-mile-knot.html" target="_blank" rel="noopener">단위 뜻 확인 · NOAA ${icon('external',11)}</a><details class="transmit-checklist"><summary>송신 체크리스트</summary><ul class="checklist">${['시작 전 전문 전체와 헷갈리는 문자를 확인했다.','Alfa, Juliett 등 정해진 통화표를 사용했다.','숫자는 일반 영어 읽기와 통화표 표현을 구분했다.','일정한 속도로 숫자와 단위를 빠뜨리지 않았다.','정정 절차를 공식 지침에서 확인했다.','녹음을 다시 듣고 불명확한 발음을 기록했다.'].map(text=>`<li><label><input type="checkbox"><span>${esc(text)}</span></label></li>`).join('')}</ul></details></section></aside></div>`;
}
document.addEventListener('click',event=>{
  const control=event.target.closest('[data-action]');
  if(!control)return;
  if(control.dataset.action==='transmit-example'){
    if(setTransmitExercise(`example:${control.dataset.id}`))document.querySelector(`[data-action="transmit-example"][data-id="${control.dataset.id}"]`)?.focus({preventScroll:true});
  }
  if(control.dataset.action==='new-unit-transmit')setTransmitExercise('mixed');
});
document.addEventListener('change',event=>{
  if(event.target.id==='transmit-group'){
    transmitGroup=event.target.value;
    $('#transmit-examples').innerHTML=transmitExampleCards();
  }
});
