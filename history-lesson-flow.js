'use strict';

const HISTORY_METHODS = {
  evidence: {
    title: '先找证据，再下结论',
    steps: ['说清材料里直接记下了什么。', '追问它能说明到哪一步，还有没有别的解释。'],
    question: '一张未标日期的旧照片旁写着「很久以前」。要判断它拍于哪一年，先做什么？',
    choices: [
      {text:'根据照片颜色直接定年份',reply:'颜色受拍摄、保存等因素影响。先找能核对日期的记录。'},
      {text:'查看背面题记，和档案中的日期核对',correct:true,reply:'可核对的题记或档案才可能把大致线索缩小到具体年份。'},
    ],
  },
  chronology: {
    title: '先排时间，再说变化',
    steps: ['在材料上标出事件和时间。', '按发生顺序排好，再找转折前后各变了什么。'],
    question: '班史记着「2021 年扩大书架、2019 年征集书、2020 年开放借阅」。哪种顺序能说清图书角的发展？',
    choices: [
      {text:'先征集书，再开放借阅，后来扩大书架',correct:true,reply:'先把时间线排顺，才能看出从筹备到开放、再到扩大的变化。'},
      {text:'先写扩大书架，再把其余两条当作同一天的事',reply:'把几个阶段混在一起，就说不清变化。先给事件各标一个时间。'},
    ],
  },
  cause: {
    title: '先找条件，再说它怎样起作用',
    steps: ['找在事情发生前已经存在的条件。', '说出这个条件怎样促成变化。遇到好几个原因，可以分别说。'],
    question: '一条老路早已拥堵多年。新桥通车后，居民改走新路。哪一句把原因分得更清楚？',
    choices: [
      {text:'只要知道新桥通车，就解释完了',reply:'通车是给改道创造机会的事，老路一直拥堵也解释了大家为什么愿意改。'},
      {text:'长期拥堵让人想改道，新桥通车让改道成为可能',correct:true,reply:'这句话分开了长期存在的问题与后来促成变化的条件。'},
    ],
  },
  compare: {
    title: '先定同一项，再比较差别',
    steps: ['说清要比较的是哪一项。', '从两份材料里各找一条能回答同一问题的记录。'],
    question: '想比较两个地方过去的学校数量。一份写校舍数，一份写学生数，下一步怎么做？',
    choices: [
      {text:'找同一时期两地的学校数，再比较',correct:true,reply:'时间和统计对象一致，差别才有可比性。'},
      {text:'把两个数字直接比大小',reply:'校舍和学生是不同的统计对象。这两个数不能直接回答学校数量的差别。'},
    ],
  },
  geography: {
    title: '把人和事放回地图',
    steps: ['在地图上找到起点、终点和经过的地方。', '把路线与材料对照，看看不同地点各起了什么作用。'],
    question: '旅行者记了经过的三个城镇。你想说明他怎样跨过一条河，先找什么？',
    choices: [
      {text:'只看最后一站的地名',reply:'终点只能告诉你到了哪儿。要说明如何过河，还要看三个城镇和河的位置。'},
      {text:'把三个地名按行程标到有河流的地图上',correct:true,reply:'把记录和地图对齐，才能指出哪一段经过河流，再去查渡口或桥梁的线索。'},
    ],
  },
  source: {
    title: '先认出处，再决定能用它判断什么',
    steps: ['在图注或题记找作者、制作年代和材料类型。', '区分现场留下的记录与后来的摹本、纪念品或想象。'],
    question: '校史展出一幅后来绘制的建校场景图，想查建校当天的开学人数，哪份记录更合适？',
    choices: [
      {text:'根据画里的人头数直接统计',reply:'画面可能取舍、重组人物。先找当日留下而且确实记录人数的材料。'},
      {text:'查开学当天的点名册，再和校务日记核对',correct:true,reply:'把后来画的图和当日记录区分开，人数由能逐项核对的当日资料来支持。'},
    ],
  },
  policy: {
    title: '分开看写下的计划和真正做过的事',
    steps: ['圈出文件里的目标、要求或约定。', '再找执行记录，核对落实了多少、什么时候落实。'],
    question: '班会决定图书角下月每周开三天。要判断下月是不是按计划开放，哪份材料比较直接？',
    choices: [
      {text:'下一月按日期登记的开放记录',correct:true,reply:'会议记录说明当时定了什么，实际开放了几天要由之后的登记记录支持。'},
      {text:'只回看班会通过的计划',reply:'计划只能说明想做什么，其中的约定还要用实际记录核对。'},
    ],
  },
};

// Each item follows the method used to check that lesson’s first claim.
const HISTORY_METHOD_BY_LESSON = {
  g7a: ['evidence','cause','evidence','compare','evidence','cause','evidence','evidence','compare','chronology','compare','compare','chronology','source','chronology','chronology','chronology','cause','compare','source','evidence'],
  g7b: ['chronology','evidence','evidence','cause','source','geography','cause','compare','cause','chronology','chronology','source','source','source','cause','evidence','chronology','chronology','evidence','cause','chronology','evidence'],
  g8a: ['cause','cause','policy','chronology','compare','compare','compare','compare','chronology','chronology','chronology','geography','geography','cause','cause','source','chronology','compare','chronology','policy','geography','source'],
  g8b: ['source','policy','evidence','compare','policy','evidence','chronology','cause','evidence','evidence','policy','policy','compare','evidence','policy','compare','evidence','chronology','evidence','evidence','geography','source','source','evidence'],
};

const historyPreview = {id:'opening-preview', choices:[{text:'对'},{text:'错'},{text:'还拿不准'}]};
const unsavedHistorySteps = new Map();
let historyStep = 0;
let historySupplement = null;

function historyStepKey(no) {
  return practiceKey(no) + 'lesson-stage';
}

function saveHistoryStep(no, step) {
  const key = historyStepKey(no);
  if (safeSet(key, String(step))) unsavedHistorySteps.delete(key);
  else unsavedHistorySteps.set(key, step);
}

function focusHistoryStage() {
  const heading = document.querySelector('#lessonView [data-study-heading]');
  heading?.focus({preventScroll:true});
  if (innerHeight > 500) window.scrollTo({top:0,behavior:'instant'});
  else heading?.scrollIntoView({block:'start',behavior:'instant'});
}

function changeHistoryStep(no, step) {
  historyStep = step;
  saveHistoryStep(no, step);
  renderHistoryStage(no);
  focusHistoryStage();
}

function enterHistoryStage(lesson) {
  const key = historyStepKey(lesson.no);
  const stored = unsavedHistorySteps.get(key) ?? safeGet(key);
  const oldNode = pendingResumeNode;
  pendingResumeNode = null;
  const resumeIndex = lesson.nodes.indexOf(oldNode);
  const step = stored == null ? resumeIndex + 1 : Number(stored);
  historyStep = Number.isInteger(step) && step >= 0 && step <= lesson.nodes.length + 3 ? step : 0;
  renderHistoryStage(lesson.no);
}

function paintHistoryProgress(lesson, practices) {
  const steps = ['先试一个判断', ...lesson.nodes.map(node => NODES[node].title),
    practices[0] ? '核对' + practices[0].card + '的线索' : '核对判断',
    practices[1] ? '用' + practices[1].card + '试一题' : '再试一题', '把方法用到别处'];
  document.getElementById('historyStepLabel').textContent = '第 ' + (historyStep + 1) + ' / ' + steps.length + ' 步';
  document.getElementById('historyCurrentLabel').textContent = steps[historyStep];
  const list = document.getElementById('historyProgressList');
  list.replaceChildren(...steps.map((label, index) => {
    const item = document.createElement('li');
    const number = document.createElement('span');
    number.className = 'history-step-number';
    number.textContent = index + 1;
    number.setAttribute('aria-hidden', 'true');
    item.append(number, document.createTextNode(label));
    if (index === historyStep) item.setAttribute('aria-current', 'step');
    return item;
  }));
}

function historyTryButtons(item) {
  return item.choices.map((choice, index) => '<button type="button" data-history-try="' + index +
    '" aria-pressed="false">' + practiceText(choice.text) + '</button>').join('');
}

function bindHistoryTry(stage, no, item, draw) {
  const buttons = Array.from(stage.querySelectorAll('[data-history-try]'));
  function paint(record) {
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === record.selected)));
    draw(item.choices[record.selected]);
  }
  paint(readPracticeAnswer(no,item));
  buttons.forEach((button, index) => button.addEventListener('click', () => {
    const record = readPracticeAnswer(no,item);
    record.first ??= index;
    record.selected = index;
    writePracticeAnswer(no,item,record);
    if (item === historyPreview) P.setLast({type:'lesson',no});
    paint(record);
  }));
}

function renderHistoryOpening(stage, no, lesson, first) {
  const question = first ? '<article class="history-opening-task">' +
    '<section class="history-core"><h3 data-study-heading tabindex="-1">' + practiceText(first.title) + '</h3></section>' +
    '<div class="history-question-material"><h4>' + practiceText(first.card) + ' · 一条线索</h4>' + first.evidence + '</div>' +
    '<p class="history-instruction">做个初步判断，读完史料再核对。</p>' +
    '<div class="history-practice-choices is-judgment is-preview" role="group" aria-label="开场判断">' +
    historyTryButtons(historyPreview) + '</div></article>' :
    '<section class="history-core"><h3 data-study-heading tabindex="-1">先读一份材料</h3></section>';
  stage.innerHTML = question;
  const forward = paintHistoryActions(no, '看' + NODES[lesson.nodes[0]].title + '的材料', 1);
  if (first) bindHistoryTry(stage, no, historyPreview, choice => { forward.hidden = !choice; });
}

function renderHistoryReview(stage, no, practices) {
  const method = HISTORY_METHODS[HISTORY_METHOD_BY_LESSON[currentBookId][no - 1]];
  const transfer = {id:'method-transfer', choices:method.choices};
  const answered = practices.filter(item => readPracticeAnswer(no, item).first !== null).length;
  const openingCard = practices[0]?.card;
  stage.innerHTML = '<section class="history-core history-method"><h3 data-study-heading tabindex="-1">' + method.title + '</h3>' +
    (openingCard ? '<p class="history-recall">把核对' + practiceText(openingCard) + '线索的办法，用到下面的新材料。</p>' : '') + '<ol>' +
    method.steps.map(step => '<li>' + step + '</li>').join('') + '</ol></section>' +
    '<div class="history-practice-data history-transfer"><fieldset><legend>' + method.question + '</legend>' +
    '<div class="history-practice-choices">' + historyTryButtons(transfer) + '</div></fieldset>' +
    '<p class="history-practice-feedback" role="status" aria-atomic="true"></p></div>' +
    (practices.length ? '<p class="history-completion">本课随堂题已答 ' + answered + ' / ' + practices.length + '</p>' : '');
  const next = lessonByNo(no + 1);
  const forward = paintHistoryActions(no, next ? '开始下一课 · ' + next.title : '回到本册目录', null, true);
  const task = stage.querySelector('.history-transfer');
  bindHistoryTry(task, no, transfer, choice => {
    if (!choice) return;
    task.dataset.result = choice.correct ? 'correct' : 'retry';
    task.querySelector('[role="status"]').textContent = (choice.correct ? '用对了这个方法。' : '再想一步。') + choice.reply;
    updateHistoryForward(forward, choice.correct);
  });
}

function renderHistoryStage(no) {
  const lesson = lessonByNo(no);
  const materialCount = lesson.nodes.length;
  const practice = lessonPractice(no);
  const stage = document.getElementById('historyStudy');
  stage.replaceChildren();
  historyPractice.replaceChildren();
  historyPractice.hidden = true;
  lessonFoot.replaceChildren();
  paintHistoryProgress(lesson, practice);
  if (historyStep === 0) {
    renderHistoryOpening(stage, no, lesson, practice[0]);
  } else if (historyStep <= materialCount) {
    const node = lesson.nodes[historyStep - 1];
    renderHistoryMaterial(stage, node, no);
    if (historyStep === 1 && lesson.themeOrder) {
      const note = document.createElement('p');
      note.className = 'history-instruction';
      note.textContent = '本课按主题看史料，年份可能前后交错。';
      stage.prepend(note);
    }
    const nextCard = NODES[lesson.nodes[historyStep]];
    paintHistoryActions(no, nextCard ? '看' + nextCard.title + '的材料' : '核对开场的判断', historyStep + 1);
  } else if (historyStep <= materialCount + 2) {
    const questionIndex = historyStep - materialCount - 1;
    if (practice[questionIndex]) renderHistoryPractice(no, practice[questionIndex], questionIndex);
    else renderUnavailableHistoryPractice(no);
    const next = questionIndex === 0 ? practice[1] : null;
    paintHistoryActions(no, next ? '用' + next.card + '试一题' : questionIndex === 0 ? '再试一题' : '把方法用到别处', historyStep + 1,
      !historyPractice.querySelector('[data-result="correct"]'));
  } else {
    renderHistoryReview(stage, no, practice);
  }
}

function updateHistoryForward(button, ready) {
  button.classList.toggle('history-skip', !ready);
  button.textContent = ready ? button.dataset.nextLabel : '暂时跳过';
}

function paintHistoryActions(no, label, next, waiting = false) {
  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'history-action';
  main.dataset.studyNext = '';
  main.dataset.nextLabel = label;
  updateHistoryForward(main, !waiting);
  main.addEventListener('click', () => {
    if (next != null) changeHistoryStep(no, next);
    else go(lessonByNo(no + 1) ? '/lesson/' + (no + 1) : '/');
  });
  lessonFoot.append(main);
  if (historyStep > 0) {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'history-secondary';
    back.dataset.studyBack = '';
    back.textContent = '← 上一步';
    back.addEventListener('click', () => changeHistoryStep(no, historyStep - 1));
    lessonFoot.append(back);
  }
  return main;
}

function renderHistoryMaterial(container, node, no) {
  const card = NODES[node];
  const meta = IMG_META[card.id];
  const badge = meta ? evidenceOf(card, meta.kind) : null;
  const date = card.approx && !card.yearLabel.includes('约') ? card.yearLabel + '（约）' : card.yearLabel;
  container.innerHTML = '<article class="history-material"><p class="history-date">' +
    practiceText(date) + '</p><h3 data-study-heading tabindex="-1">' + practiceText(card.title) + '</h3>' +
    (NODE_META[node] ? '<p class="history-date">' + practiceText(NODE_META[node]) + '</p>' : '') +
    '<div class="history-material-body' + (meta ? ' has-image' : '') + '">' +
    '<div class="history-reading"><p>' + practiceText(card.story) + '</p><ul>' +
    card.points.map(point => '<li>' + practiceText(point) + '</li>').join('') + '</ul></div>' +
    (meta ? '<figure class="history-picture"><img src="' + practiceText(toWebp(meta.img)) + '" alt="' + practiceText(meta.name) + '">' +
      '<figcaption><strong>' + practiceText(meta.name) + '</strong> · ' + practiceText(badge.label) + '<br>' +
      practiceText(meta.era) + ' · ' + practiceText(meta.source) + ' · ' + practiceText(meta.kind) +
      '</figcaption><button class="history-secondary" type="button" data-history-zoom>放大读图</button></figure>' : '') + '</div></article>';
  const article = container.firstElementChild;
  const img = article.querySelector('img');
  if (img) {
    const zoom = article.querySelector('[data-history-zoom]');
    zoom.addEventListener('click', () => openHistoryImageZoom(img, zoom));
    const fallback = document.createElement('p');
    fallback.className = 'history-image-error';
    fallback.hidden = true;
    fallback.textContent = '这张图暂时没有加载出来，可以先读史料文字。';
    const onError = () => {
      if (img.getAttribute('src') !== meta.img) img.src = meta.img;
      else {img.hidden = true;fallback.hidden = false;zoom.hidden = true;}
    };
    img.addEventListener('error', onError);
    img.after(fallback);
    if (img.complete && !img.naturalWidth) onError();
  }
  addHistorySupplement(article, node);
  P.setLast({type:'lesson',no,nodeIndex:node,nodeTitle:card.title});
  if (!P.isNodeSeen(node)) {
    P.markNodeSeen(node);
    maybeLessonDone(no);
  }
}

function addHistorySupplement(article, node) {
  const topic = TOPIC_MAP[node];
  const model = NODE_3D_MAP[node];
  const threads = THREAD_MAP[NODES[node].id] || [];
  if (!topic && !model && !OBSERVE_MAP[node] && !threads.length) return;
  const extras = document.createElement('details');
  extras.className = 'history-extras';
  extras.innerHTML = '<summary>延伸观察（可选）</summary>';
  if (OBSERVE_MAP[node]) {
    const observe = document.createElement('div');
    observe.className = 'observe history-observe';
    extras.append(observe);
    renderObserve(node, observe);
  }
  function add(title, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-secondary';
    button.textContent = title;
    button.addEventListener('click',() => {
      historySupplement = {book:currentBookId,no:currentLessonNo};
      action();
    });
    extras.append(button);
  }
  if (topic) add(TOPIC_NAME[topic], () => openTopic(topic));
  if (model) add(S3D_META[model].name, () => open3D(model,node));
  threads.forEach(id => {
    const thread = THREADS.find(item => item.id === id);
    if (thread) add('跨课话题 · ' + thread.name, () => go('/thread/' + id));
  });
  article.append(extras);
}

function returnHistorySupplement() {
  if (!historySupplement) return false;
  go('/book/' + historySupplement.book + '/lesson/' + historySupplement.no);
  return true;
}
