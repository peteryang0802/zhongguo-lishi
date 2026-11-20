import {mountParentSettings} from './parent-settings.js?v=1';

const portal = document.getElementById('portalView');

mountParentSettings({
  subject: 'history',
  label: '历史',
  entry: document.getElementById('historyParentSettings') || undefined,
  visible: () => portal?.classList.contains('active') === true,
  localKeys: ['zg_v2', 'zg_progress', 'zg_last', 'zg_topic', 'zg_topic_step', 'zg_topic_done', 'zg_war_step', 'zg_challenge_v1'],
  localPrefixes: ['zg_practice_', 'zg_topic_step_'],
  sessionKeys: [],
  sessionPrefixes: [],
  onReload: () => {
    history.replaceState(null, '', location.pathname + location.search);
    location.reload();
  },
});
