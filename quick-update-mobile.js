(async function initialiseRiseBlockQuickUpdateMobile() {
  'use strict';

  const MOBILE_QUERY = '(max-width: 760px)';
  const CFG = window.BERLAYAR_COMMUNITY;
  const DATA = window.BERLAYAR_DATA;
  const REPORTER_TOKEN_KEY = 'berlayar_rise_reporter_token_v1';
  const LAST_BLOCK_KEY = 'riseblock_quick_update_last_block_v1';
  const LAST_MODE_KEY = 'riseblock_quick_update_last_mode_v1';
  const LAST_FLOORS_KEY = 'riseblock_quick_update_last_floors_v1';

  if (!CFG?.url || !CFG?.publishableKey || !DATA?.blocks?.length) {
    console.warn('Quick Update: required RiseBlock configuration is unavailable.');
    return;
  }

  const $ = id => document.getElementById(id);
  const typeLabel = type => DATA.flatTypes?.[type]?.label || type;
  const blocks = DATA.blocks.map(block => block.id);

  let client = null;
  let undoTimer = null;
  let undoTickTimer = null;

  const state = {
    mode: readStorage(LAST_MODE_KEY) === 'booking' ? 'booking' : 'bulk',
    block: blocks.includes(readStorage(LAST_BLOCK_KEY)) ? readStorage(LAST_BLOCK_KEY) : blocks[0],
    floor: null,
    selected: new Map(),
    blockRows: new Map(),
    loadingBlock: null,
    busy: false,
    dirtyCount: 0,
    lastUndo: null,
    lastFloors: readJsonStorage(LAST_FLOORS_KEY, {})
  };

  function readStorage(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  function readJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJsonStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function fallbackUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
      const rand = Math.random() * 16 | 0;
      const value = char === 'x' ? rand : (rand & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  function getReporterToken() {
    try {
      let token = localStorage.getItem(REPORTER_TOKEN_KEY);
      if (!token) {
        token = crypto.randomUUID ? crypto.randomUUID() : fallbackUuid();
        localStorage.setItem(REPORTER_TOKEN_KEY, token);
      }
      return token;
    } catch (_) {
      return crypto.randomUUID ? crypto.randomUUID() : fallbackUuid();
    }
  }

  const reporterToken = getReporterToken();

  function statusLabel(status) {
    return {
      available: 'Available',
      reported_taken: 'Reported taken',
      confirmed_taken: 'Taken',
      conflicting: 'Conflicting'
    }[status] || 'Available';
  }

  function isConfirmedTaken(row) {
    return row?.community_status === 'confirmed_taken';
  }

  function isReportedTaken(row) {
    return row?.community_status === 'reported_taken';
  }

  function unitKey(blockCode, unitNo) {
    return `${blockCode}|${unitNo}`;
  }

  function safeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
    }[char]));
  }

  function normaliseUnitInput(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 5);
    if (digits.length < 4) return digits;
    const stack = digits.slice(-3);
    const floor = digits.slice(0, -3).padStart(2, '0');
    return `${floor}-${stack}`;
  }

  function injectTrigger() {
    if ($('quickUpdateMobileBtn')) return;

    const flatTypeBtn = $('flatTypeBtn');
    if (!flatTypeBtn) return;

    const button = document.createElement('button');
    button.id = 'quickUpdateMobileBtn';
    button.className = 'quick-update-mobile-trigger';
    button.type = 'button';
    button.setAttribute('aria-label', 'Quick update');
    button.setAttribute('aria-haspopup', 'dialog');
    button.innerHTML = `
      <span class="qum-trigger-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M13.6 2.8 6.9 12h4.5l-1 9.2 6.7-10.4h-4.3l.8-8z"></path>
          <path class="qum-trigger-check" d="m15.5 17.2 1.6 1.6 3.2-3.6"></path>
        </svg>
      </span>
      <span class="qum-trigger-copy"><b>Quick</b><b>Update</b></span>
    `;

    flatTypeBtn.insertAdjacentElement('afterend', button);
    button.addEventListener('click', openQuickUpdate);
  }

  function injectDialog() {
    if ($('quickUpdateMobileDialog')) return;

    const dialog = document.createElement('dialog');
    dialog.id = 'quickUpdateMobileDialog';
    dialog.className = 'qum-dialog';
    dialog.innerHTML = `
      <div class="qum-shell">
        <header class="qum-head">
          <div class="qum-head-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M13.6 2.8 6.9 12h4.5l-1 9.2 6.7-10.4h-4.3l.8-8z"></path>
            </svg>
          </div>
          <div class="qum-head-copy">
            <span>FAST MOBILE ENTRY</span>
            <h2>Quick update</h2>
          </div>
          <button id="qumCloseBtn" class="qum-close" type="button" aria-label="Close quick update">×</button>
        </header>

        <div class="qum-mode-switch" role="tablist" aria-label="Quick update mode">
          <button id="qumModeBulk" class="qum-mode-btn" data-mode="bulk" type="button" role="tab">
            <strong>Many taken</strong>
            <small>Tap several units</small>
          </button>
          <button id="qumModeBooking" class="qum-mode-btn" data-mode="booking" type="button" role="tab">
            <strong>My booking</strong>
            <small>Mark one flat fast</small>
          </button>
        </div>

        <main class="qum-body">
          <section class="qum-picker-section" aria-labelledby="qumBlockLabel">
            <div class="qum-section-head">
              <div><span class="qum-step">1</span><strong id="qumBlockLabel">Block</strong></div>
              <small id="qumDbState">Connecting…</small>
            </div>
            <div id="qumBlockRail" class="qum-chip-rail" role="group" aria-label="Choose block"></div>
          </section>

          <section id="qumBulkPanel" class="qum-mode-panel">
            <section class="qum-picker-section" aria-labelledby="qumFloorLabel">
              <div class="qum-section-head">
                <div><span class="qum-step">2</span><strong id="qumFloorLabel">Level</strong></div>
                <small>Choose a floor</small>
              </div>
              <div id="qumFloorRail" class="qum-chip-rail qum-floor-rail" role="group" aria-label="Choose floor"></div>
            </section>

            <section class="qum-picker-section qum-unit-section" aria-labelledby="qumUnitsLabel">
              <div class="qum-section-head">
                <div><span class="qum-step">3</span><strong id="qumUnitsLabel">Tap taken units</strong></div>
                <small id="qumFloorSummary">Choose a level first</small>
              </div>
              <div id="qumUnitGrid" class="qum-unit-grid" aria-live="polite"></div>
            </section>
          </section>

          <section id="qumBookingPanel" class="qum-mode-panel" hidden>
            <section class="qum-picker-section">
              <div class="qum-section-head">
                <div><span class="qum-step">2</span><strong>Your unit</strong></div>
                <small>Numbers only is fine</small>
              </div>

              <label class="qum-unit-input-wrap">
                <span>#</span>
                <input id="qumBookingUnitInput" type="text" inputmode="numeric"
                       autocomplete="off" maxlength="6" placeholder="12-105"
                       aria-label="Booked unit number" />
              </label>
              <p class="qum-input-hint">Example: typing <b>12105</b> becomes <b>12-105</b>.</p>

              <div id="qumBookingMatch" class="qum-booking-match" aria-live="polite"></div>
            </section>
          </section>
        </main>

        <div id="qumUndoBar" class="qum-undo-bar" hidden>
          <div>
            <strong id="qumUndoText">Update submitted.</strong>
            <small id="qumUndoCountdown">Undo available for 10s</small>
          </div>
          <button id="qumUndoBtn" type="button">Undo</button>
        </div>

        <footer id="qumBulkFooter" class="qum-footer">
          <div class="qum-selection-summary">
            <strong id="qumSelectedCount">0 selected</strong>
            <button id="qumClearBtn" type="button">Clear</button>
          </div>
          <button id="qumSubmitBulkBtn" class="qum-primary-action" type="button" disabled>
            Confirm taken
          </button>
        </footer>
      </div>
    `;
    document.body.appendChild(dialog);

    $('qumCloseBtn').addEventListener('click', closeQuickUpdate);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeQuickUpdate();
    });

    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeQuickUpdate();
    });

    $('qumModeBulk').addEventListener('click', () => setMode('bulk'));
    $('qumModeBooking').addEventListener('click', () => setMode('booking'));
    $('qumClearBtn').addEventListener('click', clearSelection);
    $('qumSubmitBulkBtn').addEventListener('click', submitBulkSelection);
    $('qumBookingUnitInput').addEventListener('input', handleBookingInput);
    $('qumUndoBtn').addEventListener('click', undoLastQuickUpdate);

    renderMode();
    renderBlocks();
  }

  async function connectClient() {
    if (client) return client;

    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.117.2');
      client = createClient(CFG.url, CFG.publishableKey, {
        db: { schema: CFG.schema || 'riseblock' }
      });
      $('qumDbState').textContent = 'Connected';
      return client;
    } catch (error) {
      console.error('Quick Update connection failed:', error);
      $('qumDbState').textContent = 'Unavailable';
      throw error;
    }
  }

  async function openQuickUpdate() {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;

    const dialog = $('quickUpdateMobileDialog');
    if (!dialog) return;

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');

    document.documentElement.classList.add('qum-open');

    try {
      await connectClient();
      await selectBlock(state.block, { preserveFloor: true });
      renderMode();

      if (state.mode === 'booking') {
        window.setTimeout(() => $('qumBookingUnitInput')?.focus(), 80);
      }
    } catch (_) {
      renderOfflineState();
    }
  }

  function closeQuickUpdate() {
    const dialog = $('quickUpdateMobileDialog');
    if (!dialog) return;

    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');

    document.documentElement.classList.remove('qum-open');

    if (state.dirtyCount > 0) {
      window.setTimeout(() => window.location.reload(), 80);
    }
  }

  function setMode(mode) {
    if (!['bulk', 'booking'].includes(mode)) return;
    state.mode = mode;
    writeStorage(LAST_MODE_KEY, mode);
    renderMode();

    if (mode === 'booking') {
      window.setTimeout(() => $('qumBookingUnitInput')?.focus(), 50);
      renderBookingMatch();
    } else {
      renderFloors();
      renderUnits();
    }
  }

  function renderMode() {
    const isBulk = state.mode === 'bulk';

    $('qumModeBulk').classList.toggle('active', isBulk);
    $('qumModeBulk').setAttribute('aria-selected', String(isBulk));
    $('qumModeBooking').classList.toggle('active', !isBulk);
    $('qumModeBooking').setAttribute('aria-selected', String(!isBulk));

    $('qumBulkPanel').hidden = !isBulk;
    $('qumBookingPanel').hidden = isBulk;
    $('qumBulkFooter').hidden = !isBulk;

    if (isBulk) {
      renderFloors();
      renderUnits();
      renderSelectedSummary();
    }
  }

  function renderBlocks() {
    const rail = $('qumBlockRail');
    if (!rail) return;

    rail.innerHTML = '';
    for (const blockCode of blocks) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `qum-chip${state.block === blockCode ? ' active' : ''}`;
      button.textContent = blockCode;
      button.setAttribute('aria-pressed', String(state.block === blockCode));
      button.addEventListener('click', () => selectBlock(blockCode));
      rail.appendChild(button);
    }
  }

  async function selectBlock(blockCode, options = {}) {
    if (!blocks.includes(blockCode)) return;

    state.block = blockCode;
    writeStorage(LAST_BLOCK_KEY, blockCode);
    renderBlocks();

    try {
      await loadBlockRows(blockCode);
    } catch (error) {
      console.error(error);
      renderOfflineState();
      return;
    }

    const floors = floorsForBlock(blockCode);

    if (state.mode === 'bulk') {
      const remembered = Number(state.lastFloors[blockCode]);
      const preserve = options.preserveFloor && floors.includes(Number(state.floor));
      if (!preserve) {
        state.floor = floors.includes(remembered) ? remembered : null;
      }
      renderFloors();
      renderUnits();
    } else {
      renderBookingMatch();
    }
  }

  async function loadBlockRows(blockCode, force = false) {
    if (!client) await connectClient();
    if (!force && state.blockRows.has(blockCode)) return state.blockRows.get(blockCode);

    state.loadingBlock = blockCode;
    $('qumDbState').textContent = 'Loading…';

    const { data, error } = await client
      .from('unit_status_current')
      .select('block_code,unit_no,floor,stack_no,flat_type,community_status,taken_reports,available_reports')
      .eq('block_code', blockCode)
      .order('floor', { ascending: true })
      .order('stack_no', { ascending: true });

    state.loadingBlock = null;

    if (error) {
      $('qumDbState').textContent = 'Unavailable';
      throw error;
    }

    state.blockRows.set(blockCode, data || []);
    $('qumDbState').textContent = 'Connected';
    return data || [];
  }

  function rowsForBlock(blockCode = state.block) {
    return state.blockRows.get(blockCode) || [];
  }

  function floorsForBlock(blockCode = state.block) {
    return [...new Set(rowsForBlock(blockCode).map(row => Number(row.floor)))]
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
  }

  function renderFloors() {
    const rail = $('qumFloorRail');
    if (!rail) return;

    const floors = floorsForBlock();
    rail.innerHTML = '';

    if (!floors.length) {
      rail.innerHTML = '<div class="qum-empty-inline">No levels available.</div>';
      return;
    }

    for (const floor of floors) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `qum-chip qum-floor-chip${Number(state.floor) === floor ? ' active' : ''}`;
      button.textContent = `L${String(floor).padStart(2, '0')}`;
      button.setAttribute('aria-pressed', String(Number(state.floor) === floor));
      button.addEventListener('click', () => {
        state.floor = floor;
        state.lastFloors[state.block] = floor;
        writeJsonStorage(LAST_FLOORS_KEY, state.lastFloors);
        renderFloors();
        renderUnits();
      });
      rail.appendChild(button);
    }
  }

  function renderUnits() {
    const grid = $('qumUnitGrid');
    const summary = $('qumFloorSummary');
    if (!grid || !summary) return;

    grid.innerHTML = '';

    if (!state.floor) {
      summary.textContent = 'Choose a level first';
      grid.innerHTML = `
        <div class="qum-empty-state">
          <span>↑</span>
          <strong>Pick a level</strong>
          <small>Then tap every unit you can see is taken.</small>
        </div>
      `;
      return;
    }

    const units = rowsForBlock()
      .filter(row => Number(row.floor) === Number(state.floor))
      .sort((a, b) => Number(a.stack_no) - Number(b.stack_no));

    summary.textContent = `${state.block} · Level ${String(state.floor).padStart(2, '0')} · ${units.length} flats`;

    for (const row of units) {
      const key = unitKey(row.block_code, row.unit_no);
      const selected = state.selected.has(key);
      const confirmed = isConfirmedTaken(row);
      const reported = isReportedTaken(row);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = [
        'qum-unit',
        `status-${row.community_status || 'available'}`,
        selected ? 'selected' : '',
        confirmed ? 'locked' : ''
      ].filter(Boolean).join(' ');

      button.disabled = confirmed;
      button.setAttribute('aria-pressed', String(selected));

      button.innerHTML = `
        <span class="qum-unit-no">#${safeText(row.unit_no)}</span>
        <span class="qum-unit-type">${safeText(typeLabel(row.flat_type))}</span>
        <span class="qum-unit-status">
          ${confirmed ? 'Already taken' : selected ? 'Selected ✓' : reported ? 'Reported taken · tap to support' : statusLabel(row.community_status)}
        </span>
      `;

      if (!confirmed) {
        button.addEventListener('click', () => toggleUnit(row));
      }

      grid.appendChild(button);
    }
  }

  function toggleUnit(row) {
    const key = unitKey(row.block_code, row.unit_no);
    if (state.selected.has(key)) state.selected.delete(key);
    else state.selected.set(key, row);

    renderUnits();
    renderSelectedSummary();
  }

  function clearSelection() {
    state.selected.clear();
    renderUnits();
    renderSelectedSummary();
  }

  function renderSelectedSummary() {
    const count = state.selected.size;
    $('qumSelectedCount').textContent = `${count} selected`;
    $('qumClearBtn').disabled = count === 0 || state.busy;

    const submit = $('qumSubmitBulkBtn');
    submit.disabled = count === 0 || state.busy;
    submit.textContent = count ? `Confirm ${count} taken` : 'Confirm taken';
  }

  async function submitBulkSelection() {
    if (state.busy || state.selected.size === 0) return;

    const units = [...state.selected.values()].map(row => ({
      block_code: row.block_code,
      unit_no: row.unit_no
    }));

    await submitQuickTaken(units, {
      successText: count => `${count} taken update${count === 1 ? '' : 's'} submitted.`
    });

    state.selected.clear();
    renderSelectedSummary();
    await reloadCachedStatuses();
    renderUnits();
  }

  function handleBookingInput(event) {
    const input = event.target;
    const formatted = normaliseUnitInput(input.value);
    if (input.value !== formatted) input.value = formatted;
    renderBookingMatch();
  }

  function findBookingUnit() {
    const input = $('qumBookingUnitInput');
    if (!input) return null;

    const unitNo = normaliseUnitInput(input.value);
    if (!unitNo.includes('-')) return null;

    return rowsForBlock().find(row => row.unit_no === unitNo) || null;
  }

  function renderBookingMatch() {
    const host = $('qumBookingMatch');
    if (!host) return;

    const input = $('qumBookingUnitInput');
    const raw = input?.value?.trim() || '';

    if (!raw) {
      host.innerHTML = `
        <div class="qum-booking-placeholder">
          <strong>Enter your booked unit</strong>
          <span>Choose the block above, then type the unit number.</span>
        </div>
      `;
      return;
    }

    const row = findBookingUnit();
    if (!row) {
      host.innerHTML = `
        <div class="qum-booking-placeholder warning">
          <strong>No matching unit yet</strong>
          <span>Check the block and unit number.</span>
        </div>
      `;
      return;
    }

    const confirmed = isConfirmedTaken(row);
    const reported = isReportedTaken(row);

    host.innerHTML = `
      <div class="qum-booking-card">
        <div>
          <span>BLOCK ${safeText(row.block_code)}</span>
          <strong>#${safeText(row.unit_no)}</strong>
          <small>${safeText(typeLabel(row.flat_type))} · ${safeText(statusLabel(row.community_status))}</small>
        </div>
        <button id="qumBookTakenBtn" class="qum-book-taken-btn" type="button" ${confirmed || state.busy ? 'disabled' : ''}>
          ${confirmed ? 'Already taken' : reported ? 'Confirm taken ✓' : 'Mark taken ✓'}
        </button>
      </div>
    `;

    $('qumBookTakenBtn')?.addEventListener('click', () => submitBookingUnit(row));
  }

  async function submitBookingUnit(row) {
    if (!row || state.busy || isConfirmedTaken(row)) return;

    await submitQuickTaken(
      [{ block_code: row.block_code, unit_no: row.unit_no }],
      { successText: () => `#${row.unit_no} marked taken.` }
    );

    await reloadCachedStatuses();
    renderBookingMatch();
  }

  async function submitQuickTaken(units, options = {}) {
    if (!units.length) return;

    try {
      state.busy = true;
      setBusyUi(true);

      if (!client) await connectClient();

      const { data, error } = await client.rpc('submit_quick_taken_reports', {
        p_units: units,
        p_reporter_token: reporterToken
      });

      if (error) throw error;

      const submitted = Number(data?.submitted || 0);
      const skipped = Number(data?.skipped || 0);
      const reportIds = Array.isArray(data?.report_ids) ? data.report_ids.map(Number).filter(Number.isFinite) : [];

      if (submitted > 0) {
        state.dirtyCount += submitted;
        const text = options.successText ? options.successText(submitted) : `${submitted} update${submitted === 1 ? '' : 's'} submitted.`;
        showUndo(text, reportIds);
        window.dispatchEvent(new CustomEvent('riseblock:quick-update-complete', {
          detail: { submitted, skipped, units }
        }));
      } else {
        showMessage(skipped ? 'Nothing new to submit. Your recent matching report is already recorded.' : 'Nothing was submitted.', 'neutral');
      }
    } catch (error) {
      console.error('Quick Update submit failed:', error);
      const message = String(error?.message || 'Could not submit the quick update.');
      showMessage(message, 'error');
    } finally {
      state.busy = false;
      setBusyUi(false);
    }
  }

  function setBusyUi(busy) {
    const submit = $('qumSubmitBulkBtn');
    if (submit) {
      submit.disabled = busy || state.selected.size === 0;
      if (busy) submit.textContent = 'Submitting…';
      else renderSelectedSummary();
    }

    const clear = $('qumClearBtn');
    if (clear) clear.disabled = busy || state.selected.size === 0;

    const book = $('qumBookTakenBtn');
    if (book) book.disabled = busy || isConfirmedTaken(findBookingUnit());

    document.querySelectorAll('.qum-chip, .qum-unit, .qum-mode-btn').forEach(el => {
      if (!el.classList.contains('locked')) el.disabled = busy;
    });
  }

  async function reloadCachedStatuses() {
    const cachedBlocks = [...state.blockRows.keys()];
    state.blockRows.clear();

    for (const blockCode of cachedBlocks) {
      if (blockCode === state.block) {
        await loadBlockRows(blockCode, true);
      }
    }
  }

  function showUndo(message, reportIds) {
    clearUndoTimers();

    const bar = $('qumUndoBar');
    const text = $('qumUndoText');
    const countdown = $('qumUndoCountdown');
    const undoButton = $('qumUndoBtn');

    if (undoButton) {
      undoButton.hidden = false;
      undoButton.disabled = false;
    }
    delete bar.dataset.kind;

    state.lastUndo = {
      reportIds,
      expiresAt: Date.now() + 10000
    };

    text.textContent = message;
    bar.hidden = false;

    const tick = () => {
      if (!state.lastUndo) return;
      const remainingMs = state.lastUndo.expiresAt - Date.now();
      const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
      countdown.textContent = seconds > 0 ? `Undo available for ${seconds}s` : 'Undo window ended';

      if (remainingMs <= 0) {
        clearUndo();
      }
    };

    tick();
    undoTickTimer = window.setInterval(tick, 250);
    undoTimer = window.setTimeout(clearUndo, 10200);
  }

  async function undoLastQuickUpdate() {
    if (!state.lastUndo?.reportIds?.length || state.busy) return;

    const reportIds = [...state.lastUndo.reportIds];

    try {
      state.busy = true;
      $('qumUndoBtn').disabled = true;
      $('qumUndoText').textContent = 'Undoing…';

      const { data, error } = await client.rpc('undo_quick_taken_reports', {
        p_report_ids: reportIds,
        p_reporter_token: reporterToken
      });

      if (error) throw error;

      const deleted = Number(data || 0);
      state.dirtyCount = Math.max(0, state.dirtyCount - deleted);
      clearUndo();
      showMessage(deleted ? `${deleted} quick update${deleted === 1 ? '' : 's'} undone.` : 'Undo window has ended.', deleted ? 'success' : 'neutral');

      await reloadCachedStatuses();
      if (state.mode === 'bulk') renderUnits();
      else renderBookingMatch();

      window.dispatchEvent(new CustomEvent('riseblock:quick-update-undone', {
        detail: { deleted }
      }));
    } catch (error) {
      console.error('Quick Update undo failed:', error);
      showMessage(error?.message || 'Could not undo the update.', 'error');
    } finally {
      state.busy = false;
      $('qumUndoBtn').disabled = false;
      setBusyUi(false);
    }
  }

  function clearUndoTimers() {
    if (undoTimer) window.clearTimeout(undoTimer);
    if (undoTickTimer) window.clearInterval(undoTickTimer);
    undoTimer = null;
    undoTickTimer = null;
  }

  function clearUndo() {
    clearUndoTimers();
    state.lastUndo = null;
    const bar = $('qumUndoBar');
    if (bar) bar.hidden = true;
  }

  function showMessage(message, kind = 'neutral') {
    clearUndoTimers();
    state.lastUndo = null;

    const bar = $('qumUndoBar');
    if (!bar) return;

    bar.hidden = false;
    bar.dataset.kind = kind;
    $('qumUndoText').textContent = message;
    $('qumUndoCountdown').textContent = '';
    $('qumUndoBtn').hidden = true;

    window.setTimeout(() => {
      if (!state.lastUndo && bar.dataset.kind === kind) {
        bar.hidden = true;
        $('qumUndoBtn').hidden = false;
        delete bar.dataset.kind;
      }
    }, 3600);
  }

  function renderOfflineState() {
    $('qumDbState').textContent = 'Unavailable';
    const grid = $('qumUnitGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="qum-empty-state error">
          <strong>Quick updates are unavailable</strong>
          <small>The rest of RiseBlock can still be used normally.</small>
        </div>
      `;
    }
  }

  injectTrigger();
  injectDialog();

  window.addEventListener('resize', () => {
    const dialog = $('quickUpdateMobileDialog');
    if (dialog?.open && !window.matchMedia(MOBILE_QUERY).matches) {
      closeQuickUpdate();
    }
  });
})();
