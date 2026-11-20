'use strict';

// Opening prompts draw on the main idea of each lesson, in textbook order.
const HISTORY_CORE_QUESTIONS = {
  g7a: [
    '从石器、炭屑和骨针，我们能推断远古人怎样生活？哪些事还不能确定？',
    '会种地以后，人为什么更容易在同一个地方长久住下去？',
    '要判断一个地方是否出现了早期文明，古城、器物和传说分别能提供什么线索？',
    '从商周政权更替到西周分封，新王朝怎样建立和维持统治？',
    '春秋诸侯为什么争当霸主？同一时期，农耕工具发生了什么变化？',
    '在诸侯竞争中，商鞅变法和都江堰分别怎样增强了秦国的实力？',
    '面对社会动荡，儒家、道家、墨家和法家分别开出了什么办法？',
    '从甲骨文、青铜器和金文中，能读到夏商周时期哪些消息？',
    '秦灭六国之后，为什么还要统一文字、货币和度量衡？',
    '大泽乡起义为什么爆发？它怎样动摇了秦朝的统治？',
    '战乱之后，西汉初年怎样让百姓恢复生产？文景时期延续了哪些办法？',
    '汉武帝怎样把地方、边疆和经济管理纳入大一统王朝的治理？',
    '东汉为何一度恢复稳定，后来又因哪些矛盾走向衰亡？',
    '张骞出使前后，汉朝与西域的联系怎样从探索走向长期往来？',
    '造纸术的改进和医学经验的整理，怎样影响了人们的学习与生活？',
    '官渡、赤壁两场战役分别改变了什么？为什么最终形成三国鼎立？',
    '西晋实现统一后为什么很快分裂？北方人口又是怎样流动的？',
    '南北人口流动与江南经济开发有什么关系？',
    '迁都、改用汉语和改变服饰，怎样帮助我们理解北方各族的交往？',
    '从圆周率、农书和书画作品中，能看到这个时代哪些科学和艺术成就？',
    '要给同学讲清一处考古发现与中华文明起源的关系，该用哪条证据？',
  ],
  g7b: [
    '隋朝重新统一后，大运河怎样联通南北？这么强的王朝为何很快灭亡？',
    '从唐太宗到武则天，减轻负担、选用人才怎样影响了唐朝治理？',
    '要说明开元时期经济繁荣，农业、手工业和城市贸易各能举出什么例子？',
    '安史之乱怎样改变了唐朝的局势？唐朝为何没能恢复早年的强盛？',
    '文成公主入藏和《步辇图》分别能说明唐与吐蕃怎样交往？',
    '玄奘、遣唐使和鉴真分别把哪些知识或文化带到了哪里？',
    '赵州桥、唐诗和雕版印本，各能告诉我们隋唐人的哪一种本领？',
    '北宋为什么要收回武将的兵权？这样做给政治带来什么变化？',
    '辽、西夏和北宋怎样并立？一份盟约怎样改变北宋与辽的关系？',
    '靖康之变后，政权格局怎样改变？岳飞抗金发生在什么背景下？',
    '从蒙古各部统一到元朝统一全国，先发生了什么？元朝又怎样管理各地？',
    '哪些线索能说明南方经济的地位提高了？纸币和瓷器说明了哪些变化？',
    '从泉州港、海船和旅行记录中，怎样看出当时中外有密切贸易？',
    '为什么活字适合反复重排？指南针、火药和文艺作品又反映了哪些变化？',
    '明朝取消丞相之后，皇帝和各部门的关系改变在哪里？',
    '郑和下西洋、澳门居住权和抗倭，分别体现明朝对外关系的哪一面？',
    '明朝内部的起义与东北政权的变化，怎样先后影响了明清更替？',
    '看台湾、西藏和新疆等例子，清朝为什么用不同办法治理各地？',
    '从军机处的职责和对言论、对外贸易的限制，能看出清朝怎样强化管控？',
    '高产作物怎样改变耕种？商帮又怎样让不同地方的生意连起来？',
    '如果要找古代建筑、药物或生产工艺的资料，各该从哪些实物或著作入手？',
    '要了解家乡节日习俗有哪些延续、哪些变化，该怎样找材料作比较？',
  ],
  g8a: [
    '英国为什么发动鸦片战争？《南京条约》怎样改变了中国的权益？',
    '第二次鸦片战争与第一次有什么联系？圆明园遗址能告诉我们什么？',
    '太平天国运动怎样从金田起义发展到与清朝对峙，又怎样走向失败？',
    '洋务运动从哪些方面尝试自强？收复新疆又解决了什么问题？',
    '甲午战败后，中国失去了哪些权益？这为什么引发列强进一步争夺？',
    '维新派想改什么？这些措施为什么没能持续实施？',
    '义和团运动、八国联军侵华与《辛丑条约》之间有什么先后关系？',
    '从兴中会到中国同盟会，革命组织和革命主张发生了什么变化？',
    '从武昌起义到清帝退位，辛亥革命怎样结束了君主专制制度？',
    '袁世凯复辟为什么失败？为什么随后出现军阀割据？',
    '新文化运动带来哪些思想变化？巴黎和会的消息又怎样引发五四运动？',
    '中共一大与二大各解决了什么问题？两次会议的任务有什么联系？',
    '黄埔军校和北伐为什么能成为国共合作的成果？',
    '从城市起义到在井冈山建立根据地，革命道路发生了什么转变？',
    '红军为什么开始长征？长征中的遵义会议怎样影响了后来的行动？',
    '从东北局部抗战到西安事变和平解决，抗日局势发生了什么变化？',
    '九一八事变与七七事变分别标志怎样的变化？为什么说七七事变后进入全民族抗战？',
    '台儿庄战役和百团大战分别在哪个战场？两个战场怎样共同抗日？',
    '抗战胜利前，中共七大做了哪些准备？日本宣布投降和正式签署投降书分别是什么时候？',
    '已经进行重庆谈判，为什么后来仍爆发了全面内战？',
    '从挺进大别山到三大战役、渡江战役，战局怎样一步步逆转？',
    '要讲清一处红色遗址的历史，怎样把地点、人物、事件和证据联系起来？',
  ],
  g8b: [
    '从政协会议到开国大典、西藏和平解放，新中国怎样建立并巩固国家统一？',
    '土地改革和抗美援朝分别面对什么问题？它们怎样巩固了新生政权？',
    '一五计划、1954年宪法和三大改造分别改变了国家的哪一方面？',
    '和平共处五项原则与万隆会议上的“求同存异”，怎样帮助国家间开展交往？',
    '为什么说社会主义建设经历了探索与曲折？有哪些决定可以用来比较？',
    '从油田、国防科技和杂交水稻中，各能找出什么建设成就？',
    '恢复联合国合法席位、中美关系缓和与中日建交有什么先后？外交格局怎样变化？',
    '关于真理标准的讨论与十一届三中全会有什么联系？国家工作重心发生了怎样的转移？',
    '小岗村的变化和深圳经济特区的试验，分别怎样打开改革、开放的新局面？',
    '改革从农村扩展到城市后，企业和沿海地区有哪些新变化？',
    '社会主义初级阶段基本路线包含哪些要点？南方谈话为什么进一步推动了改革开放？',
    '从提出建立社会主义市场经济体制到加入世界贸易组织，改革和开放各前进了哪一步？',
    '香港、澳门回归与人民生活总体达到小康，分别体现国家在哪方面取得进展？',
    '科技强军和多边外交的事例，各能说明国家工作出现什么新变化？',
    '“总体小康”和“全面建设小康社会”有什么区别？这阶段为什么提出新的发展要求？',
    '要判断这一时期全面建设小康社会的进展，经济规模和经济质量该怎样区分？',
    '亚丁湾护航和利比亚撤侨分别完成什么任务？它们反映了怎样的能力？',
    '中国梦的目标是什么？为什么在参观《复兴之路》展览时提出它？',
    '从脱贫攻坚到全面建成小康社会，哪些具体变化能让人理解这两个目标的联系？',
    '从国家安全和推进统一两个角度，分别能找到哪些事件来说明这课的主题？',
    '“一带一路”倡议和构建人类命运共同体，各从什么角度回应国际合作的问题？',
    '第一个百年奋斗目标是什么？庆祝大会与百年历史总结分别发生在什么时候？',
    '全面建成小康以后，现代化建设要走哪两步？有哪些成就可作为新的起点来理解？',
    '如果要说明支付、出行或购物这十多年怎样改变了普通人生活，可以找什么前后对比？',
  ],
};

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
  heading?.scrollIntoView({block:'start',behavior:'instant'});
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

function renderHistoryStage(no) {
  const lesson = lessonByNo(no);
  const materialCount = lesson.nodes.length;
  const practice = lessonPractice(no);
  const total = materialCount + 4;
  const prompt = practiceText(HISTORY_CORE_QUESTIONS[currentBookId][no - 1]);
  const stage = document.getElementById('historyStudy');
  stage.replaceChildren();
  historyPractice.replaceChildren();
  historyPractice.hidden = true;
  lessonFoot.replaceChildren();
  document.getElementById('historyStepLabel').textContent = '第 ' + (historyStep + 1) + ' / ' + total + ' 步';
  if (historyStep === 0) {
    const ordering = lesson.themeOrder ? '本课按主题看材料，年份可能前后交错。' :
      currentBookId === 'g7a' && no === 16 ? '先看三国鼎立前的两场战役，再看鼎立怎样形成。' : '';
    stage.innerHTML = '<section class="history-core"><h3 data-study-heading tabindex="-1">带着问题读史料</h3>' +
      '<p>' + prompt + '</p>' +
      (ordering ? '<p class="history-recall">' + ordering + '</p>' : '') + '</section>';
    paintHistoryActions(no, '看第一份史料', 1);
  } else if (historyStep <= materialCount) {
    const node = lesson.nodes[historyStep - 1];
    renderHistoryMaterial(stage, node, no);
    paintHistoryActions(no, historyStep < materialCount ? '看下一份史料' : '试第一题', historyStep + 1);
  } else if (historyStep <= materialCount + 2) {
    const questionIndex = historyStep - materialCount - 1;
    if (practice[questionIndex]) renderHistoryPractice(no, practice[questionIndex], questionIndex);
    else renderUnavailableHistoryPractice(no);
    paintHistoryActions(no, questionIndex === 0 ? '试下一题' : '回顾本课', historyStep + 1, true);
  } else {
    const answered = practice.filter(item => readPracticeAnswer(no, item).first !== null).length;
    stage.innerHTML = '<section class="history-core"><h3 data-study-heading tabindex="-1">回想课前的问题</h3>' +
      '<p>' + prompt + '</p><p class="history-recall">试着用刚才看到的一条史料说明你的理由。</p></section>' +
      (practice.length ? '<p class="history-completion">本课已答 ' + answered + ' / ' + practice.length + ' 题</p>' : '');
    const next = lessonByNo(no + 1);
    paintHistoryActions(no, next ? '开始下一课 · ' + next.title : '回到本册目录', null);
  }
}

function paintHistoryActions(no, label, next, quiz = false) {
  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'history-action' + (quiz ? ' history-skip' : '');
  main.dataset.studyNext = '';
  main.textContent = quiz ? '暂时跳过' : label;
  if (quiz && historyPractice.querySelector('[data-result="correct"]')) {
    main.classList.remove('history-skip');
    main.textContent = label;
  }
  main.dataset.nextLabel = label;
  main.addEventListener('click', () => {
    if (next != null) changeHistoryStep(no, next);
    else go(lessonByNo(no + 1) ? '/lesson/' + (no + 1) : '/');
  });
  lessonFoot.append(main);
  if (historyStep > 0) {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'history-secondary';
    back.textContent = '← 上一步';
    back.addEventListener('click', () => changeHistoryStep(no, historyStep - 1));
    lessonFoot.append(back);
  }
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
