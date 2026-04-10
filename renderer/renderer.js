/* Diligent Evidence Companion - Renderer (vanilla) */

const STORAGE_KEY = 'dec.layout.v1';
const STORAGE_CASE = 'dec.selectedCaseId.v1';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const byId = (id) => document.getElementById(id);

// Route: '' | '#/' | '#/dashboard' -> dashboard; '#/cases/mastercard-pli' -> case view
function getHashRoute() {
  const hash = (window.location.hash || '#/').replace(/^#/, '') || '/';
  const path = hash.startsWith('/') ? hash : `/${hash}`;
  if (path === '/' || path === '/dashboard') return { view: 'dashboard' };
  const caseMatch = path.match(/^\/cases\/([^/]+)$/);
  if (caseMatch) return { view: 'case', caseId: caseMatch[1] };
  return { view: 'dashboard' };
}

function setHash(path) {
  const newHash = path.startsWith('/') ? path : `/${path}`;
  if (window.location.hash !== `#${newHash}`) window.location.hash = newHash;
}

// Route caseId (e.g. mastercard-pli) -> internal case id (e.g. case_pci_q4_pam)
const ROUTE_TO_CASE_ID = { 'mastercard-pli': 'case_pci_q4_pam' };

// Elements
const gridEl = byId('grid');
const dashboardView = byId('dashboardView');
const caseView = byId('caseView');
const workspaceLabel = byId('workspaceLabel');
const dashboardCards = byId('dashboardCards');
const dashboardMutedCards = byId('dashboardMutedCards');
const dashboardSeeAll = byId('dashboardSeeAll');
const goToDashboard = byId('goToDashboard');
const splitterLeft = byId('splitterLeft');
const splitterRight = byId('splitterRight');

const casesChips = byId('casesChips');
const casesSortBtn = byId('casesSortBtn');
const casesList = byId('casesList');
const casesEmpty = byId('casesEmpty');
const casesSkeleton = byId('casesSkeleton');

const projectTitle = byId('projectTitle');
const projectSubtitle = byId('projectSubtitle');
const projectStatus = byId('projectStatus');
const projectKpis = byId('projectKpis');

const projectCrossfade = byId('projectCrossfade');
const projectSkeleton = byId('projectSkeleton');

const evidenceRequired = byId('evidenceRequired');
const evidenceOptional = byId('evidenceOptional');
const evidenceSensitive = byId('evidenceSensitive');
const blockersList = byId('blockersList');
const timelineList = byId('timelineList');

const packDialog = byId('packDialog');
const dialogClose = byId('dialogClose');
const packIndex = byId('packIndex');
const ctaPack = byId('ctaPack');
const ctaRequest = byId('ctaRequest');
const ctaEscalate = byId('ctaEscalate');

const agentPill = byId('agentPill');
const agentMode = byId('agentMode');
const agentObjective = byId('agentObjective');
const agentNext = byId('agentNext');
const contextToggle = byId('contextToggle');
const toolsBtn = byId('toolsBtn');
const toolsMenu = byId('toolsMenu');
const chatLog = byId('chatLog');
const chatInput = byId('chatInput');
const sendBtn = byId('sendBtn');
const quickPrompts = byId('quickPrompts');
const dropzone = byId('dropzone');
const dropHint = byId('dropHint');
const composeBox = dropzone; // .composebox element

const caseCtx = byId('caseCtx');

// Dashboard AI Chat elements
const dashboardAiChatTranscript = byId('dashboardAiChatTranscript');
const dashboardAiChatEmpty = byId('dashboardAiChatEmpty');
const dashboardAiChatInput = byId('dashboardAiChatInput');
const dashboardAiChatSend = byId('dashboardAiChatSend');
const dashboardAiChatChips = byId('dashboardAiChatChips');
const dashboardAiChatError = byId('dashboardAiChatError');
const dashboardAiChatErrorText = byId('dashboardAiChatErrorText');
const dashboardAiChatRetry = byId('dashboardAiChatRetry');
const dashboardAiChatDeepReviewPopover = byId('dashboardAiChatDeepReviewPopover');
const dashboardAiChatPopoverClose = byId('dashboardAiChatPopoverClose');
const dashboardAiChatPopoverUpgrade = byId('dashboardAiChatPopoverUpgrade');
const dashboardAiChatSummaryPopover = byId('dashboardAiChatSummaryPopover');
const dashboardAiChatSummaryPopoverClose = byId('dashboardAiChatSummaryPopoverClose');
const dashboardAiChatSummaryPopoverUpgrade = byId('dashboardAiChatSummaryPopoverUpgrade');
const dashboardRoot = byId('dashboardRoot');
const dashboardChatFullviewBar = byId('dashboardChatFullviewBar');
const dashboardChatSeeInApp = byId('dashboardChatSeeInApp');
const dashboardChatBackToDashboard = byId('dashboardChatBackToDashboard');

// App state
const state = {
  layout: {
    left: 280,
    right: 360
  },
  cases: [],
  selectedCaseId: null,
  caseFilter: 'all',
  caseSort: 'due',
  caseQuery: '',
  evidenceFilter: 'all',
  isSwitching: false,
  dashboardChat: {
    messages: [],
    loading: false,
    error: null,
    fullViewMode: false,
    lastProPromptTrigger: null,
    loadingMessageInterval: null,
    cancelled: false
  },
  dashboardChatInitialized: false,
  dashboardSummaryCompleted: false
};

function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.left === 'number') state.layout.left = parsed.left;
    if (typeof parsed?.right === 'number') state.layout.right = parsed.right;
  } catch (_) {}
}

function saveLayout() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.layout));
}

function loadSelectedCase() {
  state.selectedCaseId = localStorage.getItem(STORAGE_CASE) || null;
}

function saveSelectedCase() {
  if (!state.selectedCaseId) return;
  localStorage.setItem(STORAGE_CASE, state.selectedCaseId);
}

function applyGridColumns() {
  // Constraints (from spec)
  const left = clamp(state.layout.left, 240, 360);
  const right = clamp(state.layout.right, 320, 480);
  state.layout.left = left;
  state.layout.right = right;

  gridEl.style.gridTemplateColumns = `${left}px 10px 1fr 10px ${right}px`;
}

function startSplitterDrag(which, e) {
  e.preventDefault();
  const startX = e.clientX;
  const startLeft = state.layout.left;
  const startRight = state.layout.right;

  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  function onMove(ev) {
    const dx = ev.clientX - startX;
    if (which === 'left') {
      state.layout.left = clamp(startLeft + dx, 240, 360);
    } else {
      // dragging the boundary between center and right: increasing x decreases right width
      state.layout.right = clamp(startRight - dx, 320, 480);
    }
    applyGridColumns();
  }

  function onUp() {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    saveLayout();
  }

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}

function bindSplitters() {
  splitterLeft.addEventListener('pointerdown', (e) => startSplitterDrag('left', e));
  splitterRight.addEventListener('pointerdown', (e) => startSplitterDrag('right', e));
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function fmtWhen(dt) {
  const now = Date.now();
  const diff = Math.round((now - dt.getTime()) / 36e5); // hours
  if (diff < 1) return 'just now';
  if (diff < 24) return `${diff}h ago`;
  const days = Math.round(diff / 24);
  return `${days}d ago`;
}

function dueLabel(due) {
  const now = new Date();
  const ms = due.getTime() - now.getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return { text: 'Due today', kind: 'warning' };
  if (days > 0) return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, kind: days <= 3 ? 'warning' : 'neutral' };
  return { text: `Overdue by ${Math.abs(days)}d`, kind: 'danger' };
}

// Dashboard cases (in-memory); first links to Mastercard/PLI case page
// tags: which of In progress, Awaiting Owner, Needs Review, Audit-ready apply
const DASHBOARD_CASES = [
  {
    id: 'mastercard-pli',
    route: '/cases/mastercard-pli',
    title: 'Mastercard / PCI Program — Privileged Access Review',
    completion: 70,
    dueDate: daysFromNow(3),
    statusPill: 'At risk',
    tags: ['In progress', 'Awaiting Owner', 'Needs Review']
  },
  {
    id: 'soc2-vendor',
    route: null,
    title: 'SOC 2 Q1 — Vendor Access Review',
    completion: 33,
    dueDate: daysFromNow(-2),
    statusPill: 'At risk',
    tags: ['Awaiting Owner']
  },
  {
    id: 'iso27001-recert',
    route: null,
    title: 'ISO 27001 — Access Recertification',
    completion: 100,
    dueDate: daysFromNow(12),
    statusPill: 'On track',
    tags: ['Audit-ready']
  },
  {
    id: 'pci-q1-change',
    route: null,
    title: 'PCI Q1 — Change Management Evidence',
    completion: 45,
    dueDate: daysFromNow(7),
    statusPill: 'On track',
    tags: ['In progress']
  }
];

const DASHBOARD_MUTED_PRODUCTS = [
  'Audit',
  'Boardeffect',
  'Boards',
  'Community',
  'DMI',
  'Equity invest',
  'ESG',
  'Issue Manager',
  'Policy manager',
  'Research portal'
];

function riskLabel(risk) {
  if (risk === 'High') return { text: 'High risk', kind: 'danger' };
  if (risk === 'Medium') return { text: 'Medium risk', kind: 'warning' };
  return { text: 'Low risk', kind: 'neutral' };
}

function applyRoute(route) {
  const isDashboard = route.view === 'dashboard';
  dashboardView.classList.toggle('hidden', !isDashboard);
  caseView.classList.toggle('hidden', isDashboard);
  if (workspaceLabel) workspaceLabel.textContent = isDashboard ? 'Dashboard' : 'Mastercard / PCI Program';
  if (goToDashboard) goToDashboard.classList.toggle('hidden', isDashboard);
  const cmdkBtn = byId('cmdkBtn');
  if (cmdkBtn) cmdkBtn.classList.toggle('hidden', isDashboard);
  if (isDashboard) {
    renderDashboard();
  } else {
    showCasesSkeleton(false);
    const internalCaseId = ROUTE_TO_CASE_ID[route.caseId] || state.cases[0]?.id;
    if (internalCaseId && state.cases.some((c) => c.id === internalCaseId)) {
      state.selectedCaseId = internalCaseId;
      saveSelectedCase();
      renderCases();
      const c = state.cases.find((x) => x.id === internalCaseId);
      renderProject(c);
      setEvidenceFilter('all');
      if (c) setAgentContext(c, 'switch');
    }
  }
}

function renderDashboard() {
  if (!dashboardCards) return;
  dashboardCards.innerHTML = '';
  DASHBOARD_CASES.forEach((item, index) => {
    const isFirstAndSummaryDone = index === 0 && state.dashboardSummaryCompleted;
    const completion = isFirstAndSummaryDone ? 70 : item.completion;
    const dl = dueLabel(item.dueDate);
    const pillKind = item.statusPill === 'At risk' ? 'danger' : 'success';
    const tags = item.tags || [];
    const statusChipKind = (t) => {
      if (t === 'Audit-ready') return 'success';
      if (t === 'Needs Review') return 'warning';
      if (t === 'Awaiting Owner' || t === 'In progress') return 'neutral';
      return 'neutral';
    };
    const tagsHtml = tags.map((t) => `<span class="badge badge--${statusChipKind(t)} dashboard-card__tag">${escapeHtml(t)}</span>`).join('');
    const card = document.createElement('div');
    card.className = 'dashboard-card';
    card.setAttribute('role', 'listitem');
    if (item.route) {
      card.dataset.route = item.route;
      card.style.cursor = 'pointer';
    }
    card.innerHTML = `
      <div class="dashboard-card__title">${escapeHtml(item.title)}</div>
      <div class="dashboard-card__meta">
        <span class="dashboard-card__completion">${completion}% complete</span>
        <div class="dashboard-card__bar"><div class="dashboard-card__bar-fill" style="width:${completion}%"></div></div>
        <div class="dashboard-card__chips">
          <span class="badge ${dl.kind === 'danger' ? 'badge--danger' : dl.kind === 'warning' ? 'badge--warning' : 'badge--neutral'}">${escapeHtml(dl.text)}</span>
          ${item.statusPill ? `<span class="badge badge--${pillKind}">${escapeHtml(item.statusPill)}</span>` : ''}
          ${tagsHtml}
        </div>
      </div>
    `;
    if (item.route) {
      card.addEventListener('click', () => setHash(item.route));
    }
    dashboardCards.appendChild(card);
  });
  if (state.dashboardSummaryCompleted && dashboardCards) {
    const firstBar = dashboardCards.querySelector('.dashboard-card__bar-fill');
    const firstCompletion = dashboardCards.querySelector('.dashboard-card__completion');
    if (firstBar || firstCompletion) {
      requestAnimationFrame(() => {
        if (firstBar) firstBar.style.width = '80%';
        if (firstCompletion) firstCompletion.textContent = '80% complete';
      });
    }
  }
  dashboardAiChatUpdateChips();
  if (dashboardMutedCards) {
    dashboardMutedCards.innerHTML = '';
    for (const name of DASHBOARD_MUTED_PRODUCTS) {
      const el = document.createElement('div');
      el.className = 'dashboard-muted-card';
      el.setAttribute('role', 'listitem');
      el.textContent = name;
      dashboardMutedCards.appendChild(el);
    }
  }
  initDashboardAiChat();
}

// --- Dashboard AI Chat ---
// TODO: Replace with real AI/chat endpoint when available.
const ROTATING_STATUS_MESSAGES = [
  'Scanning the Mastercard evidence…',
  'Extracting key facts…',
  'Checking for inconsistencies…',
  'Building an audit-ready summary…',
  'Drafting recommended next steps…',
  'Finalizing…'
];

function mockSendMessage(userText) {
  return new Promise((resolve, reject) => {
    const t = userText.toLowerCase();
    if (t.includes('fail') || t.includes('error')) {
      setTimeout(() => reject(new Error('Simulated failure')), 400);
      return;
    }
    setTimeout(() => {
      if (t.includes('mastercard') || t.includes('deep review')) {
        resolve('Deep review complete. Connect a real AI endpoint for production use.');
      } else if (t.includes('iso27001') || t.includes('summary')) {
        resolve('Your ISO 27001 summary is ready. Connect a real AI endpoint for production use.');
      } else {
        resolve('Response ready. Replace with real AI integration for production.');
      }
    }, 14000);
  });
}

function dashboardAiChatScrollToBottom() {
  if (dashboardAiChatTranscript) dashboardAiChatTranscript.scrollTop = dashboardAiChatTranscript.scrollHeight;
}

function dashboardAiChatUpdateSendState() {
  if (!dashboardAiChatSend || !dashboardAiChatInput) return;
  const v = (dashboardAiChatInput.value || '').trim();
  const loading = state.dashboardChat.loading;
  dashboardAiChatSend.disabled = loading ? false : !v;
  if (loading) {
    dashboardAiChatSend.classList.add('dashboard-aichat__run--loading');
    dashboardAiChatSend.setAttribute('aria-label', 'Stop');
    dashboardAiChatSend.setAttribute('title', 'Stop');
  } else {
    dashboardAiChatSend.classList.remove('dashboard-aichat__run--loading');
    dashboardAiChatSend.setAttribute('aria-label', 'Send message');
    dashboardAiChatSend.setAttribute('title', 'Send (Enter)');
  }
}

/** Chips shown before Mastercard PCI review summary is done */
const DASHBOARD_AICHAT_CHIPS_INITIAL = [
  { prompt: 'Deep review for Mastercard', label: 'Deep review for Mastercard', id: 'dashboardAiChatChipDeepReview' },
  { prompt: 'Create a summary for ISO27001', label: 'Create a summary for ISO27001' },
  { prompt: 'Status report about PCI Q1', label: 'Status report about PCI Q1' }
];

/** Chips shown after Mastercard PCI review summary is done */
const DASHBOARD_AICHAT_CHIPS_AFTER_SUMMARY = [
  { prompt: 'Create outcome prediction', label: 'Create outcome prediction' },
  { prompt: 'Highlight key findings & residual risks', label: 'Highlight key findings & residual risks' },
  { prompt: 'Status report about PCI Q1', label: 'Status report about PCI Q1' }
];

function dashboardAiChatUpdateChips() {
  if (!dashboardAiChatChips) return;
  const list = state.dashboardSummaryCompleted ? DASHBOARD_AICHAT_CHIPS_AFTER_SUMMARY : DASHBOARD_AICHAT_CHIPS_INITIAL;
  dashboardAiChatChips.innerHTML = list.map((c) => {
    const idAttr = c.id ? ' id="' + escapeHtml(c.id) + '"' : '';
    return '<button type="button" class="dashboard-aichat__chip" data-prompt="' + escapeHtml(c.prompt) + '"' + idAttr + '>' + escapeHtml(c.label) + '</button>';
  }).join('');
}

function dashboardAiChatAppendMessage(role, text) {
  if (!dashboardAiChatTranscript) return;
  const msg = document.createElement('div');
  msg.className = 'dashboard-aichat__msg dashboard-aichat__msg--' + role;
  const meta = role === 'user' ? 'you' : 'assistant';
  msg.innerHTML = `${escapeHtml(text)}<div class="dashboard-aichat__msg-meta">${escapeHtml(meta)}</div>`;
  dashboardAiChatTranscript.appendChild(msg);
  if (dashboardAiChatEmpty) dashboardAiChatEmpty.classList.add('hidden');
  dashboardAiChatScrollToBottom();
}

function dashboardAiChatAppendMessageWithFile(fileTitle, messageText) {
  if (!dashboardAiChatTranscript) return;
  const msg = document.createElement('div');
  msg.className = 'dashboard-aichat__msg dashboard-aichat__msg--assistant';
  const downloadSvg = '<svg class="dashboard-aichat__file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const shareSvg = '<svg class="dashboard-aichat__file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
  const checkSvg = '<svg class="dashboard-aichat__file-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" aria-label="Ready"><path d="M20 6L9 17l-5-5"/></svg>';
  msg.innerHTML =
    '<div class="dashboard-aichat__summary-pill">' +
      '<a href="#" class="dashboard-aichat__summary-pill-link" aria-label="Download ' + escapeHtml(fileTitle) + '">' +
        '<span class="dashboard-aichat__summary-pill-title">' + escapeHtml(fileTitle) + '</span>' +
        '<span class="dashboard-aichat__summary-pill-icons">' +
          '<span class="dashboard-aichat__file-check-wrap">' + checkSvg + '</span>' +
          '<button type="button" class="dashboard-aichat__summary-pill-btn" aria-label="Share">' + shareSvg + '</button>' +
          '<span class="dashboard-aichat__summary-pill-download">' + downloadSvg + '</span>' +
        '</span>' +
      '</a>' +
      '<a href="#/cases/mastercard-pli" class="dashboard-aichat__summary-fullcase">See the full case</a>' +
    '</div>' +
    '<p class="dashboard-aichat__msg-text">' + escapeHtml(messageText) + '</p>' +
    '<div class="dashboard-aichat__msg-meta">assistant</div>';
  dashboardAiChatTranscript.appendChild(msg);
  const pillLink = msg.querySelector('.dashboard-aichat__summary-pill-link');
  if (pillLink) pillLink.addEventListener('click', (e) => { e.preventDefault(); /* placeholder: trigger download */ });
  const shareBtn = msg.querySelector('.dashboard-aichat__summary-pill-btn');
  if (shareBtn) shareBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); /* placeholder: share */ });
  if (dashboardAiChatEmpty) dashboardAiChatEmpty.classList.add('hidden');
  dashboardAiChatScrollToBottom();
}

function dashboardAiChatAppendLoading() {
  if (!dashboardAiChatTranscript) return null;
  const el = document.createElement('div');
  el.className = 'dashboard-aichat__msg dashboard-aichat__msg--assistant dashboard-aichat__msg--loading';
  el.setAttribute('data-loading', 'true');
  const firstMsg = ROTATING_STATUS_MESSAGES[0];
  const circleLoaderSvg =
    '<svg class="dashboard-aichat__loading-circle" viewBox="0 0 24 24" aria-hidden="true">' +
    '<defs><linearGradient id="aichat-load-gradient" x1="0%" y1="0%" x2="100%" y2="0%">' +
    '<stop offset="0%" stop-color="#c02550"/>' +
    '<stop offset="50%" stop-color="#a031a9"/>' +
    '<stop offset="100%" stop-color="#4a78ff"/>' +
    '</linearGradient></defs>' +
    '<circle class="dashboard-aichat__loading-circle-bg" cx="12" cy="12" r="10" fill="none" stroke-width="2"/>' +
    '<circle class="dashboard-aichat__loading-circle-fill" cx="12" cy="12" r="10" fill="none" stroke="url(#aichat-load-gradient)" stroke-width="2" stroke-linecap="round" stroke-dasharray="47 16"/>' +
    '</svg>';
  el.innerHTML =
    '<div class="dashboard-aichat__loading-row">' +
      '<span class="dashboard-aichat__loading-circle-wrap">' + circleLoaderSvg + '</span>' +
      '<span class="dashboard-aichat__msg-status">' + escapeHtml(firstMsg) + '</span>' +
    '</div>' +
    '<div class="dashboard-aichat__msg-meta">assistant</div>';
  dashboardAiChatTranscript.appendChild(el);
  dashboardAiChatScrollToBottom();
  let idx = 0;
  const statusSpan = el.querySelector('.dashboard-aichat__msg-status');
  const intervalId = setInterval(() => {
    if (!statusSpan || !statusSpan.closest('.dashboard-aichat__transcript')) {
      clearInterval(intervalId);
      return;
    }
    idx = (idx + 1) % ROTATING_STATUS_MESSAGES.length;
    statusSpan.textContent = ROTATING_STATUS_MESSAGES[idx];
    dashboardAiChatScrollToBottom();
  }, 2800);
  state.dashboardChat.loadingMessageInterval = intervalId;
  return el;
}

function dashboardAiChatShowError(message) {
  state.dashboardChat.error = message;
  if (dashboardAiChatErrorText) dashboardAiChatErrorText.textContent = message || 'Something went wrong.';
  if (dashboardAiChatError) dashboardAiChatError.classList.remove('hidden');
}

function dashboardAiChatHideError() {
  state.dashboardChat.error = null;
  if (dashboardAiChatError) dashboardAiChatError.classList.add('hidden');
}

function isDeepReviewPrompt(text) {
  const t = (text || '').toLowerCase().trim();
  return t.includes('deep review') || t === 'deep review for mastercard';
}

function showDeepReviewPopover() {
  hideSummaryPopover();
  state.dashboardChat.lastProPromptTrigger = 'Deep review for Mastercard';
  if (dashboardAiChatDeepReviewPopover) dashboardAiChatDeepReviewPopover.classList.remove('hidden');
}

function hideDeepReviewPopover() {
  if (dashboardAiChatDeepReviewPopover) dashboardAiChatDeepReviewPopover.classList.add('hidden');
}

function isSummaryPrompt(text) {
  const t = (text || '').toLowerCase().trim();
  return t.includes('summary') && (t.includes('iso27001') || t.includes('iso 27001') || t === 'create a summary for iso27001');
}

function showSummaryPopover() {
  hideDeepReviewPopover();
  state.dashboardChat.lastProPromptTrigger = 'Create a summary for ISO27001';
  if (dashboardAiChatSummaryPopover) dashboardAiChatSummaryPopover.classList.remove('hidden');
}

function hideSummaryPopover() {
  if (dashboardAiChatSummaryPopover) dashboardAiChatSummaryPopover.classList.add('hidden');
}

function enterChatFullView() {
  state.dashboardChat.fullViewMode = true;
  if (dashboardRoot) dashboardRoot.classList.add('dashboard--chat-fullview');
  if (dashboardView) dashboardView.classList.add('view--dashboard-chat-fullview');
  if (dashboardChatFullviewBar) dashboardChatFullviewBar.classList.remove('hidden');
}

function exitChatFullView() {
  state.dashboardChat.fullViewMode = false;
  if (dashboardRoot) dashboardRoot.classList.remove('dashboard--chat-fullview');
  if (dashboardView) dashboardView.classList.remove('view--dashboard-chat-fullview');
  if (dashboardChatFullviewBar) dashboardChatFullviewBar.classList.add('hidden');
}

function onUpgradeClick() {
  hideDeepReviewPopover();
  hideSummaryPopover();
  const chipContent = state.dashboardChat.lastProPromptTrigger || 'I want to upgrade to Pro';
  state.dashboardChat.messages.push({ role: 'user', text: chipContent });
  dashboardAiChatAppendMessage('user', chipContent);
  state.dashboardChat.lastProPromptTrigger = null;
  if (dashboardAiChatInput) {
    dashboardAiChatInput.value = '';
    dashboardAiChatInput.focus();
  }
  dashboardAiChatUpdateSendState();
}

function stopDashboardMessage() {
  if (!state.dashboardChat.loading) return;
  state.dashboardChat.cancelled = true;
  if (state.dashboardChat.loadingMessageInterval) {
    clearInterval(state.dashboardChat.loadingMessageInterval);
    state.dashboardChat.loadingMessageInterval = null;
  }
  const loadingEl = dashboardAiChatTranscript && dashboardAiChatTranscript.querySelector('[data-loading="true"]');
  if (loadingEl && loadingEl.parentNode) loadingEl.remove();
  state.dashboardChat.messages.pop();
  const lastUserMsg = dashboardAiChatTranscript && dashboardAiChatTranscript.querySelector('.dashboard-aichat__msg--user:last-of-type');
  if (lastUserMsg && lastUserMsg.parentNode) lastUserMsg.remove();
  const hasMessages = dashboardAiChatTranscript && dashboardAiChatTranscript.querySelectorAll('.dashboard-aichat__msg').length > 0;
  if (!hasMessages && dashboardAiChatEmpty) dashboardAiChatEmpty.classList.remove('hidden');
  state.dashboardChat.loading = false;
  dashboardAiChatUpdateSendState();
}

function sendDashboardMessage(text) {
  const trimmed = (text || '').trim();
  if (!trimmed || !dashboardAiChatTranscript) return;

  if (isDeepReviewPrompt(trimmed)) {
    showDeepReviewPopover();
    return;
  }
  if (isSummaryPrompt(trimmed)) {
    showSummaryPopover();
    return;
  }

  state.dashboardChat.error = null;
  state.dashboardChat.cancelled = false;
  dashboardAiChatHideError();

  state.dashboardChat.messages.push({ role: 'user', text: trimmed });
  dashboardAiChatAppendMessage('user', trimmed);

  if (dashboardAiChatInput) {
    dashboardAiChatInput.value = '';
    dashboardAiChatInput.style.height = 'auto';
  }

  state.dashboardChat.loading = true;
  dashboardAiChatUpdateSendState();
  const loadingEl = dashboardAiChatAppendLoading();

  mockSendMessage(trimmed)
    .then((reply) => {
      if (state.dashboardChat.loadingMessageInterval) {
        clearInterval(state.dashboardChat.loadingMessageInterval);
        state.dashboardChat.loadingMessageInterval = null;
      }
      if (state.dashboardChat.cancelled) {
        if (loadingEl && loadingEl.parentNode) loadingEl.remove();
        return;
      }
      if (loadingEl && loadingEl.parentNode) loadingEl.remove();
      state.dashboardChat.loading = false;
      state.dashboardChat.messages.push({ role: 'assistant', text: reply });
      dashboardAiChatAppendMessageWithFile('Mastercard PCI review summary', 'I shared the summary with Josh as you requested.');
      state.dashboardSummaryCompleted = true;
      renderDashboard();
      dashboardAiChatUpdateSendState();
    })
    .catch((err) => {
      if (state.dashboardChat.loadingMessageInterval) {
        clearInterval(state.dashboardChat.loadingMessageInterval);
        state.dashboardChat.loadingMessageInterval = null;
      }
      if (loadingEl && loadingEl.parentNode) loadingEl.remove();
      state.dashboardChat.loading = false;
      dashboardAiChatShowError(err && err.message ? err.message : 'Request failed.');
      dashboardAiChatUpdateSendState();
    });
}

function initDashboardAiChat() {
  if (!dashboardAiChatInput || !dashboardAiChatSend || !dashboardAiChatChips) return;
  if (state.dashboardChatInitialized) {
    dashboardAiChatUpdateSendState();
    dashboardAiChatUpdateChips();
    return;
  }
  state.dashboardChatInitialized = true;

  dashboardAiChatUpdateChips();
  dashboardAiChatUpdateSendState();

  dashboardAiChatInput.addEventListener('input', () => {
    if (dashboardAiChatInput.scrollHeight) dashboardAiChatInput.style.height = Math.min(dashboardAiChatInput.scrollHeight, 120) + 'px';
    dashboardAiChatUpdateSendState();
  });

  dashboardAiChatInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return; // Shift+Enter: newline
    e.preventDefault();
    const v = (dashboardAiChatInput.value || '').trim();
    if (v) sendDashboardMessage(v);
  });

  dashboardAiChatSend.addEventListener('click', () => {
    if (state.dashboardChat.loading) {
      stopDashboardMessage();
      return;
    }
    const v = (dashboardAiChatInput.value || '').trim();
    if (v) sendDashboardMessage(v);
  });

  dashboardAiChatChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.dashboard-aichat__chip[data-prompt]');
    if (!chip) return;
    e.preventDefault();
    e.stopPropagation();
    const prompt = (chip.dataset.prompt || '').trim();
    if (prompt) sendDashboardMessage(prompt);
  });

  if (dashboardAiChatRetry) {
    dashboardAiChatRetry.addEventListener('click', () => {
      dashboardAiChatHideError();
      const lastUser = state.dashboardChat.messages.filter((m) => m.role === 'user').pop();
      if (lastUser) sendDashboardMessage(lastUser.text);
    });
  }

  if (dashboardAiChatPopoverClose) {
    dashboardAiChatPopoverClose.addEventListener('click', hideDeepReviewPopover);
  }
  if (dashboardAiChatPopoverUpgrade) {
    dashboardAiChatPopoverUpgrade.addEventListener('click', onUpgradeClick);
  }
  if (dashboardAiChatSummaryPopoverClose) {
    dashboardAiChatSummaryPopoverClose.addEventListener('click', hideSummaryPopover);
  }
  if (dashboardAiChatSummaryPopoverUpgrade) {
    dashboardAiChatSummaryPopoverUpgrade.addEventListener('click', onUpgradeClick);
  }
  if (dashboardChatBackToDashboard) {
    dashboardChatBackToDashboard.addEventListener('click', exitChatFullView);
  }
  if (dashboardChatSeeInApp) {
    dashboardChatSeeInApp.addEventListener('click', () => {
      // Placeholder: open upgrade in app / pricing (TODO)
    });
  }
  document.addEventListener('click', (e) => {
    const card = document.querySelector('.dashboard-aichat__card');
    const clickInCard = card && card.contains(e.target);
    if (dashboardAiChatDeepReviewPopover && !dashboardAiChatDeepReviewPopover.classList.contains('hidden')) {
      if (dashboardAiChatDeepReviewPopover.contains(e.target)) return;
      if (clickInCard) return;
      hideDeepReviewPopover();
    }
    if (dashboardAiChatSummaryPopover && !dashboardAiChatSummaryPopover.classList.contains('hidden')) {
      if (dashboardAiChatSummaryPopover.contains(e.target)) return;
      if (clickInCard) return;
      hideSummaryPopover();
    }
  });
}

function seedData() {
  state.cases = [
    {
      id: 'case_pci_q4_pam',
      title: 'PCI Q4 – Privileged Access Review',
      subtitle: 'Mastercard – Identity & Access / PAM',
      control: 'ITGC-AC-04',
      period: '2025 Q4',
      owner: { name: 'Mary Allen', initials: 'MA' },
      due: daysFromNow(3),
      risk: 'Medium',
      status: 'In progress',
      tags: ['Awaiting Owner', 'Needs Review'],
      progress: { done: 7, total: 10 },
      activityAt: new Date(Date.now() - 2 * 3600e3),
      objective: 'Make case audit-ready by Jan 31',
      evidence: {
        required: [
          { id: 'ev1', name: 'PAM Quarterly Export (Q4)', source: 'CyberArk', status: 'Missing', owner: 'John', updatedAt: null, hash: null },
          { id: 'ev2', name: 'Reviewer sign-off', source: 'ServiceNow', status: 'Needs Review', owner: 'Mary', updatedAt: new Date(Date.now() - 2 * 3600e3), hash: 'a1c9…f2' },
          { id: 'ev3', name: 'Okta admin role membership', source: 'Okta', status: 'Uploaded', owner: 'Alex', updatedAt: new Date(Date.now() - 26 * 3600e3), hash: '93bd…0c' }
        ],
        optional: [
          { id: 'ev4', name: 'Splunk query results (PAM changes)', source: 'Splunk', status: 'Uploaded', owner: 'Mary', updatedAt: new Date(Date.now() - 6 * 3600e3), hash: '11ab…9d' }
        ],
        sensitive: [
          { id: 'ev5', name: 'Ticket screenshots (contains PAN)', source: 'ServiceNow', status: 'Rejected', owner: 'John', updatedAt: new Date(Date.now() - 49 * 3600e3), hash: '7c0a…31', flagged: 'PAN' }
        ]
      },
      blockers: [
        { id: 'b1', title: "Owner hasn't responded (48h)", actions: ['Nudge owner', 'Escalate'] },
        { id: 'b2', title: 'Evidence contains PAN → needs redaction', actions: ['Open redaction', 'Escalate'] }
      ],
      timeline: [
        { text: 'Agent requested evidence from John', when: new Date(Date.now() - 26 * 3600e3) },
        { text: 'Uploaded export by Mary', when: new Date(Date.now() - 2 * 3600e3) },
        { text: 'Reviewer rejected screenshot – needs CSV export', when: new Date(Date.now() - 49 * 3600e3) }
      ]
    },
    {
      id: 'case_soc2_q1_vendor',
      title: 'SOC 2 Q1 – Vendor Access Review',
      subtitle: 'Mastercard – IT Risk / Third Party',
      control: 'TPRM-07',
      period: '2026 Q1',
      owner: { name: 'John Rivera', initials: 'JR' },
      due: daysFromNow(-2),
      risk: 'High',
      status: 'Blocked',
      tags: ['Overdue', 'Awaiting Owner'],
      progress: { done: 3, total: 9 },
      activityAt: new Date(Date.now() - 20 * 3600e3),
      objective: 'Clear overdue items and unblock reviewer',
      evidence: {
        required: [
          { id: 'ev6', name: 'Vendor user list export', source: 'Okta', status: 'Missing', owner: 'John', updatedAt: null, hash: null },
          { id: 'ev7', name: 'Quarterly attestation', source: 'ServiceNow', status: 'Missing', owner: 'John', updatedAt: null, hash: null }
        ],
        optional: [],
        sensitive: [
          { id: 'ev8', name: 'Invoice sample (PII)', source: 'ServiceNow', status: 'Needs Review', owner: 'Mary', updatedAt: new Date(Date.now() - 10 * 3600e3), hash: 'c9aa…e0', flagged: 'PII' }
        ]
      },
      blockers: [{ id: 'b3', title: 'Awaiting owner confirmation for vendor scope', actions: ['Nudge owner', 'Escalate'] }],
      timeline: [{ text: 'Case flagged as overdue', when: new Date(Date.now() - 20 * 3600e3) }]
    },
    {
      id: 'case_iso27001_access',
      title: 'ISO 27001 – Access Recertification',
      subtitle: 'Mastercard – Security Governance',
      control: 'A.5.15',
      period: '2026 H1',
      owner: { name: 'Alex Chen', initials: 'AC' },
      due: daysFromNow(12),
      risk: 'Low',
      status: 'Ready for Review',
      tags: ['Audit-ready'],
      progress: { done: 10, total: 10 },
      activityAt: new Date(Date.now() - 4 * 3600e3),
      objective: 'Prepare reviewer pack and submit',
      evidence: {
        required: [{ id: 'ev9', name: 'Recertification report', source: 'Splunk', status: 'Uploaded', owner: 'Alex', updatedAt: new Date(Date.now() - 4 * 3600e3), hash: '2aa1…1b' }],
        optional: [],
        sensitive: []
      },
      blockers: [],
      timeline: [{ text: 'Evidence completion reached 100%', when: new Date(Date.now() - 4 * 3600e3) }]
    }
  ];
}

function showCasesSkeleton(show) {
  casesSkeleton.classList.toggle('hidden', !show);
  casesList.classList.toggle('hidden', show);
  casesEmpty.classList.add('hidden');
}

function setChipActive(containerEl, selector, isActive) {
  containerEl.querySelectorAll(selector).forEach((btn) => btn.classList.toggle('chip--active', isActive(btn)));
}

function matchesCaseFilter(c) {
  if (state.caseFilter === 'all') return true;
  if (state.caseFilter === 'overdue') return c.tags.includes('Overdue');
  if (state.caseFilter === 'in-progress') return c.status === 'In progress';
  if (state.caseFilter === 'awaiting-owner') return c.tags.includes('Awaiting Owner');
  if (state.caseFilter === 'needs-review') return c.tags.includes('Needs Review');
  if (state.caseFilter === 'audit-ready') return c.tags.includes('Audit-ready');
  return true;
}

function matchesQuery(c) {
  // Left panel search removed by spec; keep for future cmdk/command palette use.
  const q = state.caseQuery.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    c.title,
    c.subtitle,
    c.control,
    c.period,
    c.owner?.name
  ]
    .filter(Boolean)
    .join(' · ')
    .toLowerCase();
  return hay.includes(q);
}

function sortCases(list) {
  const copy = [...list];
  if (state.caseSort === 'due') copy.sort((a, b) => a.due - b.due);
  if (state.caseSort === 'risk') {
    const order = { High: 0, Medium: 1, Low: 2 };
    copy.sort((a, b) => (order[a.risk] ?? 9) - (order[b.risk] ?? 9));
  }
  if (state.caseSort === 'activity') copy.sort((a, b) => b.activityAt - a.activityAt);
  return copy;
}

function badge(kind, text) {
  const cls = kind === 'danger' ? 'badge--danger' : kind === 'warning' ? 'badge--warning' : kind === 'success' ? 'badge--success' : 'badge--neutral';
  return `<span class="badge ${cls}">${text}</span>`;
}

function renderCases() {
  const filtered = sortCases(state.cases.filter((c) => matchesCaseFilter(c) && matchesQuery(c)));
  casesList.innerHTML = '';

  if (filtered.length === 0) {
    casesEmpty.classList.remove('hidden');
    return;
  }
  casesEmpty.classList.add('hidden');

  for (const c of filtered) {
    const dl = dueLabel(c.due);
    const rl = riskLabel(c.risk);
    const pct = Math.round((c.progress.done / c.progress.total) * 100);
    const active = c.id === state.selectedCaseId;

    const el = document.createElement('div');
    el.className = `case${active ? ' case--active' : ''}`;
    el.setAttribute('role', 'listitem');
    el.dataset.caseId = c.id;
    el.innerHTML = `
      <div class="case__title">${escapeHtml(c.title)}</div>
      <div class="case__meta">Control: <span class="mono">${escapeHtml(c.control)}</span> · Period: ${escapeHtml(c.period)}</div>
      <div class="case__badges">
        ${badge(rl.kind, rl.text)}
        ${badge(dl.kind, dl.text)}
        ${c.tags.includes('Needs Review') ? badge('warning', 'Needs Review') : ''}
        ${c.tags.includes('Awaiting Owner') ? badge('neutral', 'Awaiting Owner') : ''}
        ${c.tags.includes('Overdue') ? badge('danger', 'Overdue') : ''}
        ${c.tags.includes('Audit-ready') ? badge('success', 'Audit-ready') : ''}
      </div>
      <div class="case__footer">
        <div class="mini">
          <div class="bar"><div style="width:${pct}%"></div></div>
          <div>${c.progress.done}/${c.progress.total} evidences</div>
        </div>
        <div class="owner"><span class="owner__av">${escapeHtml(c.owner.initials)}</span> ${escapeHtml(c.owner.name)}</div>
      </div>
    `;

    el.addEventListener('click', () => selectCase(c.id, { reason: 'user' }));
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      openCaseContextMenu(ev.clientX, ev.clientY, c.id);
    });

    casesList.appendChild(el);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function statusToKind(status) {
  if (status === 'Uploaded') return 'success';
  if (status === 'Missing') return 'danger';
  if (status === 'Needs Review') return 'warning';
  if (status === 'Rejected') return 'danger';
  return 'neutral';
}

function renderEvidenceRow(ev) {
  const kind = statusToKind(ev.status);
  const metaParts = [];
  metaParts.push(`<span class="badge badge--neutral">${escapeHtml(ev.source)}</span>`);
  metaParts.push(`<span class="badge ${kind === 'success' ? 'badge--success' : kind === 'warning' ? 'badge--warning' : kind === 'danger' ? 'badge--danger' : 'badge--neutral'} evidence-status" data-status="${escapeHtml(ev.status)}">${escapeHtml(ev.status)}</span>`);
  metaParts.push(`<span class="muted">Owner:</span> <span>${escapeHtml(ev.owner)}</span>`);
  if (ev.updatedAt) metaParts.push(`<span class="muted">Last updated:</span> <span>${escapeHtml(fmtWhen(ev.updatedAt))}</span>`);
  if (ev.hash) metaParts.push(`<span class="muted">Hash:</span> <span class="mono">${escapeHtml(ev.hash)}</span>`);
  if (ev.flagged) metaParts.push(`<span class="badge badge--warning">${escapeHtml(ev.flagged)}</span>`);

  const actions = ev.status === 'Missing'
    ? ['Upload', 'Request']
    : ev.status === 'Rejected'
      ? ['View', 'Replace']
      : ['View', 'Replace'];

  return `
    <div class="evidence" data-evidence-id="${escapeHtml(ev.id)}" data-evidence-status="${escapeHtml(ev.status)}">
      <div class="evidence__main">
        <div class="evidence__name">${escapeHtml(ev.name)}</div>
        <div class="evidence__meta">${metaParts.join(' · ')}</div>
      </div>
      <div class="inline-actions">
        ${actions.map((a) => `<button class="btn btn--secondary btn--compact" data-ev-action="${escapeHtml(a)}" type="button">${escapeHtml(a)}</button>`).join('')}
      </div>
    </div>
  `;
}

function renderProject(caseObj) {
  if (!caseObj) return;
  projectTitle.textContent = caseObj.title;
  projectSubtitle.textContent = caseObj.subtitle;

  // Status badge
  const status = caseObj.status;
  projectStatus.className = 'badge badge--neutral';
  projectStatus.textContent = status;
  if (status === 'Blocked') projectStatus.className = 'badge badge--danger';
  if (status === 'Ready for Review') projectStatus.className = 'badge badge--success';
  if (status === 'In progress') projectStatus.className = 'badge badge--warning';

  // KPIs
  const completion = Math.round((caseObj.progress.done / caseObj.progress.total) * 100);
  const blockers = caseObj.blockers?.length ?? 0;
  const dl = dueLabel(caseObj.due);
  projectKpis.innerHTML = `
    <span class="badge badge--neutral badge--completion">Evidence completion: ${completion}%</span>
    <span class="badge ${blockers ? 'badge--warning' : 'badge--success'}">Blockers: ${blockers}</span>
    <span class="badge ${dl.kind === 'danger' ? 'badge--danger' : dl.kind === 'warning' ? 'badge--warning' : 'badge--neutral'}">Time to due: ${escapeHtml(dl.text)}</span>
    <span class="badge ${caseObj.risk === 'High' ? 'badge--danger' : caseObj.risk === 'Medium' ? 'badge--warning' : 'badge--success'}">Rejection risk: ${escapeHtml(caseObj.risk)}</span>
  `;

  // Evidence lists
  evidenceRequired.innerHTML = caseObj.evidence.required.map(renderEvidenceRow).join('');
  evidenceOptional.innerHTML = caseObj.evidence.optional.length ? caseObj.evidence.optional.map(renderEvidenceRow).join('') : `<div class="muted">No optional evidence defined.</div>`;
  evidenceSensitive.innerHTML = caseObj.evidence.sensitive.length ? caseObj.evidence.sensitive.map(renderEvidenceRow).join('') : `<div class="muted">No sensitive evidence in this case.</div>`;

  // Blockers
  blockersList.innerHTML = (caseObj.blockers?.length ? caseObj.blockers : [{ id: 'none', title: 'No blockers. You’re close to audit-ready.', actions: [] }])
    .map((b) => {
      const actions = (b.actions || []).map((a) => `<button class="btn btn--secondary" data-blocker-action="${escapeHtml(a)}" type="button">${escapeHtml(a)}</button>`).join('');
      return `
        <div class="blocker" data-blocker-id="${escapeHtml(b.id)}">
          <div class="blocker__title">${escapeHtml(b.title)}</div>
          ${actions ? `<div class="blocker__actions">${actions}</div>` : ''}
        </div>
      `;
    })
    .join('');

  // Timeline
  timelineList.innerHTML = (caseObj.timeline || [])
    .map((t) => {
      return `
        <div class="event">
          <div class="event__dot"></div>
          <div>
            <div class="event__text">${escapeHtml(t.text)}</div>
            <div class="event__when">${escapeHtml(fmtWhen(t.when))}</div>
          </div>
        </div>
      `;
    })
    .join('');

  // Drawer index
  const allEv = [...caseObj.evidence.required, ...caseObj.evidence.optional, ...caseObj.evidence.sensitive];
  packIndex.innerHTML = allEv
    .map((ev) => `<div class="table__row"><div>${escapeHtml(ev.name)}</div><div>${escapeHtml(ev.status)}</div><div>${escapeHtml(ev.owner)}</div></div>`)
    .join('');
}

function setEvidenceFilter(filter) {
  state.evidenceFilter = filter;
  document.querySelectorAll('[data-evidence-filter]').forEach((btn) => btn.classList.toggle('chip--active', btn.dataset.evidenceFilter === filter));

  document.querySelectorAll('.evidence').forEach((row) => {
    const st = row.dataset.evidenceStatus;
    const show = filter === 'all'
      || (filter === 'missing' && st === 'Missing')
      || (filter === 'needs-review' && st === 'Needs Review')
      || (filter === 'rejected' && st === 'Rejected');
    row.classList.toggle('hidden', !show);
  });
}

function setAgentContext(caseObj, reason) {
  if (!caseObj) return;
  agentObjective.textContent = caseObj.objective || 'Make case audit-ready';

  const awaitingApproval = caseObj.evidence.required.some((e) => e.status === 'Missing');
  if (awaitingApproval) {
    agentPill.textContent = 'Waiting for approval…';
    agentMode.textContent = 'Mode: Await approval';
    agentNext.textContent = 'Waiting for your approval to send evidence request';
  } else if (caseObj.blockers?.length) {
    agentPill.textContent = 'Executing…';
    agentMode.textContent = 'Mode: Act';
    agentNext.textContent = 'Resolve blockers and prep evidence pack';
  } else {
    agentPill.textContent = 'Planning…';
    agentMode.textContent = 'Mode: Plan';
    agentNext.textContent = 'Generate reviewer-ready evidence pack';
  }

  if (reason === 'switch') {
    pushSystemMessage(`Context switched to “${caseObj.title}”.`);
    pushAgentSummaryAndSuggestions(caseObj);
  }
}

function computeCaseSummary(caseObj) {
  const completion = Math.round((caseObj.progress.done / caseObj.progress.total) * 100);
  const allEv = [...caseObj.evidence.required, ...caseObj.evidence.optional, ...caseObj.evidence.sensitive];
  const missing = allEv.filter((e) => e.status === 'Missing');
  const needsReview = allEv.filter((e) => e.status === 'Needs Review');
  const rejected = allEv.filter((e) => e.status === 'Rejected');
  const sensitiveFlagged = allEv.filter((e) => !!e.flagged);
  return { completion, missing, needsReview, rejected, sensitiveFlagged };
}

function pushAgentMessage(text) {
  const el = document.createElement('div');
  el.className = 'bubble';
  el.innerHTML = `${escapeHtml(text)}<div class="bubble__meta">Diligent Audit Companion</div>`;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function pushAgentSummaryAndSuggestions(caseObj) {
  const s = computeCaseSummary(caseObj);
  const blockers = caseObj.blockers?.length ?? 0;
  const dl = dueLabel(caseObj.due);

  pushAgentMessage(
    `Evidence progress: ${s.completion}%. ` +
      `${s.missing.length} missing · ${s.needsReview.length} needs review · ${s.rejected.length} rejected · ` +
      `${blockers} blockers. (${dl.text})`
  );

  // Suggestions (Action Cards) that drive tasks
  if (s.missing.length) {
    pushActionCard(
      `I can request missing evidence from ${new Set(s.missing.map((e) => e.owner)).size} owner(s)`,
      s.missing.slice(0, 4).map((e) => e.name)
    );
    pushApprovalGate('Send evidence requests now?');
  }

  if (s.rejected.length) {
    pushActionCard('I can draft a replacement request for rejected evidence', s.rejected.slice(0, 4).map((e) => e.name));
  }

  if (s.sensitiveFlagged.length) {
    pushActionCard('I can start a redaction workflow for sensitive items', s.sensitiveFlagged.slice(0, 4).map((e) => `${e.name} (${e.flagged})`));
  }

  if (!s.missing.length && !blockers) {
    pushActionCard('You are close — I can generate an evidence pack preview', ['Generate ZIP', 'Send to Reviewer']);
  }
}

function pushSystemMessage(text) {
  const el = document.createElement('div');
  el.className = 'bubble';
  el.innerHTML = `${escapeHtml(text)}<div class="bubble__meta">system</div>`;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function pushUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'bubble bubble--user';
  el.innerHTML = `${escapeHtml(text)}<div class="bubble__meta">you</div>`;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function pushActionCard(title, bullets) {
  const el = document.createElement('div');
  el.className = 'actioncard';
  el.innerHTML = `
    <div class="actioncard__title">${escapeHtml(title)}</div>
    <ul class="actioncard__list">${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
    <div class="actioncard__actions">
      <button class="btn btn--primary" data-approve="true" type="button">Approve</button>
      <button class="btn btn--secondary" data-edit="true" type="button">Edit message</button>
      <button class="btn btn--danger-outline" data-cancel="true" type="button">Cancel</button>
    </div>
  `;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function pushStepsPanel(steps) {
  const el = document.createElement('div');
  el.className = 'steps';
  el.innerHTML = `
    <div class="steps__head">
      <div class="steps__title">Plan / Steps</div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="link" type="button" data-toggle-steps="true">Collapse</button>
        <button class="btn btn--secondary btn--compact" data-cancel="true" type="button" style="height:24px;padding:0 8px;font-size:11px">Cancel</button>
      </div>
    </div>
    <div class="steps__body">
      <ol>${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
    </div>
  `;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function pushApprovalGate(question) {
  const el = document.createElement('div');
  el.className = 'approval';
  el.innerHTML = `
    <div class="approval__title">${escapeHtml(question)}</div>
    <div class="approval__actions">
      <button class="btn btn--primary" data-approve="true" type="button">Approve</button>
      <button class="btn btn--secondary" data-skip="true" type="button">Skip</button>
      <button class="btn btn--secondary" data-modify="true" type="button">Modify</button>
      <button class="btn btn--danger-outline" data-cancel="true" type="button">Cancel</button>
    </div>
  `;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function pushResultBundle(title, lines) {
  const el = document.createElement('div');
  el.className = 'result';
  el.innerHTML = `
    <div class="result__title">${escapeHtml(title)}</div>
    <div class="result__meta">${lines.map(escapeHtml).join('<br/>')}</div>
    <div class="result__actions">
      <button class="btn btn--secondary" data-open-checklist="true" type="button">Open in checklist</button>
      <button class="btn btn--primary" data-start-redaction="true" type="button">Start redaction</button>
      <button class="btn btn--danger-outline" data-cancel="true" type="button">Cancel</button>
    </div>
  `;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function seedChat() {
  chatLog.innerHTML = '';
  pushSystemMessage('Agent ready. Pick a case to begin.');
  pushStepsPanel(['Identify missing evidence', 'Draft requests', 'Track responses']);
}

function selectCase(caseId, { reason }) {
  if (state.isSwitching) return;
  if (caseId === state.selectedCaseId) return;

  state.selectedCaseId = caseId;
  saveSelectedCase();
  renderCases();

  // Switch micro-interaction: crossfade + skeleton 200ms
  state.isSwitching = true;
  projectCrossfade.classList.add('is-loading');
  projectSkeleton.classList.remove('hidden');

  showCasesSkeleton(false);

  const selected = state.cases.find((c) => c.id === caseId);

  window.setTimeout(() => {
    renderProject(selected);
    projectCrossfade.classList.remove('is-loading');
    projectSkeleton.classList.add('hidden');
    state.isSwitching = false;

    if (contextToggle.checked) {
      setAgentContext(selected, 'switch');
    }
  }, 200);
}

function openPackDialog() {
  // Never open from chat; only explicit project CTA triggers this.
  if (!packDialog) return;
  if (typeof packDialog.showModal === 'function') {
    if (!packDialog.open) packDialog.showModal();
  } else {
    // Fallback (shouldn’t be needed on Electron)
    packDialog.setAttribute('open', 'true');
  }
}

function closePackDialog() {
  if (!packDialog) return;
  if (typeof packDialog.close === 'function') {
    if (packDialog.open) packDialog.close();
  } else {
    packDialog.removeAttribute('open');
  }
}

function openCaseContextMenu(x, y, caseId) {
  caseCtx.dataset.caseId = caseId;
  caseCtx.classList.remove('hidden');
  // clamp to viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = caseCtx.getBoundingClientRect();
  const left = clamp(x, 8, vw - rect.width - 8);
  const top = clamp(y, 52, vh - rect.height - 8);
  caseCtx.style.left = `${left}px`;
  caseCtx.style.top = `${top}px`;
}

function closeCaseContextMenu() {
  caseCtx.classList.add('hidden');
}

function bindContextMenu() {
  document.addEventListener('click', () => closeCaseContextMenu());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCaseContextMenu();
  });
  caseCtx.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const caseId = caseCtx.dataset.caseId;
    closeCaseContextMenu();
    pushSystemMessage(`Case action: ${action} (${caseId}).`);
    if (action === 'escalate') pushApprovalGate('Send escalation to manager?');
  });
}

function bindEvidenceInteractions() {
  document.addEventListener('click', (e) => {
    const evFilterBtn = e.target.closest('[data-evidence-filter]');
    if (evFilterBtn) {
      setEvidenceFilter(evFilterBtn.dataset.evidenceFilter);
      return;
    }

    // Badge click inside evidence row: filter by status
    const statusBadge = e.target.closest('.evidence-status');
    if (statusBadge) {
      const st = statusBadge.dataset.status;
      if (st === 'Missing') setEvidenceFilter('missing');
      if (st === 'Needs Review') setEvidenceFilter('needs-review');
      if (st === 'Rejected') setEvidenceFilter('rejected');
      return;
    }

    // Evidence inline action buttons
    const evActionBtn = e.target.closest('[data-ev-action]');
    if (evActionBtn) {
      const action = evActionBtn.dataset.evAction;
      const row = evActionBtn.closest('.evidence');
      const id = row?.dataset?.evidenceId;
      pushSystemMessage(`Evidence action: ${action}${id ? ` (${id})` : ''}.`);
      if (action === 'Request') {
        const c = state.cases.find((x) => x.id === state.selectedCaseId);
        if (c) {
          const s = computeCaseSummary(c);
          pushActionCard(
            `I can request missing evidence from ${new Set(s.missing.map((e) => e.owner)).size || 0} owner(s)`,
            s.missing.length ? s.missing.slice(0, 4).map((e) => e.name) : ['No missing evidence detected']
          );
          pushApprovalGate('Send evidence requests now?');
        } else {
          pushActionCard('I can request missing evidence', ['Select a case to proceed']);
        }
        agentPill.textContent = 'Waiting for approval…';
        agentMode.textContent = 'Mode: Await approval';
      }
      return;
    }

    const blockerBtn = e.target.closest('[data-blocker-action]');
    if (blockerBtn) {
      const action = blockerBtn.dataset.blockerAction;
      pushSystemMessage(`Blocker action: ${action}.`);
      if (action === 'Escalate') pushApprovalGate('Send escalation to manager?');
      return;
    }
  });
}

function bindCasesControls() {
  const cycle = ['due', 'risk', 'activity'];
  const label = { due: 'Due date', risk: 'Risk', activity: 'Last activity' };
  function applySortIconTooltip() {
    const next = cycle[(cycle.indexOf(state.caseSort) + 1) % cycle.length];
    casesSortBtn.title = `Sort: ${label[state.caseSort]} (next: ${label[next]})`;
    casesSortBtn.setAttribute('aria-label', `Sort cases: ${label[state.caseSort]}`);
  }
  casesSortBtn.addEventListener('click', () => {
    const idx = cycle.indexOf(state.caseSort);
    state.caseSort = cycle[(idx + 1) % cycle.length];
    applySortIconTooltip();
    renderCases();
  });
  applySortIconTooltip();

  casesChips.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    const filter = btn.dataset.filter;
    if (!filter) return;
    state.caseFilter = filter;
    setChipActive(casesChips, '.chip', (b) => b.dataset.filter === filter);
    renderCases();
  });
}

function bindTopBar() {
  if (goToDashboard) goToDashboard.addEventListener('click', () => setHash('/'));
  if (dashboardSeeAll) dashboardSeeAll.addEventListener('click', () => setHash('/cases/mastercard-pli'));
  const cmdkBtn = byId('cmdkBtn');
  cmdkBtn.addEventListener('click', () => {
    // placeholder: command palette not implemented yet
    pushSystemMessage('Command palette coming soon. Tip: use filter chips + sort for now.');
  });
  document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      pushSystemMessage('Command palette coming soon.');
    }
  });
}

function bindDrawer() {
  ctaPack.addEventListener('click', () => openPackDialog());
  dialogClose.addEventListener('click', () => closePackDialog());
  // Clicking on the backdrop closes the dialog
  packDialog.addEventListener('click', (e) => {
    const rect = packDialog.getBoundingClientRect();
    const inDialog =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inDialog) closePackDialog();
  });
  ctaRequest.addEventListener('click', () => {
    const c = state.cases.find((x) => x.id === state.selectedCaseId);
    const missing = [];
    if (c) {
      const all = [...c.evidence.required, ...c.evidence.optional, ...c.evidence.sensitive];
      for (const ev of all) if (ev.status === 'Missing') missing.push(ev.name);
    }
    pushActionCard(`I can request missing evidence (${missing.length || 0} item(s))`, missing.length ? missing : ['No missing evidence detected']);
    pushApprovalGate('Send evidence requests now?');
    agentPill.textContent = 'Waiting for approval…';
    agentMode.textContent = 'Mode: Await approval';
  });
  ctaEscalate.addEventListener('click', () => pushApprovalGate('Send escalation to manager?'));
}

function bindChat() {
  toolsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toolsMenu.classList.toggle('hidden');
  });
  document.addEventListener('click', () => toolsMenu.classList.add('hidden'));
  toolsMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.menu__item');
    if (!item) return;
    toolsMenu.classList.add('hidden');
    pushSystemMessage(`Tool selected: ${item.dataset.tool}.`);
  });

  function send(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    pushUserMessage(trimmed);
    chatInput.value = '';
    autoGrow(chatInput);

    // Lightweight simulated assistant response
    const c = state.cases.find((x) => x.id === state.selectedCaseId);
    const contextOn = contextToggle.checked && !!c;
    window.setTimeout(() => {
      if (!contextOn) {
        pushAgentMessage('Turn on “Case context” to generate case-specific actions.');
        return;
      }

      const q = trimmed.toLowerCase();
      const s = computeCaseSummary(c);
      if (q.includes('progress') || q.includes('status') || q.includes('evidence')) {
        pushAgentMessage(`Progress is ${s.completion}%. Missing: ${s.missing.length}. Needs review: ${s.needsReview.length}. Rejected: ${s.rejected.length}.`);
        pushAgentSummaryAndSuggestions(c);
        return;
      }

      if (q.includes('blocker')) {
        if (c.blockers?.length) {
          pushAgentMessage(`Top blockers:\n${c.blockers.map((b) => `- ${b.title}`).join('\n')}`);
          pushActionCard('I can help clear blockers', ['Nudge owner', 'Open redaction', 'Escalate']);
        } else {
          pushAgentMessage('No blockers found for this case.');
        }
        return;
      }

      if (q.includes('chase') || q.includes('nudge')) {
        const owners = new Set(s.missing.map((e) => e.owner));
        pushActionCard('I can draft a chase message', [...owners].map((o) => `Chase: ${o}`));
        pushApprovalGate('Send chase messages now?');
        return;
      }

      if (q.includes('pack')) {
        pushStepsPanel(['Verify all required evidence is uploaded', 'Run redaction check for sensitive items', 'Generate ZIP', 'Send to reviewer']);
        const flagged = s.sensitiveFlagged.length;
        pushResultBundle('Evidence pack readiness', [
          `Sensitive flagged: ${flagged}`,
          `Missing evidence: ${s.missing.length}`,
          `Ready for reviewer: ${s.missing.length === 0 ? 'Yes' : 'Not yet'}`
        ]);
        return;
      }

      pushAgentMessage('I can help with progress, blockers, chase messages, and evidence packs. Try: “evidence progress”, “summarize blockers”, “draft chase”, “generate pack”.');
    }, 250);
  }

  sendBtn.addEventListener('click', () => send(chatInput.value));
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(chatInput.value);
    }
  });

  quickPrompts.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-prompt]');
    if (!btn) return;
    send(btn.dataset.prompt);
  });

  contextToggle.addEventListener('change', () => {
    const c = state.cases.find((x) => x.id === state.selectedCaseId);
    if (contextToggle.checked && c) setAgentContext(c, 'switch');
    if (!contextToggle.checked) pushSystemMessage('Case context OFF.');
  });

  // Handle Cancel buttons - close cards
  chatLog.addEventListener('click', (e) => {
    const cancelBtn = e.target.closest('[data-cancel="true"]');
    if (!cancelBtn) return;
    
    // Find the card container (actioncard, approval, steps, result, or bubble)
    const card = cancelBtn.closest('.actioncard, .approval, .steps, .result, .bubble');
    if (card) {
      // Add fade-out animation
      card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      card.style.opacity = '0';
      card.style.transform = 'translateY(-10px)';
      
      // Remove after animation
      setTimeout(() => {
        card.remove();
        // Scroll to bottom after removal
        chatLog.scrollTop = chatLog.scrollHeight;
      }, 200);
    }
  });

  // Handle toggle steps collapse/expand
  chatLog.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-toggle-steps="true"]');
    if (!toggleBtn) return;
    
    const stepsCard = toggleBtn.closest('.steps');
    if (!stepsCard) return;
    
    const body = stepsCard.querySelector('.steps__body');
    if (!body) return;
    
    const isCollapsed = body.style.display === 'none';
    body.style.display = isCollapsed ? '' : 'none';
    toggleBtn.textContent = isCollapsed ? 'Collapse' : 'Expand';
  });
}

function autoGrow(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
}

function bindDropzone() {
  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropHint.classList.remove('hidden');
      dropzone.style.borderColor = 'rgba(79,124,255,.45)';
      dropzone.style.background = 'rgba(79,124,255,.10)';
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropHint.classList.add('hidden');
      dropzone.style.borderColor = '';
      dropzone.style.background = '';
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;
    pushSystemMessage(`Received ${files.length} file(s). I’ll suggest evidence mapping in the checklist.`);
    pushResultBundle('Evidence received', [`Files: ${files.map((f) => f.name).join(', ')}`, '1 flagged as sensitive (PAN)']);
  });

  function setActive(active) {
    composeBox.classList.toggle('is-active', active);
  }

  chatInput.addEventListener('focus', () => setActive(true));
  chatInput.addEventListener('blur', () => {
    // Keep glow if user has text typed
    setActive(chatInput.value.trim().length > 0);
  });
  chatInput.addEventListener('input', () => {
    autoGrow(chatInput);
    setActive(chatInput.value.trim().length > 0 || document.activeElement === chatInput);
  });
  autoGrow(chatInput);
}

function initSelection() {
  const first = state.cases[0]?.id;
  if (!state.selectedCaseId || !state.cases.some((c) => c.id === state.selectedCaseId)) {
    state.selectedCaseId = first || null;
    saveSelectedCase();
  }
}

function boot() {
  loadLayout();
  applyGridColumns();
  bindSplitters();

  loadSelectedCase();
  seedData();
  initSelection();

  bindCasesControls();
  bindContextMenu();
  bindEvidenceInteractions();
  bindTopBar();
  bindDrawer();
  bindChat();
  bindDropzone();

  showCasesSkeleton(true);
  seedChat();

  // Default landing: Dashboard. Ensure hash is set so refresh shows dashboard.
  if (!window.location.hash || window.location.hash === '#') window.location.hash = '#/';

  applyRoute(getHashRoute());
  window.addEventListener('hashchange', () => applyRoute(getHashRoute()));

  window.setTimeout(() => {
    showCasesSkeleton(false);
    const route = getHashRoute();
    if (route.view === 'case') {
      renderCases();
      const c = state.cases.find((x) => x.id === state.selectedCaseId);
      if (c) {
        renderProject(c);
        setEvidenceFilter('all');
        setAgentContext(c, 'switch');
      }
    }
  }, 250);
}

boot();

