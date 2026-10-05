/* АвторLab: простой интерфейс без библиотек и сервера.
   Экран зависит от шага: главная → тест → памятка → тест → результат. */
const D = AuthorLabData, C = AuthorLabCore;
const app = document.querySelector('#app');
const STORE = 'authorlab.records.v1', SESSION = 'authorlab.session.v1';
let memory = new Map(), storageOK = true, session = null, records = [];
const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = n => n == null ? '—' : n.toLocaleString('ru-RU',{maximumFractionDigits:1});
const signed = n => n == null ? '—' : (n > 0 ? '+' : '') + number(n);
function notice(message) {const el=document.querySelector('#notice');el.textContent=message;el.hidden=false;}
function read(key) {
  if (!storageOK && memory.has(key)) return memory.get(key);
  try {return JSON.parse(localStorage.getItem(key) || 'null');}
  catch {storageOK=false;return memory.get(key) || null;}
}
function write(key,value) {
  memory.set(key,value);
  try {localStorage.setItem(key,JSON.stringify(value));}
  catch {storageOK=false;notice('Браузер не смог сохранить данные. Скачайте файл результата перед закрытием страницы.');}
}
function remove(key) {memory.delete(key);try{localStorage.removeItem(key);}catch{storageOK=false;}}
function loadRecords() {
  const raw=read(STORE);
  if(raw===null)return [];
  if(!Array.isArray(raw)){notice('Сохранённые данные повреждены. Не очищайте браузер; используйте резервную копию JSON.');return [];}
  const result=[],codes=new Set();let invalid=0;
  for(const item of raw){try{const r=C.validateRecord(item);if(!codes.has(r.code)){result.push(r);codes.add(r.code);}}catch{invalid++;}}
  if(invalid)notice('Некоторые сохранённые записи не прошли проверку и не включены в сводку.');
  return result;
}
function validSession(s) {
  if(!s||s.version!==D.version||!/^AL-[A-F0-9]{16}$/.test(s.code)||!D.groups.includes(s.group)||!['main','pilot'].includes(s.mode)||
    !Array.isArray(s.order)||s.order.length!==16||new Set(s.order).size!==16||
    s.order.some((id,i)=>!C.byId.has(id)||C.byId.get(id).stage!==(i<8?1:2))||
    !Array.isArray(s.answers)||s.answers.length>16||!s.answers.every((a,i)=>C.validAnswer(a)&&a.id===s.order[i])||typeof s.memoRead!=='boolean')return false;
  return s.answers.length<=8 || s.memoRead;
}
function show(html) {app.innerHTML=html;app.focus({preventScroll:true});window.scrollTo(0,0);}
function button(id,text,secondary=false){return `<button id="${id}" class="button ${secondary?'secondary':''}" type="button">${text}</button>`;}
function newCode() {
  let code;
  do {const bytes=new Uint8Array(8);crypto.getRandomValues(bytes);code='AL-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();}while(records.some(r=>r.code===code));
  return code;
}
function home() {
  session=read(SESSION);
  if(session&&!validSession(session)){notice('Незавершённое прохождение повреждено. Начните новое прохождение.');session=null;}
  show(`<section class="hero"><div><p class="eyebrow">ЧЕЛОВЕК ИЛИ ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ?</p><h1>У стихотворения<br>есть автор.<br><em>Сможете его узнать?</em></h1><p class="lead">16 коротких фрагментов. Два этапа. Один эксперимент о том, как мы читаем и принимаем решения.</p><div class="chips"><span>10–15 минут</span><span>Анонимно</span><span>Без оценки</span></div></div><div class="hero-art" aria-hidden="true"><span class="art-label">АвторLab / 01</span><span class="quote-mark">“</span><p>Внимание к слову.<br>Вопрос к образу.<br>Свой ответ.</p><span class="art-line"></span><span class="art-bottom">ЧТЕНИЕ КАК ИССЛЕДОВАНИЕ</span></div></section>
  <section class="steps"><div><b>01</b><span>Первое впечатление<small>8 фрагментов без подсказок</small></span></div><div><b>02</b><span>Лингвистическая памятка<small>Вопросы к тексту</small></span></div><div><b>03</b><span>Внимательное чтение<small>8 новых фрагментов</small></span></div></section>
  <section class="card start-card"><div><p class="eyebrow">ПЕРЕД НАЧАЛОМ</p><h2>Попробуйте определить источник</h2><p>Часть фрагментов написана русскими поэтами, часть создана ИИ. Для каждого выберите источник, уверенность и главную причину. Не ищите строки в интернете и не обсуждайте ответы.</p><p class="muted">Имя указывать не нужно. Ошибки не влияют на оценку по предмету.</p></div><form id="start-form"><label for="group">Ваша группа</label><select id="group" required><option value="">Выберите группу</option>${D.groups.map(g=>`<option>${g}</option>`).join('')}</select><label for="mode">Тип прохождения</label><select id="mode"><option value="main">Основное исследование</option><option value="pilot">Технический пилот</option></select><label class="check"><input id="consent" type="checkbox" required><span>Участвую добровольно и согласен(на) на использование анонимных ответов в обобщённом виде.</span></label><button class="button" type="submit">Начать эксперимент <span>→</span></button>${session?button('resume','Продолжить сохранённое прохождение',true):''}</form></section>
  <div class="bottom-row"><p>Ни один языковой признак не доказывает авторство сам по себе.</p>${button('research','Панель исследователя',true)}</div>`);
  document.querySelector('#start-form').onsubmit=e=>{
    e.preventDefault();if(session&&!confirm('Начать заново? Незавершённые ответы будут заменены.'))return;
    session={version:D.version,code:newCode(),group:document.querySelector('#group').value,mode:document.querySelector('#mode').value,memoRead:false,answers:[],order:[...C.shuffle(D.poems.filter(p=>p.stage===1).map(p=>p.id)),...C.shuffle(D.poems.filter(p=>p.stage===2).map(p=>p.id))]};
    write(SESSION,session);route();
  };
  document.querySelector('#research').onclick=()=>research();
  if(session)document.querySelector('#resume').onclick=route;
}
function route(){if(session.answers.length===16)finish();else if(session.answers.length===8&&!session.memoRead)memo();else question();}
function question() {
  const i=session.answers.length,stage=i<8?1:2,poem=C.byId.get(session.order[i]);
  show(`<div class="test-top"><span class="eyebrow">ЭТАП ${stage} / ${stage===1?'ДО ПАМЯТКИ':'ПОСЛЕ ПАМЯТКИ'}</span><span class="muted">Фрагмент ${i%8+1} из 8</span></div><div class="progress" role="progressbar" aria-label="Выполнено заданий" aria-valuemin="0" aria-valuemax="16" aria-valuenow="${i}"><span style="width:${i/16*100}%"></span></div>
  <div class="question-grid"><section class="poem-card"><span class="eyebrow">ПРОЧИТАЙТЕ ФРАГМЕНТ</span><span class="poem-quote" aria-hidden="true">“</span><h1 class="sr-only">Фрагмент ${i%8+1}</h1><p class="poem">${escapeHTML(poem.text)}</p><p class="poem-caption">Прочитайте не только рифму, но и смысл.</p></section>
  <form id="answer-form" class="card answer-card"><fieldset><legend>Кто создал этот текст?</legend><div class="choices"><label><input type="radio" name="choice" value="human" required><span>Человек</span></label><label><input type="radio" name="choice" value="ai" required><span>Искусственный интеллект</span></label></div></fieldset>
  <fieldset><legend>Насколько вы уверены?</legend><div class="confidence">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="confidence" value="${n}" required><span>${n}</span></label>`).join('')}</div><div class="scale-labels"><span>Предполагаю</span><span>Полностью уверен(а)</span></div></fieldset>
  <label for="reason">Главная причина выбора</label><select id="reason" name="reason" required><option value="">Выберите причину</option>${D.reasons.map(r=>`<option>${r}</option>`).join('')}</select><label class="check"><input type="checkbox" name="recognized" id="recognized"><span>Узнал(а) строку или автора</span></label><button class="button" type="submit">${i===7?'Перейти к памятке':i===15?'Завершить эксперимент':'Следующий фрагмент'} <span>→</span></button><p class="muted small">Правильные ответы не показываются между этапами.</p></form></div><div class="bottom-row"><span class="muted small">Ваш код: ${session.code}</span>${button('pause','Продолжить позже',true)}</div>`);
  document.querySelector('#reason').onchange=e=>{if(e.target.value==='Узнал строку или автора')document.querySelector('#recognized').checked=true;};
  document.querySelector('#answer-form').onsubmit=e=>{
    e.preventDefault();const form=new FormData(e.target);
    const answer={id:poem.id,choice:form.get('choice'),confidence:Number(form.get('confidence')),reason:form.get('reason'),recognized:form.has('recognized')};
    if(!C.validAnswer(answer)){notice('Если причиной было узнавание, отметьте «Узнал(а) строку или автора».');return;}
    session.answers.push(answer);write(SESSION,session);route();
  };
  document.querySelector('#pause').onclick=()=>{write(SESSION,session);home();};
}
function memo() {
  show(`<section class="memo-header"><p class="eyebrow">МЕЖДУ ДВУМЯ ЭТАПАМИ</p><h1>От впечатления<br>к наблюдению.</h1><p class="lead">Первый этап завершён. Перед новым набором прочитайте памятку: она помогает задавать вопросы, а не угадывать по одному признаку.</p></section><div class="memo-grid">${D.memo.map(([title,text],i)=>`<article class="card"><span class="memo-number">0${i+1}</span><h2>${title}</h2><p>${text}</p></article>`).join('')}</div><div class="callout"><b>Признак — ещё не доказательство.</b><p>И человек, и ИИ могут использовать ровную рифму, клише или неожиданный образ. Рассматривайте признаки вместе.</p></div><form id="memo-form" class="memo-action"><label class="check"><input type="checkbox" required><span>Я прочитал(а) памятку и готов(а) к восьми новым фрагментам.</span></label><button class="button" type="submit">Начать второй этап →</button></form>`);
  document.querySelector('#memo-form').onsubmit=e=>{e.preventDefault();session.memoRead=true;write(SESSION,session);question();};
}
function download(name,content,type) {
  const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportJSON(list,name){download(name,JSON.stringify({format:'authorlab-results',version:D.version,records:list},null,2),'application/json');}
function finish() {
  const record=C.validateRecord({...session,finishedAt:new Date().toISOString()});
  // Повторный вызов finish не создаёт второе прохождение с тем же кодом.
  records=loadRecords();const existing=records.find(r=>r.code===record.code);
  if(!existing){records.push(record);write(STORE,records);}
  const final=existing||record;remove(SESSION);session=null;result(final);
}
function statsCards(items){return `<div class="stats">${items.map(([label,value,unit])=>`<div class="card stat"><span>${label}</span><strong>${value}<small>${unit||''}</small></strong></div>`).join('')}</div>`;}
function result(r) {
  const m=C.metrics(r);
  show(`<section class="result-header"><p class="eyebrow">ЭКСПЕРИМЕНТ ЗАВЕРШЁН</p><h1>Спасибо за<br><em>внимательное чтение.</em></h1><p class="lead">Это результат на данном наборе фрагментов. Он не является оценкой ваших знаний русского языка.</p></section>${statsCards([['До памятки',number(m.a1),'%'],['После памятки',number(m.a2),'%'],['Изменение',signed(m.delta),' п.п.']])}<section class="card"><h2>Что изменилось?</h2><p>${m.delta>0?'Во втором этапе ваша точность выросла.':m.delta<0?'Во втором этапе ваша точность снизилась.':'Точность двух этапов совпала.'} Разница может зависеть и от сложности фрагментов. По одному прохождению нельзя доказать полезность памятки.</p><p>Без узнанных строк: <b>${number(m.unrecognized)}${m.unrecognized===null?'':' %'}</b>. Верно распознано человеческих текстов: ${number(m.human)} %, текстов ИИ: ${number(m.ai)} %.</p><p class="muted">${storageOK?'Результат сохранён в этом браузере.':'Результат доступен в памяти страницы. Обязательно скачайте его.'} Для передачи исследователю скачайте JSON. Источники будут обсуждаться после завершения общего сбора.</p><div class="toolbar">${button('personal-json','Скачать результат JSON')}${button('personal-csv','Скачать 16 ответов CSV',true)}${button('home','На главную',true)}</div><p class="muted small">Код: ${r.code} · ${r.mode==='pilot'?'Технический пилот':'Основная выборка'}</p></section>`);
  document.querySelector('#personal-json').onclick=()=>exportJSON([r],`authorlab-${r.code}.json`);
  document.querySelector('#personal-csv').onclick=()=>download(`authorlab-${r.code}.csv`,C.answersCSV([r]),'text/csv;charset=utf-8');
  document.querySelector('#home').onclick=home;
}
function research(filter='main') {
  records=loadRecords();const selected=records.filter(r=>filter==='all'||r.mode===filter),s=C.aggregate(selected);
  show(`<div class="bottom-row"><p class="eyebrow">ПАНЕЛЬ ИССЛЕДОВАТЕЛЯ</p>${button('home','На главную',true)}</div><h1 class="panel-title">От ответов<br>к результатам.</h1><div class="callout"><b>Данные этого браузера</b><p>Ответы с других устройств не поступают автоматически. Соберите JSON-файлы участников и импортируйте их здесь. Одинаковый код не добавляется дважды.</p></div><div class="toolbar"><label for="filter">Выборка</label><select id="filter">${[['main','Основная'],['pilot','Технический пилот'],['all','Все записи']].map(([v,t])=>`<option value="${v}" ${filter===v?'selected':''}>${t}</option>`).join('')}</select><label class="button secondary upload">Импорт JSON<input id="import" type="file" accept=".json,application/json" multiple></label>${button('backup','Резервная копия всех записей',true)}</div><p id="import-message" role="status"></p>
  ${statsCards([['Завершено',s.count,''],['Средняя A₁',number(s.a1),'%'],['Средняя A₂',number(s.a2),'%'],['Среднее изменение',signed(s.delta),' п.п.']])}
  <section class="card"><h2>Сравнение этапов</h2><div class="bar-row"><span>До памятки</span><div class="bar"><span style="width:${s.a1||0}%"></span></div><b>${number(s.a1)} %</b></div><div class="bar-row"><span>После памятки</span><div class="bar"><span style="width:${s.a2||0}%"></span></div><b>${number(s.a2)} %</b></div><p>Выросла: <b>${s.improved}</b> · Снизилась: <b>${s.declined}</b> · Не изменилась: <b>${s.unchanged}</b></p><p class="muted">Медиана изменения: ${signed(s.median)} п.п. · Диапазон: ${number(s.min)}…${number(s.max)} п.п.</p><p class="muted">${s.count<30?'В основной выборке желательно не менее 30 участников. Небольшую выборку описывайте как пилот.':'Показатели описывают эту выборку; причинный эффект памятки не доказан.'}</p></section>
  <section class="card"><h2>Дополнительные показатели</h2><div class="detail-grid"><p>Человеческие тексты<b>${number(s.human)} %</b></p><p>Тексты ИИ<b>${number(s.ai)} %</b></p><p>Без узнанных строк<b>${number(s.unrecognized)}${s.unrecognized===null?'':' %'}</b></p><p>Уверенность верных ответов<b>${number(s.confidenceCorrect)} / 5</b></p><p>Уверенность ошибок<b>${number(s.confidenceWrong)} / 5</b></p></div></section>
  <section class="card"><h2>Сравнение групп</h2><div class="table-scroll"><table><thead><tr><th>Группа</th><th>Количество</th><th>A₁, %</th><th>A₂, %</th><th>ΔA, п.п.</th></tr></thead><tbody>${D.groups.map(g=>{const a=C.aggregate(selected.filter(r=>r.group===g));return `<tr><td>${g}</td><td>${a.count}</td><td>${number(a.a1)}</td><td>${number(a.a2)}</td><td>${signed(a.delta)}</td></tr>`;}).join('')}</tbody></table></div></section>
  <section class="card"><h2>Причины выбора</h2><div class="table-scroll"><table><thead><tr><th>Причина</th><th>Ответов</th><th>Верно, %</th></tr></thead><tbody>${D.reasons.map(reason=>{const answers=selected.flatMap(r=>r.answers).filter(a=>a.reason===reason);const correct=answers.filter(a=>a.choice===C.byId.get(a.id).source).length;return `<tr><td>${reason}</td><td>${answers.length}</td><td>${answers.length?number(correct/answers.length*100):'—'}</td></tr>`;}).join('')}</tbody></table></div></section>
  <section class="card"><div class="bottom-row"><h2>Завершённые прохождения</h2><div class="toolbar">${button('summary','Сводка CSV',true)}${button('answers','Все ответы CSV',true)}</div></div><div class="table-scroll"><table><thead><tr><th>Код</th><th>Группа</th><th>A₁, %</th><th>A₂, %</th><th>ΔA, п.п.</th></tr></thead><tbody>${selected.map(r=>{const m=C.metrics(r);return `<tr><td class="code">${escapeHTML(r.code)}</td><td>${escapeHTML(r.group)}</td><td>${number(m.a1)}</td><td>${number(m.a2)}</td><td>${signed(m.delta)}</td></tr>`;}).join('')||'<tr><td colspan="5">Пока нет завершённых прохождений. Данные не заполняются примерами.</td></tr>'}</tbody></table></div></section>
  <section class="card"><h2>Разбор источников</h2><p>Откройте ключ только после завершения сбора данных. Панель не защищена паролем: это локальный инструмент учителя.</p>${button('key','Показать ключ после сбора',true)}<div id="key-content" hidden></div></section>`);
  document.querySelector('#home').onclick=home;
  document.querySelector('#filter').onchange=e=>research(e.target.value);
  document.querySelector('#backup').onclick=()=>exportJSON(records,'authorlab-backup.json');
  document.querySelector('#summary').onclick=()=>download('authorlab-summary.csv',C.summaryCSV(selected),'text/csv;charset=utf-8');
  document.querySelector('#answers').onclick=()=>download('authorlab-answers.csv',C.answersCSV(selected),'text/csv;charset=utf-8');
  document.querySelector('#key').onclick=()=>{
    if(!confirm('Общий сбор данных завершён? Ключ раскроет источники всех фрагментов.'))return;
    const el=document.querySelector('#key-content');el.hidden=false;
    el.innerHTML=D.poems.map(p=>`<article class="key-item"><b>${p.id} · ${p.source==='human'?escapeHTML(p.author)+' — '+escapeHTML(p.title):'Сгенерировано ИИ для этой версии'}</b><p class="key-poem">${escapeHTML(p.text)}</p>${p.url?`<a href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer">Источник текста ↗</a>`:''}</article>`).join('');
  };
  document.querySelector('#import').onchange=async e=>{
    let added=0,duplicates=0,conflicts=0;const errors=[];
    records=loadRecords();
    for(const file of e.target.files){
      try {
        if(file.size>5*1024*1024)throw new Error('Файл больше 5 МБ.');
        const data=JSON.parse(await file.text());
        if(data.format!=='authorlab-results'||data.version!==D.version||!Array.isArray(data.records)||data.records.length>1000)throw new Error('Неизвестный формат или версия.');
        // Весь файл проверяется до добавления: частичный импорт исключён.
        const incoming=data.records.map(C.validateRecord);
        for(const r of incoming){const found=records.find(old=>old.code===r.code);if(found){
          if(JSON.stringify(found)===JSON.stringify(r))duplicates++;else conflicts++;
        }else{records.push(r);added++;}}
      }catch(error){errors.push(file.name+': '+error.message);}
    }
    if(added)write(STORE,records);
    research(filter);document.querySelector('#import-message').textContent=`Добавлено: ${added}. Дубликатов: ${duplicates}. Конфликтов кода (оставлены прежние записи): ${conflicts}. ${errors.join(' ')}`;
  };
}
records=loadRecords();
if(!storageOK)notice('Постоянное сохранение недоступно. Скачивайте результаты перед закрытием страницы.');
home();
