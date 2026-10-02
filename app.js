(async function initialiseBerlayarTracker() {
  const sceneHost = document.getElementById('scene');
  const loadingEl = document.getElementById('sceneLoading');
  const DATA = window.BERLAYAR_DATA;

  if (!DATA) {
    if (loadingEl) loadingEl.innerHTML = '<strong>Data failed to load.</strong><span>berlayar-data.js is missing.</span>';
    return;
  }

  const sourceMap = new Map(DATA.sources.map(s => [s.id, s]));
  const typeLabel = key => DATA.flatTypes[key]?.label || key;
  const money = n => new Intl.NumberFormat('en-SG', { style:'currency', currency:'SGD', maximumFractionDigits:0 }).format(n);
  const floorNumber = floor => String(floor).padStart(2, '0');
  const terraceLevels = block => block.floors.terraceLevels || [];
  const typeColorHex = type => `#${(DATA.flatTypes[type]?.color ?? 0x9aa39f).toString(16).padStart(6,'0')}`;

  function residentialFloors(block) {
    const nonResidential = new Set(terraceLevels(block));
    const floors = [];
    for (let f = block.floors.min; f <= block.floors.max; f++) {
      if (!nonResidential.has(f)) floors.push(f);
    }
    return floors;
  }

  function makeUnits() {
    const out = [];
    for (const block of DATA.blocks) {
      for (const floor of residentialFloors(block)) {
        for (const stack of block.stacks) {
          const unitNo = `${floorNumber(floor)}-${stack.no}`;
          const listedPrice = window.BERLAYAR_UNIT_PRICES?.[`${block.id}|${unitNo}`] ?? null;
          out.push({
            id: `${block.id}-${unitNo}`,
            block: block.id,
            floor,
            stack: stack.no,
            type: stack.type,
            listedPrice,
            status: DATA.project.statusBaseline || 'untracked',
            basis: 'Unit existence / stack / flat type is source-derived. Listed price, where shown, comes from the uploaded Berlayar price charts. Live selection status is community-tracked.'
          });
        }
      }
    }
    return out;
  }

  const units = makeUnits();

  function validateData() {
    const errors = [];
    const notes = [];
    if (units.length !== DATA.project.totalUnits) errors.push(`Generated ${units.length}, expected ${DATA.project.totalUnits}.`);

    for (const [type, meta] of Object.entries(DATA.flatTypes)) {
      const actual = units.filter(u => u.type === type).length;
      if (actual !== meta.total) errors.push(`${type}: ${actual}, expected ${meta.total}.`);
    }

    for (const block of DATA.blocks) {
      const actual = units.filter(u => u.block === block.id).length;
      if (actual !== block.total) errors.push(`${block.id}: ${actual}, expected ${block.total}.`);
      if (block.stacks.length !== 8) notes.push(`${block.id}: expected 8 stack columns, found ${block.stacks.length}.`);
    }

    const missingPrices = units.filter(u => !Number.isFinite(u.listedPrice));
    if (missingPrices.length) errors.push(`Unit price chart coverage: ${missingPrices.length} generated units do not have a listed price.`);
    const sourcePriceCount = Object.keys(window.BERLAYAR_UNIT_PRICES || {}).length;
    if (sourcePriceCount !== DATA.project.totalUnits) errors.push(`Unit price chart contains ${sourcePriceCount} prices, expected ${DATA.project.totalUnits}.`);

    if (errors.length) console.error('Berlayar dataset validation FAILED:', errors);
    else console.info(`Berlayar dataset validated: ${units.length.toLocaleString()} units; block + flat-type totals and ${sourcePriceCount.toLocaleString()} source-chart prices reconcile.`);
    if (notes.length) console.info('Berlayar dataset notes:', notes);
  }
  validateData();

  function statusCounts(subset = units) {
    return subset.reduce((acc, u) => {
      acc[u.status] = (acc[u.status] || 0) + 1;
      return acc;
    }, {
      available:0,
      untracked:0,
      reported_available:0,
      confirmed_available:0,
      reported_taken:0,
      confirmed_taken:0,
      conflicting:0
    });
  }

  function isAvailableStatus(status) {
    return ['available', 'untracked', 'reported_available', 'confirmed_available'].includes(status);
  }

  function availableCount(counts) {
    return (counts.available || 0)
      + (counts.untracked || 0)
      + (counts.reported_available || 0)
      + (counts.confirmed_available || 0);
  }

  function statusLabel(status) {
    return ({
      available: 'Available',
      untracked: 'Available',
      reported_available: 'Available',
      confirmed_available: 'Available',
      reported_taken: 'Reported taken',
      confirmed_taken: 'Taken',
      conflicting: 'Conflicting reports'
    })[status] || status;
  }

  function updateSummary() {
    const c = statusCounts();
    document.getElementById('totalUnits').textContent = units.length.toLocaleString();
    document.getElementById('availableUnits').textContent = availableCount(c).toLocaleString();
    document.getElementById('reportedUnits').textContent = c.reported_taken.toLocaleString();
    document.getElementById('takenUnits').textContent = c.confirmed_taken.toLocaleString();
    if (window.__berlayarRefreshBlockLabels) window.__berlayarRefreshBlockLabels();
  }
  updateSummary();

  // ---------- DOM: drawers/dialogs ----------
  const blockDrawer = document.getElementById('blockDrawer');
  const unitDialog = document.getElementById('unitDialog');
  const featureDialog = document.getElementById('featureDialog');
  const sourcesDialog = document.getElementById('sourcesDialog');
  let selectedBlock = null;
  let selectedUnit = null;
  let selectedFloor = null;
  let selectorView = 'level';

  const levelViewBtn = document.getElementById('levelViewBtn');
  const allFloorsViewBtn = document.getElementById('allFloorsViewBtn');
  const levelSelectorView = document.getElementById('levelSelectorView');
  const allFloorsPanel = document.getElementById('allFloorsPanel');
  const levelRail = document.getElementById('levelRail');
  const levelUnitGrid = document.getElementById('levelUnitGrid');
  const currentLevelLabel = document.getElementById('currentLevelLabel');
  const currentLevelMeta = document.getElementById('currentLevelMeta');

  const quickUnitBar = document.getElementById('quickUnitBar');
  const quickUnitTitle = document.getElementById('quickUnitTitle');
  const quickUnitMeta = document.getElementById('quickUnitMeta');
  const quickUnitFeedback = document.getElementById('quickUnitFeedback');
  const quickTakenBtn = document.getElementById('quickTakenBtn');
  const quickAvailableBtn = document.getElementById('quickAvailableBtn');
  const quickDetailsBtn = document.getElementById('quickDetailsBtn');


  // ---------- V1.4.1 shared community data (Supabase / riseblock only) ----------
  const communityPanel = document.getElementById('communityPanel');
  const communityBackdrop = document.getElementById('communityBackdrop');
  const reportResult = document.getElementById('reportResult');
  const quotaByBlock = new Map();
  let currentProgress = null;
  let supabase = null;
  let communityDbReady = false;

  const reporterTokenKey = 'berlayar_rise_reporter_token_v1';
  function fallbackUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  function getReporterToken() {
    try {
      let token = localStorage.getItem(reporterTokenKey);
      if (!token) {
        token = crypto.randomUUID ? crypto.randomUUID() : fallbackUuid();
        localStorage.setItem(reporterTokenKey, token);
      }
      return token;
    } catch (_) {
      return crypto.randomUUID ? crypto.randomUUID() : fallbackUuid();
    }
  }
  const reporterToken = getReporterToken();

  function localDateTimeValue(date = new Date()) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0,16);
  }
  function readableDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-SG', {
      day:'numeric', month:'short', hour:'numeric', minute:'2-digit', timeZone:'Asia/Singapore'
    }).format(new Date(value));
  }
  function confidenceLabel(value, support = 0, conflict = 0) {
    const labels = {
      community_confirmed: `Community confirmed · ${support} matching reports`,
      community_supported: `Community supported · ${support} matching / ${conflict} conflicting`,
      reported: 'Reported · 1 community observation',
      conflicting: `Conflicting reports · ${support} matching / ${conflict} conflicting`
    };
    return labels[value] || 'Not yet reported';
  }

  function setDbStatus(message, offline = false) {
    const el = document.getElementById('dbStatusText');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('db-offline', offline);
  }

  function applyUnitStatuses(rows) {
    const map = new Map(rows.map(r => [`${r.block_code}-${r.unit_no}`, r]));
    for (const u of units) {
      const row = map.get(`${u.block}-${floorNumber(u.floor)}-${u.stack}`);
      const liveStatus = row?.community_status;
      u.status = (!liveStatus || liveStatus === 'untracked') ? (DATA.project.statusBaseline || 'available') : liveStatus;
      u.live = row || null;
    }
    updateSummary();
    if (selectedBlock) {
      const c = statusCounts(blockUnits(selectedBlock.id));
      document.getElementById('drawerAvailable').textContent = availableCount(c).toLocaleString();
      renderUnitGrid();
    }
    if (selectedUnit && unitDialog.open) updateUnitStatusUi(selectedUnit);
  }

  function updateUnitStatusUi(u) {
    const pill = document.getElementById('unitStatusPill');
    if (pill) {
      pill.className = `status-pill ${u.status}`;
      pill.textContent = statusLabel(u.status);
    }
    updateQuickUnitBar();
  }

  function renderQuotaForSelectedBlock() {
    if (!selectedBlock) return;
    const q = quotaByBlock.get(selectedBlock.id);
    const empty = document.getElementById('quotaEmpty');
    const values = document.getElementById('quotaValues');
    if (!q) {
      empty.hidden = false;
      values.hidden = true;
      document.getElementById('quotaConfidence').textContent = 'Not yet reported';
      document.getElementById('quotaObservedAt').textContent = '';
      return;
    }
    empty.hidden = true;
    values.hidden = false;
    document.getElementById('quotaMalay').textContent = q.malay_remaining.toLocaleString();
    document.getElementById('quotaChinese').textContent = q.chinese_remaining.toLocaleString();
    document.getElementById('quotaIndian').textContent = q.indian_other_remaining.toLocaleString();
    document.getElementById('quotaConfidence').textContent = confidenceLabel(q.confidence, q.support_count, q.conflict_count);
    document.getElementById('quotaObservedAt').textContent = `Observed ${readableDate(q.latest_observed_at)}`;
  }

  function renderProgress() {
    if (!currentProgress) {
      document.getElementById('queueReached').textContent = '—';
      document.getElementById('dropoutsReported').textContent = '—';
      document.getElementById('impliedBookings').textContent = '—';
      document.getElementById('estimatedRemaining').textContent = '—';
      document.getElementById('progressConfidence').textContent = 'No progress report yet';
      return;
    }
    document.getElementById('queueReached').textContent = Number(currentProgress.queue_reached).toLocaleString();
    document.getElementById('dropoutsReported').textContent = Number(currentProgress.dropouts).toLocaleString();
    document.getElementById('impliedBookings').textContent = Number(currentProgress.implied_bookings).toLocaleString();
    document.getElementById('estimatedRemaining').textContent = Number(currentProgress.estimated_remaining).toLocaleString();
    document.getElementById('progressConfidence').textContent = `${confidenceLabel(currentProgress.confidence, currentProgress.support_count, currentProgress.conflict_count)} · ${readableDate(currentProgress.latest_observed_at)}`;
  }

  async function fetchAllUnitStatuses() {
    const rows = [];
    for (let start = 0; start < 3000; start += 1000) {
      const { data, error } = await supabase.from('unit_status_current').select('*').order('unit_id').range(start, start + 999);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    return rows;
  }

  async function refreshCommunityData() {
    if (!supabase) return;
    const [unitRows, quotaRes, progressRes] = await Promise.all([
      fetchAllUnitStatuses(),
      supabase.from('block_quota_current').select('*'),
      supabase.from('selection_progress_current').select('*').limit(1)
    ]);
    if (quotaRes.error) throw quotaRes.error;
    if (progressRes.error) throw progressRes.error;
    applyUnitStatuses(unitRows);
    quotaByBlock.clear();
    for (const q of quotaRes.data || []) quotaByBlock.set(q.block_code, q);
    currentProgress = progressRes.data?.[0] || null;
    renderQuotaForSelectedBlock();
    renderProgress();
    setDbStatus('Community updates connected.');
    communityDbReady = true;
  }

  async function connectCommunityData() {
    const cfg = window.BERLAYAR_SUPABASE;
    if (!cfg?.url || !cfg?.publishableKey) {
      setDbStatus('Community updates are unavailable.', true);
      return;
    }
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      supabase = createClient(cfg.url, cfg.publishableKey, { db: { schema: cfg.schema || 'riseblock' } });
      await refreshCommunityData();
    } catch (err) {
      console.error('Community data connection failed:', err);
      const message = String(err?.message || err || 'Unknown database error');
      if (/schema|exposed|profile/i.test(message)) {
        setDbStatus('Community updates are temporarily unavailable.', true);
      } else {
        setDbStatus('Community updates are temporarily unavailable.', true);
      }
    }
  }

  function populateBlockSelect(select, preferred) {
    select.innerHTML = DATA.blocks.map(b => `<option value="${b.id}">${b.id}</option>`).join('');
    if (preferred && DATA.blocks.some(b => b.id === preferred)) select.value = preferred;
  }
  function populateUnitSelect(blockCode, preferredUnit) {
    const select = document.getElementById('unitReportUnit');
    const list = blockUnits(blockCode).slice().sort((a,b) => a.floor - b.floor || Number(a.stack) - Number(b.stack));
    select.innerHTML = list.map(u => `<option value="${floorNumber(u.floor)}-${u.stack}">#${floorNumber(u.floor)}-${u.stack} · ${typeLabel(u.type)}</option>`).join('');
    if (preferredUnit && list.some(u => `${floorNumber(u.floor)}-${u.stack}` === preferredUnit)) select.value = preferredUnit;
  }
  function resetReportResult() {
    reportResult.hidden = true;
    reportResult.className = 'report-result';
    reportResult.textContent = '';
  }
  function showReportResult(message, ok = true) {
    reportResult.hidden = false;
    reportResult.className = `report-result ${ok ? 'success' : 'error'}`;
    reportResult.textContent = message;
  }
  const reportChooser = document.getElementById('reportChooser');
  const reportFlowTop = document.getElementById('reportFlowTop');
  const reportFlowTitle = document.getElementById('reportFlowTitle');
  const reportContextText = document.getElementById('reportContextText');
  const reportTitles = {
    quota: 'Block quota',
    unit: 'Unit status',
    progress: 'Queue progress'
  };

  function showReportChooser() {
    document.querySelectorAll('[data-report-kind]').forEach(btn => btn.classList.remove('active'));
    document.getElementById('quotaReportForm').hidden = true;
    document.getElementById('unitReportForm').hidden = true;
    document.getElementById('progressReportForm').hidden = true;
    reportChooser.hidden = false;
    reportFlowTop.hidden = true;
    reportContextText.textContent = '';
    resetReportResult();
  }

  function setReportKind(kind, context = {}) {
    document.querySelectorAll('[data-report-kind]').forEach(btn => btn.classList.toggle('active', btn.dataset.reportKind === kind));
    document.getElementById('quotaReportForm').hidden = kind !== 'quota';
    document.getElementById('unitReportForm').hidden = kind !== 'unit';
    document.getElementById('progressReportForm').hidden = kind !== 'progress';
    reportChooser.hidden = true;
    reportFlowTop.hidden = false;
    reportFlowTitle.textContent = reportTitles[kind] || '';
    reportContextText.textContent = '';
    resetReportResult();

    const now = localDateTimeValue();

    if (kind === 'quota') {
      const preferredBlock = context.block || selectedBlock?.id || DATA.blocks[0].id;
      populateBlockSelect(document.getElementById('quotaReportBlock'), preferredBlock);
      document.getElementById('quotaReportObserved').value = now;
      document.getElementById('quotaBlockField').hidden = Boolean(context.block);
      if (context.block) reportContextText.textContent = `Block ${preferredBlock}`;
    }

    if (kind === 'unit') {
      const blockCode = context.block || selectedUnit?.block || selectedBlock?.id || DATA.blocks[0].id;
      const unitCode = context.unit || (selectedUnit ? `${floorNumber(selectedUnit.floor)}-${selectedUnit.stack}` : null);
      populateBlockSelect(document.getElementById('unitReportBlock'), blockCode);
      populateUnitSelect(blockCode, unitCode);
      document.getElementById('unitReportObserved').value = now;
      document.getElementById('unitBlockField').hidden = Boolean(context.block);
      document.getElementById('unitUnitField').hidden = Boolean(context.unit);
      if (context.unit) reportContextText.textContent = `Block ${blockCode} · #${unitCode}`;
      else if (context.block) reportContextText.textContent = `Block ${blockCode}`;
    }

    if (kind === 'progress') {
      document.getElementById('progressReportObserved').value = now;
    }
  }

  function openCommunity(kind = null, context = {}) {
    communityPanel.classList.add('open');
    communityPanel.setAttribute('aria-hidden','false');
    communityBackdrop.hidden = false;
    if (kind) setReportKind(kind, context);
    else showReportChooser();
  }

  function closeCommunity() {
    communityPanel.classList.remove('open');
    communityPanel.setAttribute('aria-hidden','true');
    communityBackdrop.hidden = true;
  }

  populateBlockSelect(document.getElementById('quotaReportBlock'));
  populateBlockSelect(document.getElementById('unitReportBlock'));
  populateUnitSelect(DATA.blocks[0].id);
  document.getElementById('unitReportBlock').addEventListener('change', e => populateUnitSelect(e.target.value));
  document.getElementById('communityReportBtn').addEventListener('click', () => openCommunity());
  document.getElementById('reportProgressBtn').addEventListener('click', () => openCommunity('progress'));
  document.getElementById('reportQuotaBtn').addEventListener('click', () => openCommunity('quota', {block:selectedBlock?.id}));
  document.getElementById('reportUnitBtn').addEventListener('click', () => {
    if (!selectedUnit) return;
    unitDialog.close();
    openCommunity('unit', {block:selectedUnit.block, unit:`${floorNumber(selectedUnit.floor)}-${selectedUnit.stack}`});
  });
  document.getElementById('closeCommunityBtn').addEventListener('click', closeCommunity);
  document.getElementById('changeReportTypeBtn').addEventListener('click', showReportChooser);
  communityBackdrop.addEventListener('click', closeCommunity);
  document.querySelectorAll('[data-report-kind]').forEach(btn => btn.addEventListener('click', () => setReportKind(btn.dataset.reportKind)));

  async function runSubmission(form, rpcName, payload, successText) {
    if (!communityDbReady || !supabase) {
      showReportResult('Community updates are not connected right now. Please try again shortly.', false);
      return;
    }
    const button = form.querySelector('.submit-report-btn');
    button.disabled = true;
    resetReportResult();
    try {
      const { error } = await supabase.rpc(rpcName, payload);
      if (error) throw error;
      showReportResult(successText, true);
      await refreshCommunityData();
    } catch (err) {
      console.error(err);
      showReportResult(err?.message || 'Could not submit this update.', false);
    } finally {
      button.disabled = false;
    }
  }

  document.getElementById('unitReportForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const status = new FormData(form).get('unitReportStatus');
    await runSubmission(form, 'submit_unit_report', {
      p_block_code: document.getElementById('unitReportBlock').value,
      p_unit_no: document.getElementById('unitReportUnit').value,
      p_status: status,
      p_observed_at: new Date(document.getElementById('unitReportObserved').value).toISOString(),
      p_source_type: document.getElementById('unitReportSource').value,
      p_source_note: document.getElementById('unitReportNote').value,
      p_evidence_url: document.getElementById('unitReportEvidence').value,
      p_reporter_token: reporterToken
    }, 'Unit status submitted.');
  });

  document.getElementById('quotaReportForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    await runSubmission(form, 'submit_quota_report', {
      p_block_code: document.getElementById('quotaReportBlock').value,
      p_malay_remaining: Number(document.getElementById('quotaReportMalay').value),
      p_chinese_remaining: Number(document.getElementById('quotaReportChinese').value),
      p_indian_other_remaining: Number(document.getElementById('quotaReportIndian').value),
      p_observed_at: new Date(document.getElementById('quotaReportObserved').value).toISOString(),
      p_source_type: document.getElementById('quotaReportSource').value,
      p_source_note: document.getElementById('quotaReportNote').value,
      p_evidence_url: document.getElementById('quotaReportEvidence').value,
      p_reporter_token: reporterToken
    }, 'Block quota submitted.');
  });

  document.getElementById('progressReportForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const q = Number(document.getElementById('progressReportQueue').value);
    const d = Number(document.getElementById('progressReportDropouts').value);
    if (d > q) {
      showReportResult('Dropouts cannot exceed the last queue reached.', false);
      return;
    }
    await runSubmission(form, 'submit_progress_report', {
      p_queue_reached: q,
      p_dropouts: d,
      p_observed_at: new Date(document.getElementById('progressReportObserved').value).toISOString(),
      p_source_type: document.getElementById('progressReportSource').value,
      p_source_note: document.getElementById('progressReportNote').value,
      p_evidence_url: document.getElementById('progressReportEvidence').value,
      p_reporter_token: reporterToken
    }, 'Queue progress submitted.');
  });

  connectCommunityData();

  function blockUnits(id) { return units.filter(u => u.block === id); }

  function blockSpecialText(block) {
    const parts = [];
    if (terraceLevels(block).length) parts.push(`Sky terraces: ${terraceLevels(block).map(floorNumber).join(', ')}`);
    if (block.roofGardenAtTop) parts.push('Accessible roof garden shown at top');
    return parts.join(' · ');
  }

  function openBlock(block) {
    selectedBlock = block;
    selectedUnit = null;
    const floors = residentialFloors(block);
    selectedFloor = floors.length ? floors[floors.length - 1] : null;
    setSelectorView('level');
    quickUnitBar.hidden = true;
    quickUnitFeedback.textContent = '';
    if (window.__berlayarFlyToBlock) window.__berlayarFlyToBlock(block);
    const subset = blockUnits(block.id);
    const c = statusCounts(subset);
    document.getElementById('drawerBlockName').textContent = block.id;
    document.getElementById('drawerBlockMeta').textContent = `${block.total.toLocaleString()} flats · ${block.storeys} storeys`;
    document.getElementById('drawerGroundMeta').textContent = '';
    document.getElementById('drawerSpecialMeta').textContent = '';
    document.getElementById('drawerAvailable').textContent = availableCount(c).toLocaleString();
    document.getElementById('drawerTotal').textContent = block.total.toLocaleString();
    document.getElementById('drawerWait').textContent = `${block.waitMonths} mo`;
    document.getElementById('drawerTypeFilter').value = 'all';
    document.getElementById('drawerStatusFilter').value = 'all';
    renderUnitGrid();
    renderQuotaForSelectedBlock();
    blockDrawer.classList.add('open');
    blockDrawer.setAttribute('aria-hidden','false');
  }

  function closeDrawer() {
    blockDrawer.classList.remove('open');
    blockDrawer.setAttribute('aria-hidden','true');
  }
  document.getElementById('closeDrawerBtn').addEventListener('click', closeDrawer);
  document.getElementById('drawerTypeFilter').addEventListener('change', renderUnitGrid);
  document.getElementById('drawerStatusFilter').addEventListener('change', renderUnitGrid);

  const quotaCard = document.getElementById('quotaCard');
  const quotaToggleBtn = document.getElementById('quotaToggleBtn');
  function setQuotaCollapsed(collapsed) {
    quotaCard.classList.toggle('collapsed', collapsed);
    quotaToggleBtn.textContent = collapsed ? 'Show' : 'Hide';
    quotaToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  }
  quotaToggleBtn.addEventListener('click', () => setQuotaCollapsed(!quotaCard.classList.contains('collapsed')));
  setQuotaCollapsed(window.matchMedia('(max-width: 760px)').matches);

  function setSelectorView(view) {
    selectorView = view === 'all' ? 'all' : 'level';
    if (!levelViewBtn || !allFloorsViewBtn || !levelSelectorView || !allFloorsPanel) return;
    const levelMode = selectorView === 'level';
    levelViewBtn.classList.toggle('active', levelMode);
    allFloorsViewBtn.classList.toggle('active', !levelMode);
    levelSelectorView.hidden = !levelMode;
    allFloorsPanel.hidden = levelMode;
  }

  levelViewBtn?.addEventListener('click', () => setSelectorView('level'));
  allFloorsViewBtn?.addEventListener('click', () => {
    setSelectorView('all');
    requestAnimationFrame(() => allFloorsPanel?.querySelector('.unit-table-wrap')?.scrollTo({ top: 0, left: 0 }));
  });

  function unitMatchesFilters(u, typeFilter, statusFilter) {
    if (typeFilter !== 'all' && u.type !== typeFilter) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'available') return isAvailableStatus(u.status);
    return u.status === statusFilter;
  }

  function renderLevelSelector() {
    if (!selectedBlock) return;

    const typeFilter = document.getElementById('drawerTypeFilter').value;
    const statusFilter = document.getElementById('drawerStatusFilter').value;
    const floors = residentialFloors(selectedBlock).slice().sort((a,b) => b-a);

    if (!floors.includes(selectedFloor)) selectedFloor = floors[0] ?? null;

    levelRail.innerHTML = '';
    for (const floor of floors) {
      const floorUnits = blockUnits(selectedBlock.id).filter(u => u.floor === floor);
      const matching = floorUnits.filter(u => unitMatchesFilters(u, typeFilter, statusFilter));
      const taken = floorUnits.filter(u => ['reported_taken','confirmed_taken'].includes(u.status)).length;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-chip';
      btn.setAttribute('role','tab');
      btn.setAttribute('aria-selected', String(floor === selectedFloor));
      btn.classList.toggle('active', floor === selectedFloor);
      btn.classList.toggle('no-match', matching.length === 0);
      btn.innerHTML = `<strong>${floorNumber(floor)}</strong>${taken ? `<span>${taken} taken</span>` : ''}`;
      btn.addEventListener('click', () => {
        selectedFloor = floor;
        selectedUnit = null;
        quickUnitBar.hidden = true;
        quickUnitFeedback.textContent = '';
        renderLevelSelector();
      });
      levelRail.appendChild(btn);
    }

    if (selectedFloor == null) {
      currentLevelLabel.textContent = 'No residential levels';
      currentLevelMeta.textContent = '';
      levelUnitGrid.innerHTML = '';
      return;
    }

    const floorUnits = selectedBlock.stacks
      .map(stack => blockUnits(selectedBlock.id).find(u => u.floor === selectedFloor && u.stack === stack.no))
      .filter(Boolean);
    const visibleUnits = floorUnits.filter(u => unitMatchesFilters(u, typeFilter, statusFilter));
    const available = floorUnits.filter(u => isAvailableStatus(u.status)).length;

    currentLevelLabel.textContent = `Level ${floorNumber(selectedFloor)}`;
    currentLevelMeta.textContent = `${floorUnits.length} flats · ${available} available`;

    levelUnitGrid.innerHTML = '';
    if (!visibleUnits.length) {
      const empty = document.createElement('div');
      empty.className = 'level-unit-empty';
      empty.innerHTML = '<strong>No flats match these filters on this level.</strong><span>Try another level or clear the filters.</span>';
      levelUnitGrid.appendChild(empty);
      return;
    }

    for (const u of visibleUnits) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `level-unit-card ${u.status}`;
      if (selectedUnit?.id === u.id) btn.classList.add('selected-unit');

      const listedPrice = Number.isFinite(u.listedPrice) ? money(u.listedPrice) : '';
      btn.innerHTML = `
        <span class="level-unit-card-top">
          <strong>#${floorNumber(u.floor)}-${u.stack}</strong>
          <span class="level-unit-status">${statusLabel(u.status)}</span>
        </span>
        <span class="level-unit-type">${typeLabel(u.type)}</span>
        ${listedPrice ? `<span class="level-unit-price">${listedPrice}</span>` : ''}
      `;
      btn.addEventListener('click', () => selectUnitForQuickAction(u));
      levelUnitGrid.appendChild(btn);
    }

    const activeChip = levelRail.querySelector('.level-chip.active');
    activeChip?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
  }

  function specialTableRow(label, detail = '') {
    const tr = document.createElement('tr');
    tr.className = 'special-level-row';
    const th = document.createElement('th');
    th.textContent = detail;
    const td = document.createElement('td');
    td.colSpan = selectedBlock.stacks.length;
    td.innerHTML = `<div class="special-level-chip">${label}</div>`;
    tr.append(th, td);
    return tr;
  }

  function renderUnitGrid() {
    if (!selectedBlock) return;
    renderLevelSelector();
    const typeFilter = document.getElementById('drawerTypeFilter').value;
    const statusFilter = document.getElementById('drawerStatusFilter').value;
    const head = document.getElementById('unitTableHead');
    const body = document.getElementById('unitTableBody');
    head.innerHTML = `<tr><th class="floor-head">Level</th>${selectedBlock.stacks.map(s=>`<th><span>${s.no}</span><br><small>${typeLabel(s.type).replace('2-Room Flexi ','')}</small></th>`).join('')}</tr>`;
    body.innerHTML = '';

    const byKey = new Map(blockUnits(selectedBlock.id).map(u=>[`${u.floor}-${u.stack}`,u]));
    const terraces = new Set(terraceLevels(selectedBlock));

    if (selectedBlock.roofGardenAtTop && selectedBlock.storeys === selectedBlock.floors.max) {
      body.appendChild(specialTableRow('ROOF GARDEN · ACCESSIBLE', 'TOP'));
    }

    for (let level = selectedBlock.storeys; level >= 1; level--) {
      if (selectedBlock.roofGardenAtTop && level > selectedBlock.floors.max) {
        body.appendChild(specialTableRow('ROOF GARDEN · ACCESSIBLE', floorNumber(level)));
        continue;
      }
      if (terraces.has(level)) {
        body.appendChild(specialTableRow('SKY TERRACE · ACCESSIBLE', floorNumber(level)));
        continue;
      }
      if (level === 1) {
        body.appendChild(specialTableRow(selectedBlock.groundAmenities?.length ? selectedBlock.groundAmenities.join(' · ') : 'NO SALE UNITS SHOWN IN DISTRIBUTION CHART', '01'));
        continue;
      }
      if (level < selectedBlock.floors.min || level > selectedBlock.floors.max) continue;

      const tr = document.createElement('tr');
      tr.innerHTML = `<th>${floorNumber(level)}</th>`;
      for (const stack of selectedBlock.stacks) {
        const u = byKey.get(`${level}-${stack.no}`);
        const td = document.createElement('td');
        if (!u) {
          td.innerHTML = '<span class="unit-empty">—</span>';
          tr.appendChild(td);
          continue;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `unit-cell ${u.status}`;
        if (selectedUnit?.id === u.id) btn.classList.add('selected-unit');
        btn.textContent = `#${floorNumber(level)}-${stack.no}`;
        btn.title = `${typeLabel(u.type)} · ${statusLabel(u.status)}`;
        if (typeFilter !== 'all' && u.type !== typeFilter) btn.classList.add('hidden-type');
        if (!unitMatchesFilters(u, typeFilter, statusFilter)) btn.classList.add('hidden-status');
        btn.addEventListener('click', () => selectUnitForQuickAction(u));
        td.appendChild(btn);
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
  }

  function updateQuickUnitBar() {
    if (!selectedUnit || !selectedBlock || selectedUnit.block !== selectedBlock.id) {
      quickUnitBar.hidden = true;
      return;
    }
    quickUnitBar.hidden = false;
    quickUnitTitle.textContent = `#${floorNumber(selectedUnit.floor)}-${selectedUnit.stack}`;
    quickUnitMeta.textContent = `${typeLabel(selectedUnit.type)} · ${statusLabel(selectedUnit.status)}`;
  }

  function selectUnitForQuickAction(u) {
    selectedUnit = u;
    selectedFloor = u.floor;
    quickUnitFeedback.textContent = '';
    updateQuickUnitBar();
    renderUnitGrid();
  }

  async function quickReportSelectedUnit(status) {
    if (!selectedUnit) return;
    if (!communityDbReady || !supabase) {
      quickUnitFeedback.textContent = 'Community updates are unavailable right now.';
      return;
    }

    const buttons = [quickTakenBtn, quickAvailableBtn, quickDetailsBtn];
    buttons.forEach(btn => btn.disabled = true);
    quickUnitFeedback.textContent = status === 'taken' ? 'Reporting taken…' : 'Reporting available…';

    try {
      const { error } = await supabase.rpc('submit_unit_report', {
        p_block_code: selectedUnit.block,
        p_unit_no: `${floorNumber(selectedUnit.floor)}-${selectedUnit.stack}`,
        p_status: status,
        p_observed_at: new Date().toISOString(),
        p_source_type: 'community_observation',
        p_source_note: '',
        p_evidence_url: '',
        p_reporter_token: reporterToken
      });
      if (error) throw error;
      await refreshCommunityData();
      updateQuickUnitBar();
      quickUnitFeedback.textContent = status === 'taken' ? 'Taken report added.' : 'Available report added.';
    } catch (err) {
      console.error(err);
      quickUnitFeedback.textContent = err?.message || 'Could not submit the update.';
    } finally {
      buttons.forEach(btn => btn.disabled = false);
    }
  }

  quickTakenBtn.addEventListener('click', () => quickReportSelectedUnit('taken'));
  quickAvailableBtn.addEventListener('click', () => quickReportSelectedUnit('available'));
  quickDetailsBtn.addEventListener('click', () => {
    if (selectedUnit) openUnit(selectedUnit);
  });

  // ---------- Unit flat-plan redraws ----------
  function roomRect(x,y,w,h,label,kind='normal') {
    const safe = label.replace(/&/g,'&amp;');
    const words = safe.split(' ');
    let lines = [safe];
    if (safe.length > 14 && words.length > 1) {
      const half = Math.ceil(words.length/2);
      lines = [words.slice(0,half).join(' '), words.slice(half).join(' ')];
    }
    const ty = y + h/2 - (lines.length-1)*8;
    return `<g class="plan-room ${kind}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/><text x="${x+w/2}" y="${ty}" text-anchor="middle">${lines.map((line,i)=>`<tspan x="${x+w/2}" dy="${i===0?0:16}">${line}</tspan>`).join('')}</text></g>`;
  }

  function planSvg(type) {
    let rooms = '';
    if (type === '2R-T1') {
      rooms += roomRect(45,45,245,185,'Living / Dining','living');
      rooms += roomRect(290,45,215,185,'Bedroom','bed');
      rooms += roomRect(45,230,120,110,'Household Shelter','service');
      rooms += roomRect(250,230,135,110,'Bath / WC','wet');
      rooms += roomRect(385,230,120,110,'Air-con Ledge','external');
      rooms += roomRect(190,340,315,90,'Kitchen','kitchen');
      rooms += `<path class="plan-entry" d="M190 430h-42v-56h42"/><text class="plan-entry-label" x="143" y="455">ENTRY</text>`;
    } else if (type === '2R-T2') {
      rooms += roomRect(45,70,255,210,'Living / Dining','living');
      rooms += roomRect(300,45,220,115,'Bedroom','bed');
      rooms += roomRect(300,160,175,120,'Flexible Space','flex');
      rooms += roomRect(45,280,120,105,'Household Shelter','service');
      rooms += roomRect(300,280,120,105,'Bath / WC','wet');
      rooms += roomRect(420,280,100,105,'Air-con Ledge','external');
      rooms += roomRect(215,385,305,70,'Kitchen','kitchen');
      rooms += `<path class="plan-entry" d="M215 455h-45v-55h45"/><text class="plan-entry-label" x="160" y="475">ENTRY</text>`;
    } else if (type === '3R') {
      rooms += roomRect(35,95,275,220,'Living / Dining','living');
      rooms += roomRect(310,45,150,140,'Bedroom','bed');
      rooms += roomRect(460,45,175,195,'Main Bedroom','bed');
      rooms += roomRect(310,185,125,130,'Dry Kitchen','kitchen');
      rooms += roomRect(435,240,100,95,'Bath / WC','wet');
      rooms += roomRect(535,240,100,95,'Bath / WC','wet');
      rooms += roomRect(35,315,125,115,'Household Shelter','service');
      rooms += roomRect(310,335,225,95,'Kitchen / Utility','kitchen');
      rooms += roomRect(535,335,100,95,'Air-con Ledge','external');
      rooms += `<path class="plan-entry" d="M310 430h-58v-54h58"/><text class="plan-entry-label" x="245" y="457">ENTRY</text>`;
    } else {
      rooms += roomRect(35,85,285,230,'Living / Dining','living');
      rooms += roomRect(320,45,135,145,'Bedroom','bed');
      rooms += roomRect(455,45,135,145,'Bedroom','bed');
      rooms += roomRect(590,45,135,205,'Main Bedroom','bed');
      rooms += roomRect(35,315,125,115,'Household Shelter','service');
      rooms += roomRect(455,210,100,100,'Bath / WC','wet');
      rooms += roomRect(555,210,100,100,'Bath / WC','wet');
      rooms += roomRect(300,330,190,100,'Kitchen','kitchen');
      rooms += roomRect(490,330,115,100,'Service Yard','service');
      rooms += roomRect(605,330,120,100,'Air-con Ledge','external');
      rooms += `<path class="plan-entry" d="M300 430h-58v-54h58"/><text class="plan-entry-label" x="235" y="457">ENTRY</text>`;
    }
    return `<svg viewBox="0 0 760 500" role="img" aria-label="Simplified floor plan for ${typeLabel(type)}"><rect class="plan-bg" x="12" y="12" width="736" height="476" rx="10"/>${rooms}</svg>`;
  }

  function renderElevation(u) {
    const block = DATA.blocks.find(b => b.id === u.block);
    const terraces = new Set(terraceLevels(block));
    let html = `<div class="elevation-grid" style="--stack-count:${block.stacks.length}">`;
    html += `<div class="elev-corner">LV</div>${block.stacks.map(s=>`<div class="elev-stack"><strong>${s.no}</strong><small>${typeLabel(s.type).replace('2-Room Flexi ','')}</small></div>`).join('')}`;

    if (block.roofGardenAtTop && block.storeys === block.floors.max) {
      html += `<div class="elev-level top-label">TOP</div><div class="elev-special roof" style="grid-column:2 / span ${block.stacks.length}">ROOF GARDEN · ACCESSIBLE</div>`;
    }

    for (let level = block.storeys; level >= 1; level--) {
      if (block.roofGardenAtTop && level > block.floors.max) {
        html += `<div class="elev-level">${floorNumber(level)}</div><div class="elev-special roof" style="grid-column:2 / span ${block.stacks.length}">ROOF GARDEN · ACCESSIBLE</div>`;
        continue;
      }
      if (terraces.has(level)) {
        html += `<div class="elev-level">${floorNumber(level)}</div><div class="elev-special terrace" style="grid-column:2 / span ${block.stacks.length}">SKY TERRACE · ACCESSIBLE</div>`;
        continue;
      }
      if (level === 1) {
        const ground = block.groundAmenities?.join(' · ') || 'NO SALE UNITS';
        html += `<div class="elev-level">01</div><div class="elev-special ground" style="grid-column:2 / span ${block.stacks.length}">${ground}</div>`;
        continue;
      }
      if (level < block.floors.min || level > block.floors.max) continue;
      html += `<div class="elev-level">${floorNumber(level)}</div>`;
      for (const stack of block.stacks) {
        const selected = level === u.floor && stack.no === u.stack;
        const cellUnit = units.find(x => x.block === block.id && x.floor === level && x.stack === stack.no);
        const liveStatus = cellUnit?.status || 'untracked';
        html += `<div class="elev-unit status-${liveStatus}${selected?' selected':''}" style="--unit-color:${typeColorHex(stack.type)}" title="#${floorNumber(level)}-${stack.no} · ${typeLabel(stack.type)} · ${statusLabel(liveStatus)}">${selected?'<span>●</span>':''}</div>`;
      }
    }
    html += '</div>';
    return html;
  }

  function openUnit(u) {
    selectedUnit = u;
    const meta = DATA.flatTypes[u.type];
    const block = DATA.blocks.find(b=>b.id===u.block);
    const distributionSource = sourceMap.get(block.distributionSource);

    document.getElementById('unitCrumbBlock').textContent = `Block ${u.block}`;
    document.getElementById('unitTitle').textContent = `#${floorNumber(u.floor)}-${u.stack}`;
    document.getElementById('unitBlock').textContent = `Block ${u.block}`;
    document.getElementById('unitFloor').textContent = floorNumber(u.floor);
    document.getElementById('unitStack').textContent = u.stack;
    document.getElementById('unitType').textContent = meta.label;
    document.getElementById('unitArea').textContent = `${meta.area} sqm total · ${meta.internalArea} sqm internal`;
    document.getElementById('unitPrice').textContent = Number.isFinite(u.listedPrice)
      ? money(u.listedPrice)
      : 'Not available';
    document.getElementById('unitPriceRange').textContent = `${money(meta.price99[0])} – ${money(meta.price99[1])}`;
    document.getElementById('floorplanTitle').textContent = meta.label;
    document.getElementById('elevationTitle').textContent = `Block ${u.block} · #${floorNumber(u.floor)}-${u.stack}`;
    document.getElementById('unitElevation').innerHTML = renderElevation(u);
    document.getElementById('floorplanCanvas').innerHTML = planSvg(u.type);
    document.getElementById('unitRooms').innerHTML = meta.rooms.map(r=>`<span>${r}</span>`).join('');
    document.getElementById('unitLayoutNote').textContent = meta.layoutNote;
    document.getElementById('unitPlanSource').href = meta.sourcePlanUrl;
    document.getElementById('unitDistributionSource').href = distributionSource?.url || sourceMap.get('brochure')?.url || '#';
    updateUnitStatusUi(u);
    unitDialog.showModal();
  }

  document.getElementById('closeUnitBtn').addEventListener('click',()=>unitDialog.close());
  document.getElementById('focusFloorBtn').addEventListener('click', () => {
    if (!selectedUnit || !window.__berlayarHighlightUnit) return;
    unitDialog.close();
    window.__berlayarHighlightUnit(selectedUnit);
  });

  function openFeature(feature) {
    document.getElementById('featureTitle').textContent = feature.name;
    document.getElementById('featureDetail').textContent = feature.detail;
    document.getElementById('featureBasis').textContent = feature.sourceIds?.length ? 'Published reference' : 'Community reference';
    const links = (feature.sourceIds || []).map(id => sourceMap.get(id)).filter(Boolean);
    document.getElementById('featureSourceLinks').innerHTML = links.map(s => `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name} ↗</a>`).join('');
    featureDialog.showModal();
  }
  document.getElementById('closeFeatureBtn').addEventListener('click',()=>featureDialog.close());

  const sourcesList = document.getElementById('sourcesList');
  sourcesList.innerHTML = DATA.sources.map(s => `<div class="source-item"><div class="source-tier ${s.tier}">${s.tier === 'primary' ? 'PRIMARY' : s.tier === 'mirror' ? 'PUBLIC MIRROR' : 'CROSS-CHECK'}</div><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a><p>${s.use}</p></div>`).join('');
  document.getElementById('sourcesBtn').addEventListener('click',()=>sourcesDialog.showModal());
  document.getElementById('closeSourcesBtn').addEventListener('click',()=>sourcesDialog.close());

  // ---------- 3D scene ----------
  try {
    const THREE = await import('https://esm.sh/three@0.161.0');
    const { OrbitControls } = await import('https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js');
    if (loadingEl) loadingEl.remove();

    const labels = new Map();
    const featureLabels = new Map();
    const blockMeshes = [];
    const featureMeshes = [];
    const blockGroups = new Map();
    const amenityObjects = [];
    const linkObjects = [];
    const contextObjects = [];
    const planLabelObjects = [];
    let activeType = 'all';
    let cameraTween = null;
    let floorHighlight = null;
    let unitHighlight = null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1713);
    scene.fog = new THREE.Fog(0x0a1713, 64, 116);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220);
    camera.position.set(43, 48, 57);

    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    sceneHost.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .065;
    controls.minDistance = 19;
    controls.maxDistance = 110;
    controls.maxPolarAngle = Math.PI*.49;
    controls.target.set(-1,3,1);

    scene.add(new THREE.HemisphereLight(0xe5eee6,0x23352d,2.45));
    const sun = new THREE.DirectionalLight(0xffefd0,3.0);
    sun.position.set(-27,48,-20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.left=-55; sun.shadow.camera.right=55; sun.shadow.camera.top=55; sun.shadow.camera.bottom=-55;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(66,1.15,61),
      new THREE.MeshStandardMaterial({color:0x49624f,roughness:.98})
    );
    ground.position.set(-1,-.68,1.5); ground.receiveShadow=true; scene.add(ground);

    function addParcel(x,z,w,d,color,featureId=null) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(w,.08,d), new THREE.MeshStandardMaterial({color,roughness:1,transparent:true,opacity:.72}));
      p.position.set(x,.01,z);
      if (featureId) { p.userData={featureId,kind:'feature'}; featureMeshes.push(p); }
      scene.add(p); contextObjects.push(p); return p;
    }

    addParcel(-25.0,-25.0,10,8,0x5f7e61,'futurepark-nw');
    addParcel(9.5,32.0,18,6,0x5f7e61,'futurepark-south');
    addParcel(-33.2,-3.0,6.5,30,0x6f766f,'publichousing-west');
    addParcel(31.7,6.0,9,27,0x5d665b,'futurehousing-east');
    addParcel(-24.0,32.8,14,7,0x5d665b,'futurehousing-sw');
    addParcel(29.5,33.0,16,7,0x5d665b,'futurehousing-se');

    function addRoad(spec) {
      const road = new THREE.Mesh(new THREE.BoxGeometry(spec.w,.1,spec.d),new THREE.MeshStandardMaterial({color:0x313a37,roughness:1}));
      road.position.set(spec.x,.03,spec.z); road.rotation.y=spec.rotation||0; road.receiveShadow=true; scene.add(road); contextObjects.push(road);
    }
    DATA.roads.forEach(addRoad);

    // Internal road / path network. Geometry is deliberately schematic, based on source-plan connectivity.
    function addInternalRoad(x,z,w,d,rot=0) {
      const road = new THREE.Mesh(new THREE.BoxGeometry(w,.09,d),new THREE.MeshStandardMaterial({color:0x6b675c,roughness:1}));
      road.position.set(x,.07,z); road.rotation.y=rot; road.receiveShadow=true; scene.add(road); return road;
    }
    addInternalRoad(6.8,7.0,5,35,.36);
    addInternalRoad(-5.3,4.0,26,3.2,.03);
    addInternalRoad(-10.0,15.7,24,3.1,.03);
    addInternalRoad(12.7,-1.0,3.4,17,-.06);

    function addPath(x,z,w,d,rot=0) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(w,.055,d),new THREE.MeshStandardMaterial({color:0xc1bbaa,roughness:1}));
      p.position.set(x,.105,z); p.rotation.y=rot; scene.add(p); return p;
    }
    addPath(-4.0,-5.3,39,1.15,0);
    addPath(-8.0,9.0,29,1.1,-.05);
    addPath(0.5,18.0,31,1.1,.02);
    addPath(16.5,-3.2,1.0,17,0);

    function addTree(x,z,s=1) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,.68,6),new THREE.MeshStandardMaterial({color:0x5d4732}));
      trunk.position.set(x,.42,z);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.45*s,1),new THREE.MeshStandardMaterial({color:0x6f946e,roughness:1}));
      crown.position.set(x,1.02,z);
      scene.add(trunk,crown);
    }
    for (let i=0;i<58;i++) {
      const a=(i/58)*Math.PI*2;
      const rx=26+Math.sin(i*1.8)*2.7;
      const rz=25+Math.cos(i*2.3)*2.5;
      addTree(-1+Math.cos(a)*rx,2+Math.sin(a)*rz,.78+(i%5)*.06);
    }
    [[-10,2],[-13,6],[-8,7],[6,-1],[12,3],[5,14],[11,13],[-19,10],[-20,14],[-10,21],[0,22],[16,14],[17,-13],[-22,-4],[20,-14]].forEach(([x,z])=>addTree(x,z,1.06));

    function facadeTexture(block) {
      const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=512;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#e6e2d8'; ctx.fillRect(0,0,512,512);
      ctx.fillStyle='#2f413b';
      for(let row=0;row<20;row++) for(let col=0;col<block.stacks.length;col++) {
        const x=20+col*(472/block.stacks.length); const y=14+row*24;
        ctx.fillRect(x,y,Math.max(13,27-(block.stacks.length-6)*2),9);
      }
      ctx.fillStyle='#beb8aa'; ctx.fillRect(0,487,512,25);
      const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace; return tex;
    }

    const floorHeight = .39;

    function makeBuilding(block) {
      const g=new THREE.Group();
      const h=block.storeys*floorHeight;
      const mat=new THREE.MeshStandardMaterial({map:facadeTexture(block),color:0xffffff,roughness:.82});

      // Schematic crossed-wing tower: richer than a single cuboid, but intentionally not sold as exact BIM geometry.
      const mainWing=new THREE.Mesh(new THREE.BoxGeometry(block.model.width,h,block.model.depth),mat);
      mainWing.position.y=h/2; mainWing.castShadow=true; mainWing.receiveShadow=true; mainWing.userData={blockId:block.id,kind:'block'};
      blockMeshes.push(mainWing); g.add(mainWing);

      const crossWing=new THREE.Mesh(new THREE.BoxGeometry(block.model.width*.28,h*.94,block.model.depth*1.65),mat.clone());
      crossWing.position.set(-block.model.width*.08,h*.47,0); crossWing.castShadow=true; crossWing.receiveShadow=true; crossWing.userData={blockId:block.id,kind:'block'};
      blockMeshes.push(crossWing); g.add(crossWing);

      const podium=new THREE.Mesh(new THREE.BoxGeometry(block.model.width*1.07,.75,block.model.depth*1.14),new THREE.MeshStandardMaterial({color:0xc7c2b5,roughness:1}));
      podium.position.y=.38; podium.castShadow=true; g.add(podium);

      // Exact non-residential terrace levels from the unit-distribution charts, rendered as visual bands.
      for (const level of terraceLevels(block)) {
        const y=(level-.5)*floorHeight;
        const band=new THREE.Mesh(new THREE.BoxGeometry(block.model.width*1.05,.16,block.model.depth*1.18),new THREE.MeshStandardMaterial({color:0x73926b,roughness:.9,emissive:0x162b1c,emissiveIntensity:.25}));
        band.position.y=y; g.add(band);
      }

      if (block.roofGardenAtTop) {
        const roof=new THREE.Mesh(new THREE.BoxGeometry(block.model.width*.72,.16,block.model.depth*1.05),new THREE.MeshStandardMaterial({color:0x71956c,roughness:1}));
        roof.position.set(block.model.width*.08,h+.1,0); g.add(roof);
      }

      g.position.set(block.model.x,0,block.model.z); g.rotation.y=block.model.rotationY||0;
      scene.add(g); blockGroups.set(block.id,g);
    }
    DATA.blocks.forEach(makeBuilding);

    function addFeatureMesh(feature, mesh, layer='amenity') {
      mesh.userData.featureId=feature.id; mesh.userData.kind='feature'; featureMeshes.push(mesh);
      if(layer==='context') contextObjects.push(mesh); else amenityObjects.push(mesh);
      return mesh;
    }

    // MRT station north of the site.
    const mrtFeature=DATA.siteFeatures.find(f=>f.id==='mrt');
    const mrtGroup=new THREE.Group(); mrtGroup.position.set(mrtFeature.x,0,mrtFeature.z);
    const mrtBase=new THREE.Mesh(new THREE.BoxGeometry(12,1.5,3.4),new THREE.MeshStandardMaterial({color:0xb8b6ab,roughness:.8}));
    mrtBase.position.y=.75; addFeatureMesh(mrtFeature,mrtBase,'context'); mrtGroup.add(mrtBase);
    const mrtRoof=new THREE.Mesh(new THREE.BoxGeometry(12.6,.22,3.8),new THREE.MeshStandardMaterial({color:0xebe8dc,roughness:.8})); mrtRoof.position.y=1.62; mrtGroup.add(mrtRoof);
    const mrtLine=new THREE.Mesh(new THREE.BoxGeometry(11.3,.12,.18),new THREE.MeshStandardMaterial({color:0xf0a447})); mrtLine.position.set(0,1.2,1.73); mrtGroup.add(mrtLine);
    scene.add(mrtGroup); contextObjects.push(mrtGroup);

    // Preschool: source-backed 3-storey use; dimensions are schematic.
    const pre=DATA.siteFeatures.find(f=>f.id==='preschool');
    const preGroup=new THREE.Group(); preGroup.position.set(pre.x,0,pre.z);
    const preBody=new THREE.Mesh(new THREE.BoxGeometry(7.0,2.5,13.0),new THREE.MeshStandardMaterial({color:0xcabf9b,roughness:.9})); preBody.position.y=1.25; addFeatureMesh(pre,preBody); preGroup.add(preBody);
    const preRoof=new THREE.Mesh(new THREE.BoxGeometry(6.7,.18,12.7),new THREE.MeshStandardMaterial({color:0x71966c,roughness:1})); preRoof.position.y=2.58; preGroup.add(preRoof); scene.add(preGroup); amenityObjects.push(preGroup);

    // Block 203 MSCP: source-backed 6-storey / roof-garden use; footprint simplified from site plan.
    const mscp=DATA.siteFeatures.find(f=>f.id==='mscp');
    const shape=new THREE.Shape(); shape.absellipse(0,0,6.6,4.7,0,Math.PI*2,false,0);
    const hole=new THREE.Path(); hole.absellipse(.5,0,2.5,1.65,0,Math.PI*2,false,0); shape.holes.push(hole);
    const mscpGeo=new THREE.ExtrudeGeometry(shape,{depth:3.2,bevelEnabled:false,curveSegments:36}); mscpGeo.rotateX(-Math.PI/2);
    const mscpMesh=new THREE.Mesh(mscpGeo,new THREE.MeshStandardMaterial({color:0x817961,roughness:.9})); mscpMesh.position.set(mscp.x,0,mscp.z); mscpMesh.castShadow=true; mscpMesh.receiveShadow=true; addFeatureMesh(mscp,mscpMesh); scene.add(mscpMesh); amenityObjects.push(mscpMesh);
    const roofGarden=new THREE.Mesh(new THREE.RingGeometry(2.7,6.0,48),new THREE.MeshStandardMaterial({color:0x73926b,roughness:1,side:THREE.DoubleSide})); roofGarden.rotation.x=-Math.PI/2; roofGarden.scale.y=.75; roofGarden.position.set(mscp.x,3.23,mscp.z); scene.add(roofGarden); amenityObjects.push(roofGarden);

    function canopy(x,z,w,d,y=1.3,collection=amenityObjects) {
      const g=new THREE.Group();
      const roof=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),new THREE.MeshStandardMaterial({color:0xd8d1b6,roughness:.75})); roof.position.y=y; g.add(roof);
      for(const sx of [-w*.38,w*.38]) for(const sz of [-d*.34,d*.34]) { const p=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,y,6),new THREE.MeshStandardMaterial({color:0x7d7667})); p.position.set(sx,y/2,sz); g.add(p); }
      g.position.set(x,0,z); scene.add(g); collection.push(g); return g;
    }

    const roofShelters=DATA.siteFeatures.find(f=>f.id==='roofshelters');
    const c1=canopy(mscp.x-2.7,mscp.z-.5,1.8,1.2,3.75); c1.children[0].userData={featureId:roofShelters.id,kind:'feature'}; featureMeshes.push(c1.children[0]);
    const c2=canopy(mscp.x+2.8,mscp.z+.6,1.8,1.2,3.75); c2.children[0].userData={featureId:roofShelters.id,kind:'feature'}; featureMeshes.push(c2.children[0]);

    // RN centre marker integrated near 201B ground level.
    const rn=DATA.siteFeatures.find(f=>f.id==='rn');
    const rnMesh=new THREE.Mesh(new THREE.BoxGeometry(3.2,.55,1.0),new THREE.MeshStandardMaterial({color:0x8bb9a3,emissive:0x183329,emissiveIntensity:.3})); rnMesh.position.set(rn.x,.45,rn.z); addFeatureMesh(rn,rnMesh); scene.add(rnMesh); amenityObjects.push(rnMesh);

    // Grouped communal-space marker. We do not assign an unsupported standalone-block use.
    const community=DATA.siteFeatures.find(f=>f.id==='community-zone');
    const communityCanopy=canopy(community.x,community.z,4.2,3.0,1.25); communityCanopy.children[0].userData={featureId:community.id,kind:'feature'}; featureMeshes.push(communityCanopy.children[0]);

    const play=DATA.siteFeatures.find(f=>f.id==='play');
    const playPad=new THREE.Mesh(new THREE.CylinderGeometry(3.0,3.0,.08,32),new THREE.MeshStandardMaterial({color:0x9a8266,roughness:1})); playPad.position.set(play.x,.13,play.z); addFeatureMesh(play,playPad); scene.add(playPad); amenityObjects.push(playPad);
    [[-1.2,0,.35],[0,1,.45],[1.2,-.4,.3]].forEach(([dx,dz,s])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(s,12,8),new THREE.MeshStandardMaterial({color:0xd8c56d}));m.position.set(play.x+dx,.3+s,play.z+dz);scene.add(m);amenityObjects.push(m);});

    const fit=DATA.siteFeatures.find(f=>f.id==='fitness');
    for(let i=0;i<4;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(.12,.9,.12),new THREE.MeshStandardMaterial({color:0x9fc0a7}));bar.position.set(fit.x+i*.65,.55,fit.z+(i%2)*.5);scene.add(bar);amenityObjects.push(bar);}
    const fitHit=new THREE.Mesh(new THREE.BoxGeometry(3,.3,2),new THREE.MeshBasicMaterial({transparent:true,opacity:0})); fitHit.position.set(fit.x,.3,fit.z); addFeatureMesh(fit,fitHit); scene.add(fitHit); amenityObjects.push(fitHit);

    const hc=DATA.siteFeatures.find(f=>f.id==='hardcourt');
    const court=new THREE.Mesh(new THREE.BoxGeometry(5.7,.08,3.6),new THREE.MeshStandardMaterial({color:0x8f9c86,roughness:.9}));court.position.set(hc.x,.13,hc.z);addFeatureMesh(hc,court);scene.add(court);amenityObjects.push(court);
    for(const zoff of [-1.5,1.5]){const line=new THREE.Mesh(new THREE.BoxGeometry(5.2,.015,.05),new THREE.MeshBasicMaterial({color:0xd8dfd5}));line.position.set(hc.x,.18,hc.z+zoff);scene.add(line);amenityObjects.push(line);}

    // Two drop-off loops are described in public site-plan analysis. Placement remains schematic.
    function dropOff(x,z){const ring=new THREE.Mesh(new THREE.RingGeometry(1.25,1.65,28),new THREE.MeshStandardMaterial({color:0xa6a294,roughness:1,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.15,z);scene.add(ring);amenityObjects.push(ring);}
    dropOff(-13.2,-2.0); dropOff(8.1,1.9);

    // Future bus-stop markers: count is cross-checked; exact model placement is schematic.
    for (const id of ['future-bus-west','future-bus-south-1','future-bus-south-2']) {
      const f=DATA.siteFeatures.find(x=>x.id===id);
      const g=canopy(f.x,f.z,1.5,.7,.75,contextObjects);
      const hit=g.children[0]; hit.userData={featureId:f.id,kind:'feature'}; featureMeshes.push(hit);
    }

    // Published plan labels 200/202/204/205, with use intentionally not guessed.
    const planOnlyFeatures = DATA.planOnlyBlockLabels.map(p => ({
      id:`plan-block-${p.id}`,
      category:'context',
      name:`Block ${p.id} · source-plan label`,
      short:`${p.id}`,
      x:p.x,z:p.z,height:.8,confidence:'verified',geometry:'schematic',sourceIds:['brochure'],
      detail:`The published Berlayar Rise site plan labels this structure as Block ${p.id}. Its use is not clear enough in the references, so it is left unlabelled rather than guessed.`
    }));
    for (const f of planOnlyFeatures) {
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.4,.65,20),new THREE.MeshStandardMaterial({color:0x7f725f,roughness:.95}));
      mesh.position.set(f.x,.35,f.z); addFeatureMesh(f,mesh,'context'); scene.add(mesh); planLabelObjects.push(mesh);
    }

    // Sheltered linkway network: connectivity is source-backed; routes are a sketch.
    function addShelteredLink(from,to) {
      const [x1,z1]=from,[x2,z2]=to; const dx=x2-x1,dz=z2-z1; const len=Math.hypot(dx,dz); const angle=Math.atan2(dz,dx);
      const g=new THREE.Group(); g.position.set((x1+x2)/2,0,(z1+z2)/2); g.rotation.y=-angle;
      const walk=new THREE.Mesh(new THREE.BoxGeometry(len,.055,.7),new THREE.MeshStandardMaterial({color:0xcac3b1,roughness:1}));walk.position.y=.13;g.add(walk);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(len,.08,.85),new THREE.MeshStandardMaterial({color:0xcdd7cd,roughness:.7,transparent:true,opacity:.76}));roof.position.y=.95;g.add(roof);
      const count=Math.max(2,Math.floor(len/3));
      for(let i=0;i<=count;i++){const x=-len/2+(i/count)*len;const p=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.85,5),new THREE.MeshStandardMaterial({color:0x758078}));p.position.set(x,.52,-.32);g.add(p);}
      scene.add(g); linkObjects.push(g);
    }
    DATA.shelteredLinks.forEach(l=>addShelteredLink(l.from,l.to));

    // Block labels. Live community counts are deliberately shown as tracked/taken, not inferred availability.
    function refreshBlockLabels(){
      for(const block of DATA.blocks){
        const el=labels.get(block.id);
        if(!el) continue;
        const c=statusCounts(blockUnits(block.id));
        el.innerHTML=`<strong>${block.id}</strong><span>${c.confirmed_taken.toLocaleString()} / ${block.total.toLocaleString()} taken</span>`;
      }
    }
    for(const block of DATA.blocks){
      const el=document.createElement('button'); el.type='button'; el.className='block-label';
      el.addEventListener('click',()=>openBlock(block)); sceneHost.appendChild(el); labels.set(block.id,el);
    }
    window.__berlayarRefreshBlockLabels=refreshBlockLabels;
    refreshBlockLabels();

    const majorFeatureIds=new Set(['mrt','preschool','mscp','rn','community-zone','play','hardcourt','future-bus-west','future-bus-south-1','future-bus-south-2','futurepark-nw','futurepark-south','publichousing-west','futurehousing-east']);
    const allLabelFeatures=[...DATA.siteFeatures,...planOnlyFeatures];
    for(const feature of allLabelFeatures){
      if(!majorFeatureIds.has(feature.id) && !feature.id.startsWith('plan-block-')) continue;
      const el=document.createElement('button'); el.type='button'; el.className=`feature-label ${feature.category}`; el.textContent=feature.short;
      el.addEventListener('click',()=>openFeature(feature)); sceneHost.appendChild(el); featureLabels.set(feature.id,el);
    }

    // Road labels: names are source-backed; screen positions are illustrative.
    const roadLabels=[
      {text:'TELOK BLANGAH ROAD / WEST COAST HIGHWAY',x:0,z:-32.8},
      {text:'BERLAYAR STREET',x:-32.2,z:2},
      {text:'BERLAYAR DRIVE',x:4,z:31.2}
    ];
    const roadLabelEls=[];
    roadLabels.forEach(r=>{const el=document.createElement('div');el.className='road-label';el.textContent=r.text;sceneHost.appendChild(el);roadLabelEls.push({el,...r});});

    function resize(){const r=sceneHost.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
    window.addEventListener('resize',resize); resize();

    function screenPosition(x,y,z){const p=new THREE.Vector3(x,y,z).project(camera);const r=sceneHost.getBoundingClientRect();return {x:(p.x*.5+.5)*r.width,y:(-p.y*.5+.5)*r.height,behind:p.z>1};}
    function updateLabels(){
      for(const block of DATA.blocks){const p=screenPosition(block.model.x,block.storeys*floorHeight+1.7,block.model.z);const el=labels.get(block.id);el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;el.style.display=p.behind?'none':'';}
      for(const feature of allLabelFeatures){const el=featureLabels.get(feature.id);if(!el)continue;const p=screenPosition(feature.x,(feature.height||.5)+1,feature.z);el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;el.style.display=p.behind?'none':'';}
      roadLabelEls.forEach(r=>{const p=screenPosition(r.x,.25,r.z);r.el.style.left=`${p.x}px`;r.el.style.top=`${p.y}px`;r.el.style.display=p.behind?'none':'';});
    }

    function animate(t){
      requestAnimationFrame(animate);
      if(cameraTween){
        const p=Math.min(1,(t-cameraTween.start)/cameraTween.duration); const e=1-Math.pow(1-p,3);
        camera.position.lerpVectors(cameraTween.fromPos,cameraTween.toPos,e);
        controls.target.lerpVectors(cameraTween.fromTarget,cameraTween.toTarget,e);
        if(p>=1)cameraTween=null;
      }
      controls.update(); updateLabels(); renderer.render(scene,camera);
    }
    requestAnimationFrame(animate);

    function flyTo(pos,target,duration=780){
      cameraTween={start:performance.now(),duration,fromPos:camera.position.clone(),toPos:pos,fromTarget:controls.target.clone(),toTarget:target};
    }

    function flyToBlock(block){
      const target=new THREE.Vector3(block.model.x,block.storeys*.14,block.model.z);
      const pos=new THREE.Vector3(block.model.x+15,block.storeys*.23+12,block.model.z+18);
      flyTo(pos,target,780);
    }
    window.__berlayarFlyToBlock=flyToBlock;

    function clearHighlights(){
      if(floorHighlight){floorHighlight.parent?.remove(floorHighlight);floorHighlight=null;}
      if(unitHighlight){unitHighlight.parent?.remove(unitHighlight);unitHighlight=null;}
    }

    function resetView(){
      clearHighlights();
      flyTo(new THREE.Vector3(43,48,57),new THREE.Vector3(-1,3,1),850);
    }
    document.getElementById('resetViewBtn').addEventListener('click',resetView);

    document.getElementById('planViewBtn').addEventListener('click',()=>{
      clearHighlights();
      flyTo(new THREE.Vector3(-1,78,2),new THREE.Vector3(-1,0,2),850);
    });

    function highlightUnit(u){
      clearHighlights();
      const block=DATA.blocks.find(b=>b.id===u.block); const group=blockGroups.get(u.block); if(!block||!group)return;
      const y=(u.floor-.5)*floorHeight;

      floorHighlight=new THREE.Mesh(
        new THREE.BoxGeometry(block.model.width*1.09,.12,block.model.depth*1.18),
        new THREE.MeshBasicMaterial({color:0xd8f09e,transparent:true,opacity:.30})
      );
      floorHighlight.position.y=y; group.add(floorHighlight);

      const stackIndex=block.stacks.findIndex(s=>s.no===u.stack);
      const cellW=block.model.width/block.stacks.length;
      const x=-block.model.width/2 + cellW*(stackIndex+.5);
      unitHighlight=new THREE.Mesh(
        new THREE.BoxGeometry(cellW*.78,floorHeight*.68,.12),
        new THREE.MeshBasicMaterial({color:0xf2ff9c,transparent:true,opacity:.92})
      );
      unitHighlight.position.set(x,y,block.model.depth/2+.09); group.add(unitHighlight);

      const target=new THREE.Vector3(block.model.x,y,block.model.z);
      const pos=new THREE.Vector3(block.model.x+10,y+5.8,block.model.z+13);
      flyTo(pos,target,720);
    }
    window.__berlayarHighlightUnit=highlightUnit;

    // Raycast blocks and site features.
    const raycaster=new THREE.Raycaster(); const pointer=new THREE.Vector2(); let down={x:0,y:0};
    renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
    renderer.domElement.addEventListener('pointerup',e=>{
      if(e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;
      const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);
      const hits=raycaster.intersectObjects([...blockMeshes,...featureMeshes],false);if(!hits.length)return;
      const hit=hits[0].object;
      if(hit.userData.kind==='block'){const block=DATA.blocks.find(b=>b.id===hit.userData.blockId);if(block)openBlock(block);}
      else if(hit.userData.kind==='feature'){
        const f=allLabelFeatures.find(x=>x.id===hit.userData.featureId) || DATA.siteFeatures.find(x=>x.id===hit.userData.featureId);
        if(f)openFeature(f);
      }
    });

    document.getElementById('typeFilters').addEventListener('click',e=>{
      const btn=e.target.closest('[data-type]');if(!btn)return;activeType=btn.dataset.type;
      document.querySelectorAll('#typeFilters .filter').forEach(b=>b.classList.toggle('active',b===btn));
      for(const block of DATA.blocks){
        const has=activeType==='all'||block.stacks.some(s=>s.type===activeType); const g=blockGroups.get(block.id);
        g.traverse(obj=>{if(obj.isMesh&&obj!==floorHighlight&&obj!==unitHighlight){obj.material.transparent=!has;obj.material.opacity=has?1:.18;}});
        labels.get(block.id).classList.toggle('dimmed',!has);
      }
    });

    function setLayer(objects,visible){objects.forEach(o=>o.visible=visible);}
    document.getElementById('layerAmenities').addEventListener('change',e=>{
      setLayer(amenityObjects,e.target.checked);
      for(const [id,el] of featureLabels){const f=allLabelFeatures.find(x=>x.id===id);if(f && f.category!=='context'&&f.category!=='transport')el.classList.toggle('layer-hidden',!e.target.checked);}
    });
    document.getElementById('layerLinks').addEventListener('change',e=>setLayer(linkObjects,e.target.checked));
    document.getElementById('layerContext').addEventListener('change',e=>{
      setLayer(contextObjects,e.target.checked);
      for(const [id,el] of featureLabels){const f=allLabelFeatures.find(x=>x.id===id);if(f && (f.category==='context'||f.category==='transport'))el.classList.toggle('layer-hidden',!e.target.checked);}
    });

  } catch(error) {
    console.error('Berlayar 3D viewer failed to initialise:',error);
    if(loadingEl) loadingEl.remove();
    sceneHost.innerHTML = `
      <div class="fallback-map" role="img" aria-label="2D fallback map of Berlayar Rise">
        <div class="fallback-road north">Telok Blangah Road / West Coast Highway</div>
        <button class="fallback-feature mrt" data-feature="mrt">Telok Blangah MRT</button>
        <button class="fallback-block b200a" data-block="200A">200A</button>
        <button class="fallback-block b200b" data-block="200B">200B</button>
        <button class="fallback-block b201a" data-block="201A">201A</button>
        <button class="fallback-block b201b" data-block="201B">201B</button>
        <button class="fallback-block b204a" data-block="204A">204A</button>
        <button class="fallback-block b204b" data-block="204B">204B</button>
        <button class="fallback-feature preschool" data-feature="preschool">3-storey preschool</button>
        <button class="fallback-feature mscp" data-feature="mscp">203 MSCP + roof garden</button>
        <div class="fallback-warning"><strong>3D library could not load.</strong><span>You can still select blocks and flats from this map.</span></div>
      </div>`;
    sceneHost.querySelectorAll('[data-block]').forEach(el=>el.addEventListener('click',()=>{const b=DATA.blocks.find(x=>x.id===el.dataset.block);if(b)openBlock(b);}));
    sceneHost.querySelectorAll('[data-feature]').forEach(el=>el.addEventListener('click',()=>{const f=DATA.siteFeatures.find(x=>x.id===el.dataset.feature);if(f)openFeature(f);}));
    document.getElementById('planViewBtn').disabled = true;
    document.getElementById('resetViewBtn').disabled = true;
  }
})();
