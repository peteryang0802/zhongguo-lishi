'use strict';

function updateHistoryCatalogExtras() {
  const catalog = document.getElementById('historyCatalogExtras');
  const list = document.getElementById('historyExtrasList');
  const groups = [
    ['动手专题', 'activity', Object.entries(TOPIC_NAME)],
    ['跨课话题', 'thread', THREADS.map(({id,name})=>[id,name])],
    ['3D 观察', '3d', Object.entries(S3D_META).map(([id,scene])=>[id,scene.name])],
  ];
  list.replaceChildren();
  for (const [name, kind, entries] of groups) {
    if (!entries.length) continue;
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = name;
    const links = entries.map(([id,label])=>{
      const link = document.createElement('a');
      link.href = '#/book/' + currentBookId + '/' + kind + '/' + id;
      link.textContent = label;
      return link;
    });
    section.append(heading, ...links);
    list.append(section);
  }
  catalog.hidden = !list.childElementCount;
  catalog.open = false;
}

function historyCompanionLayout(view, content, title, labels, step) {
  let layout = content.parentElement;
  if (!layout.classList.contains('history-companion-layout')) {
    const heading = document.createElement('h2');
    heading.className = 'history-companion-title';
    layout = document.createElement('div');
    layout.className = 'history-layout history-companion-layout';
    const side = document.createElement('aside');
    side.className = 'history-progress';
    side.setAttribute('aria-label', '学习进度');
    side.innerHTML = '<h3>学习进度</h3><p class="history-position"><span></span><span></span></p><ol role="list"></ol>';
    view.insertBefore(heading, content);
    content.before(layout);
    layout.append(side, content);
    content.classList.add('history-content');
  }
  view.querySelector('.history-companion-title').textContent = title;
  const side = layout.querySelector('.history-progress');
  const position = side.querySelector('.history-position');
  position.children[0].textContent = '第 ' + (step + 1) + ' / ' + labels.length + ' 步';
  position.children[1].textContent = labels[step];
  side.querySelector('ol').replaceChildren(...labels.map((label, index) => {
    const item = document.createElement('li');
    const marker = document.createElement('span');
    marker.className = 'history-step-number';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = index + 1;
    item.append(marker, document.createTextNode(label));
    if (index === step) item.setAttribute('aria-current', 'step');
    return item;
  }));
}

function historyCompanionActions(container, back, nextLabel, next) {
  const make = (label, primary, handler) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = primary ? 'history-action' : 'history-secondary';
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  };
  container.replaceChildren();
  if (next) {
    const button = make(nextLabel, true, next);
    button.dataset.companionNext = '';
    container.append(button);
  }
  if (back) {
    const button = make('← 上一步', false, back);
    button.dataset.companionBack = '';
    container.append(button);
  }
  container.hidden = !container.childElementCount;
}

function focusHistoryCompanion(element) {
  if (!element) return;
  element.tabIndex = -1;
  element.focus({preventScroll:true});
  if (innerHeight > 500) window.scrollTo({top:0,behavior:'instant'});
  else element.scrollIntoView({block:'start',behavior:'instant'});
}

const HISTORY_TOPIC_STEPS = {
  paper: {
    title: '蔡伦以前，汉朝人真的没有纸吗？',
    labels: ['挑一件能作证的材料','分清有纸与改进造纸','用新残片判断有没有纸','说清一张纸不能证明什么','记下辨证办法','核对另一份出土档案'],
    parts: [
      ['.paper-claim','.evidence-grid','.ev-ask','.ev-answers','#evFeedback'],
      ['#cailunDeep'],
      ['#paperTransfer'],
      ['#paperTransfer'],
      ['#paperWarmup','#paperReset','.companion-method'],
      ['#paperEvidencePair'],
    ],
    limit: () => paperEv !== true ? 0 : paperQ1 !== true ? 2 : paperQ2 !== true ? 3 : 5,
    method: '先辨认东西是什么，再核对它的年代。出土一张麻纸，可以说明那个时期已有纸；要证明纸张是否普及，还要找不同地方的出土记录。',
  },
  tuen: {
    title: '一个王国，分完以后，谁说了算？',
    labels: ['分一次地，观察归属','沿管辖线找依据','说清变了哪项权力','读新文书，选归属和依据'],
    parts: [
      ['.question','#btnRow','.stage','#hintAfter','#belong'],
      ['#ruleCompare'],
      ['#reveal','#longview','.companion-method'],
      ['#tuenTransfer'],
    ],
    limit: () => tuenJudge === true ? 3 : seenKing && seenHou ? 1 : 0,
    method: '判断权力从哪里移到哪里，要看谁有权批、谁直接管。图上地块的大小仅作示意，新的侯国归汉郡管才是变化。',
  },
  silk: {
    title: '一匹丝绸，怎么走到欧洲？',
    labels: ['送丝绸走一条路','辨认两方向的交换','对照两趟路线','用一页新商路记录验证'],
    parts: [
      ['.companion-map-details','#silkMap','#silkNow','#silkChoices'],
      ['#silkReturn'],
      ['#silkCompare','#silkGan','#silkReset','.companion-method'],
      ['#silkEvidencePair'],
    ],
    limit: () => silkTrials.length && document.getElementById('silkReturn').classList.contains('show') ? silkTrials.length >= 2 ? 3 : 2 : 0,
    method: '看贸易路线时，逐站追踪谁把货交给了谁，再分开看往西去与往东来的东西。换一条路线，对比哪些环节相同，哪些不同。',
  },
};

let companionTopicKey = null;
let companionTopicStep = 0;
const mountedTopicPanes = new Set();

function prepareHistoryTopic(pane, key) {
  if (mountedTopicPanes.has(pane)) return;
  mountedTopicPanes.add(pane);
  pane.classList.add('history-companion-topic');
  pane.querySelectorAll(':is(.question,.exp-card) > :is(h2,.tag)').forEach(node => { node.hidden = true; });
  const method = document.createElement('p');
  method.className = 'history-method companion-method';
  method.textContent = HISTORY_TOPIC_STEPS[key].method;
  pane.append(method);
  const foot = document.createElement('div');
  foot.className = 'lesson-foot companion-actions';
  pane.append(foot);
  if (key === 'silk') {
    const details = document.createElement('details');
    details.className = 'companion-map-details';
    const summary = document.createElement('summary');
    summary.textContent = '查看路线示意与史料范围';
    const orientation = pane.querySelector('.silk-orient');
    const explanation = pane.querySelector('.silk-schematic');
    orientation.before(details);
    details.append(summary, pane.querySelector('#silkExp > p'), orientation, explanation);
  }
  if (key === 'silk' || key === 'paper') {
    const transfer = document.createElement('section');
    transfer.id = key + 'EvidencePair';
    foot.before(transfer);
  }
  if (key === 'tuen') {
    foot.after(pane.querySelector('#resetBtn'));
  }
}

function enterHistoryCompanionTopic(key) {
  companionTopicKey = key;
  const view = document.getElementById('topicView');
  const panes = view.querySelectorAll('.topic-pane');
  let content = view.querySelector('.history-topic-content');
  if (!content) {
    content = document.createElement('div');
    content.className = 'history-topic-content';
    panes[0].before(content);
    content.append(...panes);
  }
  const pane = document.getElementById('pane-' + key);
  prepareHistoryTopic(pane, key);
  const saved = store.topicStepOf('companion:' + key)?.step;
  const limit = HISTORY_TOPIC_STEPS[key].limit();
  companionTopicStep = Number.isInteger(saved) ? Math.min(Math.max(saved, 0), limit) : limit ? Math.min(limit, 2) : 0;
  updateHistoryCompanionTopic();
}

function changeHistoryCompanionTopic(step, focus = true) {
  companionTopicStep = step;
  store.setTopicStepOf('companion:' + companionTopicKey,{step});
  updateHistoryCompanionTopic();
  if (focus) {
    const pane = document.getElementById('pane-' + companionTopicKey);
    focusHistoryCompanion(pane.querySelector('.companion-stage-heading'));
  }
}

function updateHistoryCompanionTopic() {
  if (!companionTopicKey || !document.getElementById('topicView').classList.contains('active')) return;
  const key = companionTopicKey;
  const pane = document.getElementById('pane-' + key);
  const spec = HISTORY_TOPIC_STEPS[key];
  const step = companionTopicStep;
  const active = new Set(spec.parts[step]);
  const parts = new Set(spec.parts.flat());
  for (const selector of parts) {
    const node = pane.querySelector(selector);
    if (node) node.hidden = !active.has(selector);
  }
  let heading = pane.querySelector('.companion-stage-heading');
  if (!heading) {
    heading = document.createElement('h3');
    heading.className = 'companion-stage-heading';
    pane.prepend(heading);
  }
  heading.textContent = spec.labels[step];
  if (key === 'paper' && (step === 2 || step === 3)) {
    document.getElementById('tq1').hidden = step !== 2;
    document.getElementById('tq2').hidden = step !== 3;
    paintPaperTransferFeedback(step - 2);
  }
  if (key === 'tuen') {
    const reset = pane.querySelector('#resetBtn');
    reset.hidden = step !== spec.labels.length - 1 || !['independent','supported'].includes(tuenTransferState(tuenTransfer));
  }
  historyCompanionLayout(document.getElementById('topicView'), pane.parentElement, spec.title, spec.labels, step);
  const finalStep = step === spec.labels.length - 1;
  const replay = key === 'silk' && step === 2 && silkTrials.length < 2;
  const actions = pane.querySelector('.companion-actions');
  const back = step > 0 ? () => changeHistoryCompanionTopic(step - 1) : null;
  if ((key === 'silk' || key === 'paper') && finalStep) {
    renderHistoryEvidencePair(pane.querySelector('#' + key + 'EvidencePair'), HISTORY_TOPIC_TRANSFER[key], key + '-evidence', done => {
      historyCompanionActions(actions, back, '完成专题', done ? () => { markTopicDone(key); closeTopic(); } : null);
    });
    return;
  }
  const tuenPass = key === 'tuen' && finalStep && ['independent','supported'].includes(tuenTransferState(tuenTransfer));
  const next = replay ? () => {
    resetForAnother();
    changeHistoryCompanionTopic(0);
  } : finalStep ? key === 'tuen' ? tuenPass ? () => { markTopicDone('tuen'); closeTopic(); } : null : closeTopic
    : step < spec.limit() ? () => changeHistoryCompanionTopic(step + 1) : null;
  historyCompanionActions(actions, back, replay ? '试另一条路线' : finalStep ? '完成专题' : spec.labels[step + 1], next);

}

function bindHistoryCompanionTopics() {
  document.getElementById('topicView').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !companionTopicKey) return;
    if (['resetBtn','paperReset','silkReset'].includes(button.id)) {
      changeHistoryCompanionTopic(0);
    } else if (button.id === 'silkEnd') {
      changeHistoryCompanionTopic(1);
    } else if (button.matches('.ev-answer,.t-answer,.plot,.rc-answer,[data-tuen-line],[data-tuen-conclusion],[data-tuen-proof]')) {
      updateHistoryCompanionTopic();
    }
  });
}

let paperTransferReplies = [null, null];
function paintPaperTransferFeedback(index) {
  const selected = index === 0 ? paperQ1 : paperQ2;
  tFeedback.className = 't-feedback';
  tFeedback.textContent = '';
  if (typeof selected !== 'boolean') return;
  tFeedback.classList.add('show', selected ? 'ok' : 'no');
  tFeedback.textContent = paperTransferReplies[index] || (index === 0
    ? selected ? '这张麻纸比蔡伦早，能支持西汉已经有纸。' : '再核对麻纸的年代。出土一张纸说明有纸，还不足以说明普及。'
    : selected ? '一张纸不足以说明当时有多少人在用。' : '这件材料已标明是麻纸。想一想，出土一张能不能说明普及。');
}

let companionSceneStep = 0;
const HISTORY_SCENE_TASKS = {
  coins: [['对照正面的钱文',[0,1]],['观察两枚钱的厚度',[3]],['翻到背面核对形制',[2]]],
  dujiangyan: [['看三处怎样配合',[3,1]],['沿鱼嘴找内江和外江',[0]],['看宝瓶口怎样引水',[2]]],
};

function startHistoryCompanionScene(key, preserve) {
  const saved = store.topicStepOf('companion:3d:' + key)?.step;
  companionSceneStep = preserve ? companionSceneStep :
    Number.isInteger(saved) && HISTORY_SCENE_TASKS[key][saved] ? saved : 0;
  paintHistoryCompanionScene(key);
}

function paintHistoryCompanionScene(key) {
  const tasks = HISTORY_SCENE_TASKS[key];
  const [label, indices] = tasks[companionSceneStep];
  const scope = document.getElementById('view3d');
  const notes = scope.querySelector('#notes3d');
  const buttons = scope.querySelector('#viewBtns3d');
  const question = key === 'coins' ? '两枚钱哪里相同，哪里不同？' : '都江堰怎样分水、排沙和引水？';
  historyCompanionLayout(scope, scope.querySelector('.s3d-wrap'), question, tasks.map(task => task[0]), companionSceneStep);
  const heading = document.createElement('h3');
  heading.className = 'companion-stage-heading';
  heading.textContent = label;
  const blocks = indices.map(i => {
    const note = S3D_UI[key].notes[i];
    const article = document.createElement('article');
    article.className = 's3d-note';
    article.innerHTML = '<h4>' + practiceText(note.title) + '</h4><p>' + practiceText(note.text) + '</p>';
    if (note.cmp) {
      const chips = document.createElement('div');
      chips.className = 'cmp';
      chips.innerHTML = note.cmp.map(chip=>'<span>'+practiceText(chip)+'</span>').join('');
      article.append(chips);
    }
    return article;
  });
  const fallback = document.getElementById('historySceneFallback');
  fallback.src = './assets/scene-' + key + '-' + companionSceneStep + '.webp';
  fallback.alt = '模型静态画面：' + label;
  scope.querySelector('#back3dLesson').hidden = Boolean(historySupplement || fromNode3d != null || companionSceneStep !== tasks.length - 1);
  notes.replaceChildren(heading, ...blocks);
  const shift = delta => {
    companionSceneStep += delta;
    store.setTopicStepOf('companion:3d:' + key,{step:companionSceneStep});
    paintHistoryCompanionScene(key);
    focusHistoryCompanion(notes.querySelector('.companion-stage-heading'));
  };
  const next = tasks[companionSceneStep + 1];
  historyCompanionActions(buttons, companionSceneStep > 0 ? () => shift(-1) : null,
    next ? next[0] : '完成观察', next ? () => shift(1) : close3D);
  current3d?.setView(S3D_UI[key].views[companionSceneStep][0]);
}

let companionThreadStep = 0;
const HISTORY_TOPIC_TRANSFER = {
  silk:{question:'看另一份商站记录。丝帛和远来香料有没有沿同一方向移动？',
    choices:['两样货都自东向西','两样货沿相反方向移动'],answer:1,
    proofs:['商站账册记羊毛与皮革的估价。','换运簿记丝帛交西去队，香料交给东去的队。','展柜标签记两种货物的现代拍摄日期。'],proof:1},
  paper:{question:'出土麻纸的新展签应写「西汉某处已有纸」，还是「西汉普遍用纸」？',
    choices:['支持西汉某处已有纸','支持西汉全国已普遍用纸'],answer:0,
    proofs:['留存旧图显示发掘区域很大。','修复记录写纸片边缘破损。','纤维检验确认是麻纸，同层材料能核对为西汉，现有记录仅这一处。'],proof:2},
};

function historyTopicEvidenceState(key) {
  const study=HISTORY_TOPIC_TRANSFER[key];
  const state=store.topicStepOf(key + '-evidence');
  if (!study || !Number.isInteger(state?.answer)) return 'unanswered';
  if (state.answer !== study.answer || (Number.isInteger(state.proof) && state.proof !== study.proof)) return 'retry';
  if (state.proof !== study.proof) return 'unanswered';
  return state.firstAnswer === study.answer && state.firstProof === study.proof ? 'independent' : 'supported';
}

const HISTORY_THREAD_METHOD = {
  money: {question:'两枚方孔铜钱，凭什么能知道它们的铸造时间不同？',choices:['方孔形状能说明年代不同','要比较各自的钱文和有日期的记录'],answer:1,
    proofs:['两枚钱都是圆形方孔，穿绳方式相近。','分别有可辨的钱文，与两个时期的出土层位记录一一对应。','展台给两枚钱标了不同大小的展示框。'],proof:1},
  reform: {question:'新旧两册官制簿放在一起，哪种结论能从它们得出？',choices:['地方官的任命权转到中枢','地方官自己改了朝服服色'],answer:0,
    proofs:['新旧两册在同一个官署收藏。','官员画像只有一处服色不同。','旧册由地方长官签署任命，新册同职由中央官署批任。'],proof:2},
  writing: {question:'新出土的木片有墨书，一处出土能推到全国通用吗？',choices:['可以，墨书所在木片年代久','还需比较同一时期别处的文字记录'],answer:1,
    proofs:['木片都来自一处驿站，其他地区尚没有同一时期的记录。','木片边缘留下水渍。','同一片木板上有三行墨书。'],proof:0},
};

function renderHistoryEvidencePair(root, study, key, onReady) {
  const read = () => store.topicStepOf(key) || {};
  root.innerHTML = '<div class="history-practice-data history-transfer companion-thread-task">' +
    '<p class="history-instruction">课堂模拟资料。先判断，再从三条记录里点能作证的一条。</p>' +
    '<fieldset><legend class="companion-stage-heading">' + practiceText(study.question) +
    '</legend><div class="history-practice-choices history-transfer-claims">' + historyTryButtons({choices:study.choices.map(text=>({text}))}) +
    '</div></fieldset><fieldset class="history-transfer-proofs"><legend>三条记录</legend><div class="history-practice-choices">' +
    study.proofs.map((text,index) => '<button type="button" data-companion-proof="'+index+'" aria-pressed="false">'+practiceText(text)+'</button>').join('') +
    '</div></fieldset><p class="history-practice-feedback" role="status"></p></div>';
  const task=root.firstElementChild;
  const choices=[...task.querySelectorAll('[data-history-try]')];
  const proofs=[...task.querySelectorAll('[data-companion-proof]')];
  function paint(s) {
    const ready=s.answer===study.answer&&s.proof===study.proof;
    const wrongAnswer=Number.isInteger(s.answer)&&s.answer!==study.answer;
    const wrongProof=Number.isInteger(s.proof)&&s.proof!==study.proof;
    const needsProof=wrongAnswer&&s.proof!==study.proof;
    choices.forEach((button,index)=>{
      button.setAttribute('aria-pressed',String(index===s.answer));
      button.disabled=needsProof;
    });
    proofs.forEach((button,index)=>{
      button.setAttribute('aria-pressed',String(index===s.proof));
      button.disabled=!Number.isInteger(s.answer)||(wrongAnswer&&!needsProof);
    });
    const feedback=task.querySelector('[role="status"]');
    if(ready){
      task.dataset.result='correct';
      feedback.textContent=(s.firstAnswer===study.answer&&s.firstProof===study.proof?'首答独立做对。':'有帮助后做对。')+'你选出的记录直接支持这个判断。';
    }else if(wrongAnswer||wrongProof){
      task.dataset.result='retry';
      feedback.textContent=wrongProof?'先看看题目问的是什么，再点一条直接写了这件事的记录。'
        :needsProof?'先不换答案。从三条记录里找涉及题目所问的那条。':'找到线索了。回到原题，用它重选。';
    }else{
      delete task.dataset.result;
      feedback.textContent=Number.isInteger(s.answer)?'请再点一条支持你判断的记录。':'';
    }
    onReady(ready);
  }
  choices.forEach((button,index)=>button.addEventListener('click',()=>{
    const state=read();
    state.firstAnswer??=index;
    state.answer=index;
    store.setTopicStepOf(key,state);
    paint(state);
  }));
  proofs.forEach((button,index)=>button.addEventListener('click',()=>{
    const state=read();
    state.firstProof??=index;
    state.proof=index;
    store.setTopicStepOf(key,state);
    paint(state);
  }));
  paint(read());
}

function startHistoryCompanionThread(t) {
  const saved = store.topicStepOf('companion:thread:' + t.id)?.step;
  companionThreadStep = Number.isInteger(saved) ? Math.min(Math.max(saved, 0), t.beads.length) : 0;
  paintHistoryCompanionThread(t);
}

function paintHistoryCompanionThread(t) {
  const labels = t.beads.map(b => NODES[nodeIndexById(b.node)].title).concat('换一份材料试试');
  const study = HISTORY_THREAD_METHOD[t.id];
  historyCompanionLayout(threadView, threadBody, t.name + ' · ' + t.ask, labels, companionThreadStep);
  const atEnd = companionThreadStep === t.beads.length;
  if (!atEnd) {
    const bead = t.beads[companionThreadStep];
    const node = NODES[nodeIndexById(bead.node)];
    const image = IMG_META[bead.node];
    threadBody.innerHTML = '<article class="history-companion-bead"><div><p class="history-date">' + practiceText(node.yearLabel) +
      '</p><h3 class="companion-stage-heading">' + practiceText(node.title) + '</h3><p>' + practiceText(bead.change) + '</p></div>' +
      (image ? '<figure><img src="' + practiceText(image.img) + '" alt="' + practiceText(image.name) + '"><figcaption>' + practiceText(image.name) + '</figcaption></figure>' : '') + '</article>';
  } else {
    threadBody.innerHTML = '<section class="history-thread-evidence"></section>';
  }
  const foot = document.createElement('div');
  foot.className = 'lesson-foot companion-actions';
  threadBody.append(foot);
  const move = amount => {
    companionThreadStep += amount;
    const key = 'companion:thread:' + t.id;
    store.setTopicStepOf(key,{...store.topicStepOf(key),step:companionThreadStep});
    paintHistoryCompanionThread(t);
    focusHistoryCompanion(threadBody.querySelector('.companion-stage-heading'));
  };
  const back = companionThreadStep > 0 ? () => move(-1) : null;
  if (!atEnd) {
    const nextLabel = companionThreadStep === t.beads.length - 1 ? '换一份材料试试' : '看' + labels[companionThreadStep + 1];
    historyCompanionActions(foot, back, nextLabel, () => move(1));
    return;
  }
  renderHistoryEvidencePair(threadBody.querySelector('.history-thread-evidence'), study, 'thread-evidence:' + t.id, done => {
    historyCompanionActions(foot, back, '完成比较', done ? closeThread : null);
  });
}

function paintHistoryWarProgress(t) {
  const labels = ['先读一场战争的线索', ...t.beads.map(b => NODES[nodeIndexById(b.node)].title), '整理归类的方法'];
  const step = warStage === 'brief' ? 0 : warStage === 'done' ? labels.length - 1 : warIdx + 1;
  historyCompanionLayout(threadView, threadBody, t.name + ' · 按最直接的变化归类', labels, step);
  if (warStage === 'brief') return;
  const foot = document.createElement('div');
  foot.className = 'lesson-foot companion-actions';
  threadBody.append(foot);
  historyCompanionActions(foot, () => {
    if (warStage === 'done') {
      warStage = 'cases';
      warIdx = warBeads.length - 1;
      warChoice = warBeads[warIdx].cat;
    } else if (warIdx === 0) {
      warStage = 'brief';
      warChoice = null;
    } else {
      warIdx--;
      warChoice = warBeads[warIdx].cat;
    }
    saveWarStep();
    paintClassify(t);
  }, '完成分类', warStage === 'done' ? closeThread : null);
}
