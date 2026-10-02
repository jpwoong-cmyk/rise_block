(async function initialiseQuotaQueueV2() {
  'use strict';

  const DATA = window.BERLAYAR_DATA;
  const CFG = window.BERLAYAR_COMMUNITY;
  if (!DATA || !CFG?.url || !CFG?.publishableKey) {
    console.warn('Quota/queue V2: Berlayar data or community config is unavailable.');
    return;
  }

  const GROUPS = [
    { key: '2R', label: '2-Room Flexi', short: '2-Room' },
    { key: '3R', label: '3-Room', short: '3-Room' },
    { key: '4R', label: '4-Room', short: '4-Room' }
  ];
  const GROUP_LABEL = Object.fromEntries(GROUPS.map(group => [group.key, group.label]));
  const REPORTER_TOKEN_KEY = 'berlayar_rise_reporter_token_v1';

  let client = null;
  let quotaRows = [];
  let progressRows = [];
  let activeQueueGroup = '2R';
  let activeQuotaGroup = '2R';
  let dataReady = false;
  let activityRows = [];
  let activityRefreshTimer = null;

  const $ = id => document.getElementById(id);

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

  function groupForFlatType(flatType) {
    return String(flatType || '').startsWith('2R-') ? '2R' : flatType;
  }

  function availableGroupsForBlock(blockCode) {
    const block = DATA.blocks.find(item => item.id === blockCode);
    if (!block) return [];
    const groups = new Set(block.stacks.map(stack => groupForFlatType(stack.type)));
    return GROUPS.filter(group => groups.has(group.key)).map(group => group.key);
  }

  function groupTotalForBlock(blockCode, groupKey) {
    const block = DATA.blocks.find(item => item.id === blockCode);
    if (!block) return 0;

    const stackCount = block.stacks.filter(stack => groupForFlatType(stack.type) === groupKey).length;
    const terraceLevels = new Set(block.floors?.terraceLevels || []);
    let residentialFloors = 0;

    for (let floor = block.floors.min; floor <= block.floors.max; floor++) {
      if (!terraceLevels.has(floor)) residentialFloors += 1;
    }
    return stackCount * residentialFloors;
  }

  function number(value) {
    return Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-SG') : '—';
  }

  function signedNumber(value) {
    if (!Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    return n < 0 ? `−${Math.abs(n).toLocaleString('en-SG')}` : n.toLocaleString('en-SG');
  }

  function readableDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-SG', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Singapore'
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

  function setReportResult(message, ok = true) {
    const result = $('reportResult');
    if (!result) return;
    result.hidden = false;
    result.className = `report-result ${ok ? 'success' : 'error'}`;
    result.textContent = message;
  }

  function setBusy(form, busy) {
    const button = form?.querySelector('button[type="submit"]');
    if (button) button.disabled = busy;
  }

  function currentBlockCode() {
    return ($('drawerBlockName')?.textContent || '').trim();
  }

  function makeTabs(container, activeKey, onSelect, enabledKeys = GROUPS.map(group => group.key)) {
    container.innerHTML = '';
    for (const group of GROUPS) {
      const enabled = enabledKeys.includes(group.key);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `flat-group-tab${activeKey === group.key ? ' active' : ''}`;
      button.dataset.group = group.key;
      button.textContent = group.short;
      button.disabled = !enabled;
      button.setAttribute('aria-pressed', String(activeKey === group.key));
      if (!enabled) button.title = `${group.label} flats are not in this block`;
      button.addEventListener('click', () => {
        if (!enabled) return;
        onSelect(group.key);
      });
      container.appendChild(button);
    }
  }

  function injectQueueUi() {
    const section = document.querySelector('.community-progress');
    if (!section || $('queueProgressV2')) return;

    section.classList.add('flat-group-v2');

    const panel = document.createElement('div');
    panel.id = 'queueProgressV2';
    panel.className = 'queue-progress-v2';
    panel.innerHTML = `
      <div id="queueGroupTabs" class="flat-group-tabs" role="group" aria-label="Queue progress flat type"></div>
      <div class="queue-v2-metrics" aria-live="polite">
        <div><span>Last reported queue</span><strong id="queueV2Reached">—</strong></div>
        <div><span>Queue-implied bookings</span><strong id="queueV2Bookings">—</strong></div>
        <div><span>Queue-implied remaining</span><strong id="queueV2Remaining">—</strong></div>
        <div><span>Dropouts reported</span><strong id="queueV2Dropouts">—</strong></div>
        <div><span>Implied minus recorded taken</span><strong id="queueV2Gap">—</strong></div>
      </div>
      <div class="queue-v2-foot">
        <span id="queueV2Meta">No progress report yet</span>
        <span id="queueV2Recorded"></span>
        <span id="queueV2ReportButtonHost"></span>
      </div>
    `;

    const oldFoot = section.querySelector('.progress-foot');
    section.insertBefore(panel, oldFoot || null);

    const reportButton = $('reportProgressBtn');
    const host = $('queueV2ReportButtonHost');
    if (reportButton && host) host.replaceWith(reportButton);

    renderQueueProgress();
  }

  function renderQueueProgress() {
    const tabs = $('queueGroupTabs');
    if (!tabs) return;

    makeTabs(tabs, activeQueueGroup, groupKey => {
      activeQueueGroup = groupKey;
      renderQueueProgress();
      const select = $('progressReportQueueGroup');
      if (select) select.value = groupKey;
    });

    const row = progressRows.find(item => item.queue_group === activeQueueGroup);

    $('queueV2Reached').textContent = row ? number(row.queue_reached) : '—';
    $('queueV2Bookings').textContent = row ? number(row.implied_bookings) : '—';
    $('queueV2Remaining').textContent = row ? number(row.estimated_remaining) : '—';
    $('queueV2Dropouts').textContent = row ? number(row.dropouts) : '—';
    $('queueV2Gap').textContent = row ? signedNumber(row.implied_minus_recorded_taken) : '—';

    if (!row) {
      $('queueV2Meta').textContent = `No progress report yet for ${GROUP_LABEL[activeQueueGroup]}.`;
      $('queueV2Recorded').textContent = '';
      return;
    }

    $('queueV2Meta').textContent =
      `${confidenceLabel(row.confidence, row.support_count, row.conflict_count)} · ${readableDate(row.latest_observed_at)}`;
    $('queueV2Recorded').textContent =
      `Recorded taken: ${number(row.recorded_taken)} / ${number(row.total_units)}`;
  }

  function injectQuotaUi() {
    const card = $('quotaCard');
    const body = $('quotaCardBody');
    if (!card || !body || $('quotaV2Panel')) return;

    card.classList.add('quota-v2-ready');

    const panel = document.createElement('div');
    panel.id = 'quotaV2Panel';
    panel.className = 'quota-v2-panel';
    panel.innerHTML = `
      <div id="quotaGroupTabs" class="flat-group-tabs quota-group-tabs" role="group" aria-label="Block quota flat type"></div>
      <div id="quotaV2Empty" class="quota-empty">No quota reported yet.</div>
      <div id="quotaV2Values" class="quota-values quota-v2-values" hidden>
        <div><span>Malay</span><strong id="quotaV2Malay">—</strong></div>
        <div><span>Chinese</span><strong id="quotaV2Chinese">—</strong></div>
        <div><span>Indian / Others</span><strong id="quotaV2Indian">—</strong></div>
      </div>
      <div class="quota-meta quota-v2-meta">
        <span id="quotaV2Confidence">Not yet reported</span>
        <span id="quotaV2Observed"></span>
      </div>
    `;
    body.appendChild(panel);

    renderQuotaForCurrentBlock();

    const blockName = $('drawerBlockName');
    if (blockName) {
      new MutationObserver(() => renderQuotaForCurrentBlock())
        .observe(blockName, { childList: true, characterData: true, subtree: true });
    }
  }

  function renderQuotaForCurrentBlock() {
    const tabs = $('quotaGroupTabs');
    if (!tabs) return;

    const blockCode = currentBlockCode();
    const enabledGroups = availableGroupsForBlock(blockCode);

    if (!enabledGroups.includes(activeQuotaGroup)) {
      activeQuotaGroup = enabledGroups[0] || '2R';
    }

    makeTabs(tabs, activeQuotaGroup, groupKey => {
      activeQuotaGroup = groupKey;
      renderQuotaForCurrentBlock();
      const select = $('quotaReportFlatGroup');
      if (select) select.value = groupKey;
    }, enabledGroups);

    const row = quotaRows.find(item =>
      item.block_code === blockCode && item.flat_group === activeQuotaGroup
    );

    const empty = $('quotaV2Empty');
    const values = $('quotaV2Values');

    if (!row) {
      empty.hidden = false;
      values.hidden = true;
      empty.textContent = `No ${GROUP_LABEL[activeQuotaGroup] || activeQuotaGroup} quota reported yet.`;
      $('quotaV2Confidence').textContent = 'Not yet reported';
      $('quotaV2Observed').textContent = '';
      return;
    }

    empty.hidden = true;
    values.hidden = false;
    $('quotaV2Malay').textContent = number(row.malay_remaining);
    $('quotaV2Chinese').textContent = number(row.chinese_remaining);
    $('quotaV2Indian').textContent = number(row.indian_other_remaining);
    $('quotaV2Confidence').textContent =
      confidenceLabel(row.confidence, row.support_count, row.conflict_count);
    $('quotaV2Observed').textContent = `Observed ${readableDate(row.latest_observed_at)}`;
  }

  function populateQuotaGroupSelect(preferred) {
    const select = $('quotaReportFlatGroup');
    const blockSelect = $('quotaReportBlock');
    if (!select || !blockSelect) return;

    const blockCode = blockSelect.value;
    const groups = availableGroupsForBlock(blockCode);
    select.innerHTML = groups.map(groupKey =>
      `<option value="${groupKey}">${GROUP_LABEL[groupKey]}</option>`
    ).join('');

    const next = groups.includes(preferred) ? preferred : (groups[0] || '');
    if (next) select.value = next;

    const total = groupTotalForBlock(blockCode, select.value);
    const help = $('quotaReportGroupHelp');
    if (help) {
      help.textContent = total
        ? `${blockCode} · ${GROUP_LABEL[select.value]} · ${total.toLocaleString('en-SG')} flats`
        : '';
    }

    for (const id of ['quotaReportMalay', 'quotaReportChinese', 'quotaReportIndian']) {
      const input = $(id);
      if (input && total) input.max = String(total);
    }
  }

  function injectReportFields() {
    const quotaForm = $('quotaReportForm');
    const quotaBlockField = $('quotaBlockField');
    if (quotaForm && quotaBlockField && !$('quotaReportFlatGroup')) {
      const field = document.createElement('label');
      field.id = 'quotaFlatGroupField';
      field.innerHTML = `
        <span>Flat type</span>
        <select id="quotaReportFlatGroup" required></select>
        <small id="quotaReportGroupHelp" class="report-inline-help"></small>
      `;
      quotaBlockField.insertAdjacentElement('afterend', field);

      $('quotaReportBlock')?.addEventListener('change', () => populateQuotaGroupSelect());
      $('quotaReportFlatGroup')?.addEventListener('change', () =>
        populateQuotaGroupSelect($('quotaReportFlatGroup').value)
      );
      populateQuotaGroupSelect(activeQuotaGroup);
    }

    const progressForm = $('progressReportForm');
    if (progressForm && !$('progressReportQueueGroup')) {
      const field = document.createElement('label');
      field.id = 'progressQueueGroupField';
      field.innerHTML = `
        <span>Flat type / queue</span>
        <select id="progressReportQueueGroup" required>
          <option value="2R">2-Room Flexi</option>
          <option value="3R">3-Room</option>
          <option value="4R">4-Room</option>
        </select>
        <small class="report-inline-help">Queue progress is tracked separately for each flat type.</small>
      `;
      progressForm.prepend(field);
      $('progressReportQueueGroup').value = activeQueueGroup;
    }

    $('reportQuotaBtn')?.addEventListener('click', () => {
      window.setTimeout(() => {
        populateQuotaGroupSelect(activeQuotaGroup);
      }, 0);
    });

    $('reportProgressBtn')?.addEventListener('click', () => {
      window.setTimeout(() => {
        const select = $('progressReportQueueGroup');
        if (select) select.value = activeQueueGroup;
      }, 0);
    });

    document.querySelectorAll('[data-report-kind="quota"]').forEach(button => {
      button.addEventListener('click', () => window.setTimeout(() => populateQuotaGroupSelect(activeQuotaGroup), 0));
    });

    document.querySelectorAll('[data-report-kind="progress"]').forEach(button => {
      button.addEventListener('click', () => window.setTimeout(() => {
        const select = $('progressReportQueueGroup');
        if (select) select.value = activeQueueGroup;
      }, 0));
    });
  }

  function attachSubmissionOverrides() {
    const quotaForm = $('quotaReportForm');
    if (quotaForm) {
      quotaForm.addEventListener('submit', async event => {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (!client) {
          setReportResult('Community database is not connected yet.', false);
          return;
        }

        const blockCode = $('quotaReportBlock').value;
        const groupKey = $('quotaReportFlatGroup').value;
        const max = groupTotalForBlock(blockCode, groupKey);
        const malay = Number($('quotaReportMalay').value);
        const chinese = Number($('quotaReportChinese').value);
        const indianOther = Number($('quotaReportIndian').value);

        if ([malay, chinese, indianOther].some(value => !Number.isInteger(value) || value < 0)) {
          setReportResult('Quota values must be whole numbers of 0 or more.', false);
          return;
        }
        if (max && [malay, chinese, indianOther].some(value => value > max)) {
          setReportResult(`Quota values cannot exceed the ${max} ${GROUP_LABEL[groupKey]} flats in Block ${blockCode}.`, false);
          return;
        }

        setBusy(quotaForm, true);
        try {
          const { error } = await client.rpc('submit_quota_report', {
            p_block_code: blockCode,
            p_flat_group: groupKey,
            p_malay_remaining: malay,
            p_chinese_remaining: chinese,
            p_indian_other_remaining: indianOther,
            p_observed_at: new Date($('quotaReportObserved').value).toISOString(),
            p_source_type: $('quotaReportSource').value,
            p_source_note: $('quotaReportNote').value,
            p_evidence_url: $('quotaReportEvidence').value,
            p_reporter_token: reporterToken
          });
          if (error) throw error;

          activeQuotaGroup = groupKey;
          setReportResult(`${GROUP_LABEL[groupKey]} quota submitted for Block ${blockCode}.`);
          await refreshV2Data();
          await refreshActivity();
        } catch (error) {
          console.error('Quota V2 submission failed:', error);
          setReportResult(error?.message || 'Could not submit the block quota.', false);
        } finally {
          setBusy(quotaForm, false);
        }
      }, true);
    }

    const progressForm = $('progressReportForm');
    if (progressForm) {
      progressForm.addEventListener('submit', async event => {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (!client) {
          setReportResult('Community database is not connected yet.', false);
          return;
        }

        const groupKey = $('progressReportQueueGroup').value;
        const queueReached = Number($('progressReportQueue').value);
        const dropouts = Number($('progressReportDropouts').value);

        if (!Number.isInteger(queueReached) || !Number.isInteger(dropouts) || queueReached < 0 || dropouts < 0) {
          setReportResult('Queue and dropout values must be whole numbers of 0 or more.', false);
          return;
        }
        if (dropouts > queueReached) {
          setReportResult('Dropouts cannot exceed the last reported queue.', false);
          return;
        }

        setBusy(progressForm, true);
        try {
          const { error } = await client.rpc('submit_progress_report', {
            p_queue_reached: queueReached,
            p_dropouts: dropouts,
            p_observed_at: new Date($('progressReportObserved').value).toISOString(),
            p_source_type: $('progressReportSource').value,
            p_source_note: $('progressReportNote').value,
            p_evidence_url: $('progressReportEvidence').value,
            p_reporter_token: reporterToken,
            p_queue_group: groupKey
          });
          if (error) throw error;

          activeQueueGroup = groupKey;
          setReportResult(`${GROUP_LABEL[groupKey]} queue progress submitted.`);
          await refreshV2Data();
          await refreshActivity();
        } catch (error) {
          console.error('Queue V2 submission failed:', error);
          setReportResult(error?.message || 'Could not submit queue progress.', false);
        } finally {
          setBusy(progressForm, false);
        }
      }, true);
    }
  }


  function syncMobileSceneOverlays() {
    const card = document.querySelector('.project-card');
    const layers = document.querySelector('.layers');
    if (!card || !layers) return;

    if (window.matchMedia('(max-width: 660px)').matches) {
      const cardBottom = card.offsetTop + card.offsetHeight;
      layers.style.top = `${cardBottom + 12}px`;
    } else {
      layers.style.removeProperty('top');
    }
  }

  let blockLabelCollisionFrame = null;

  function startMobileBlockLabelCollision() {
    if (blockLabelCollisionFrame) return;

    const tick = () => {
      const mobile = window.matchMedia('(max-width: 660px)').matches;
      const card = document.querySelector('.project-card');
      const labels = document.querySelectorAll('.block-label');

      if (!mobile || !card || document.visibilityState !== 'visible') {
        labels.forEach(label => label.classList.remove('over-project-card'));
        blockLabelCollisionFrame = window.requestAnimationFrame(tick);
        return;
      }

      const cardRect = card.getBoundingClientRect();

      labels.forEach(label => {
        const rect = label.getBoundingClientRect();
        const overlaps =
          rect.right > cardRect.left &&
          rect.left < cardRect.right &&
          rect.bottom > cardRect.top &&
          rect.top < cardRect.bottom;

        label.classList.toggle('over-project-card', overlaps);
      });

      blockLabelCollisionFrame = window.requestAnimationFrame(tick);
    };

    blockLabelCollisionFrame = window.requestAnimationFrame(tick);
  }

  function injectActivityUi() {
    if ($('projectLastUpdate')) return;

    const card = document.querySelector('.project-card');
    const tags = card?.querySelector('.project-tags');
    if (!card || !tags) return;

    const lastUpdate = document.createElement('div');
    lastUpdate.id = 'projectLastUpdate';
    lastUpdate.className = 'project-last-update';
    lastUpdate.innerHTML = `
      <div class="project-last-update-copy">
        <span>LAST UPDATE</span>
        <strong id="projectLastUpdateValue">Loading…</strong>
      </div>
      <button id="activityLogBtn" class="activity-help-btn" type="button"
              aria-label="View community update log" title="View update log">?</button>
    `;
    tags.insertAdjacentElement('afterend', lastUpdate);

    const dialog = document.createElement('dialog');
    dialog.id = 'activityLogDialog';
    dialog.className = 'activity-log-dialog';
    dialog.innerHTML = `
      <button id="closeActivityLogBtn" class="icon-btn dialog-close" type="button" aria-label="Close update log">×</button>
      <div class="eyebrow">COMMUNITY ACTIVITY</div>
      <h2>Recent updates</h2>
      <p class="activity-log-intro">High-level tracker changes only. Reporter identities are not shown.</p>
      <div id="activityLogList" class="activity-log-list" aria-live="polite"></div>
      <div class="activity-log-foot">Times shown in Singapore time.</div>
    `;
    document.body.appendChild(dialog);

    $('activityLogBtn')?.addEventListener('click', async () => {
      try {
        await refreshActivity();
      } catch (error) {
        console.error('Activity log refresh failed:', error);
      }
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });

    $('closeActivityLogBtn')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });

    syncMobileSceneOverlays();
    window.addEventListener('resize', syncMobileSceneOverlays);

    if ('ResizeObserver' in window) {
      const cardResizeObserver = new ResizeObserver(syncMobileSceneOverlays);
      cardResizeObserver.observe(card);
    } else {
      window.setTimeout(syncMobileSceneOverlays, 250);
    }
  }

  function activityMinuteKey(value) {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 16);
  }

  function groupActivity(rows) {
    const grouped = [];
    const byMinute = new Map();

    for (const row of rows) {
      const key = activityMinuteKey(row.event_at);
      let group = byMinute.get(key);
      if (!group) {
        group = { event_at: row.event_at, activities: [] };
        byMinute.set(key, group);
        grouped.push(group);
      }
      if (row.activity_text && !group.activities.includes(row.activity_text)) {
        group.activities.push(row.activity_text);
      }
    }
    return grouped;
  }

  function renderActivity() {
    const lastUpdateValue = $('projectLastUpdateValue');
    const list = $('activityLogList');

    if (lastUpdateValue) {
      lastUpdateValue.textContent = activityRows.length
        ? readableDate(activityRows[0].event_at)
        : 'No updates yet';
    }

    if (!list) return;
    list.innerHTML = '';

    if (!activityRows.length) {
      const empty = document.createElement('div');
      empty.className = 'activity-log-empty';
      empty.textContent = 'No community changes have been recorded yet.';
      list.appendChild(empty);
      return;
    }

    for (const group of groupActivity(activityRows)) {
      const row = document.createElement('div');
      row.className = 'activity-log-row';

      const time = document.createElement('time');
      time.dateTime = group.event_at;
      time.textContent = readableDate(group.event_at);

      const changes = document.createElement('div');
      changes.className = 'activity-log-changes';

      group.activities.forEach((activity, index) => {
        if (index) {
          const separator = document.createElement('span');
          separator.className = 'activity-log-separator';
          separator.textContent = '|';
          changes.appendChild(separator);
        }
        const item = document.createElement('span');
        item.textContent = activity;
        changes.appendChild(item);
      });

      row.append(time, changes);
      list.appendChild(row);
    }
  }

  async function refreshActivity() {
    if (!client) return;

    const { data, error } = await client
      .from('activity_log')
      .select('event_at,activity_type,block_code,flat_group,activity_text')
      .order('event_at', { ascending: false })
      .limit(80);

    if (error) throw error;
    activityRows = data || [];
    renderActivity();
  }

  function startActivityRefresh() {
    if (activityRefreshTimer) return;

    activityRefreshTimer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      refreshActivity().catch(error => console.error('Activity auto-refresh failed:', error));
    }, 15000);

    window.addEventListener('focus', () => {
      refreshActivity().catch(error => console.error('Activity focus refresh failed:', error));
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshActivity().catch(error => console.error('Activity visibility refresh failed:', error));
      }
    });

    // Existing unit and bulk update flows live in app.js. Refresh shortly after
    // those interactions so this add-on updates without changing app.js.
    document.addEventListener('submit', event => {
      const id = event.target?.id;
      if (id === 'unitReportForm') {
        window.setTimeout(() => refreshActivity().catch(() => {}), 1400);
      }
    });

    document.addEventListener('click', event => {
      const id = event.target?.closest?.('button')?.id;
      if (id === 'quickTakenBtn' || id === 'quickAvailableBtn') {
        window.setTimeout(() => refreshActivity().catch(() => {}), 1400);
      }
      if (id === 'bulkSubmitBtn') {
        window.setTimeout(() => refreshActivity().catch(() => {}), 3500);
      }
    });
  }

  async function refreshV2Data() {
    if (!client) return;

    const [quotaResult, progressResult] = await Promise.all([
      client
        .from('block_quota_current')
        .select('block_id,block_code,malay_remaining,chinese_remaining,indian_other_remaining,latest_observed_at,support_count,conflict_count,confidence,flat_group'),
      client
        .from('selection_progress_current')
        .select('queue_reached,dropouts,implied_bookings,estimated_remaining,latest_observed_at,support_count,conflict_count,confidence,queue_group,recorded_taken,implied_minus_recorded_taken,total_units')
    ]);

    if (quotaResult.error || progressResult.error) {
      const error = quotaResult.error || progressResult.error;
      if (/flat_group|recorded_taken|implied_minus_recorded_taken|column/i.test(String(error?.message || ''))) {
        const message = 'Flat-type quota/queue database migration is not applied yet.';
        $('queueV2Meta').textContent = message;
        $('quotaV2Empty').textContent = message;
        return;
      }
      throw error;
    }

    quotaRows = quotaResult.data || [];
    progressRows = progressResult.data || [];
    dataReady = true;

    renderQueueProgress();
    renderQuotaForCurrentBlock();
  }

  async function connect() {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      client = createClient(CFG.url, CFG.publishableKey, {
        db: { schema: CFG.schema || 'riseblock' }
      });
      await refreshV2Data();
      await refreshActivity();
      startActivityRefresh();
    } catch (error) {
      console.error('Quota/queue V2 connection failed:', error);
      if ($('queueV2Meta')) $('queueV2Meta').textContent = 'Quota/queue updates are temporarily unavailable.';
      if ($('quotaV2Empty')) $('quotaV2Empty').textContent = 'Quota updates are temporarily unavailable.';
    }
  }

  injectQueueUi();
  injectQuotaUi();
  injectActivityUi();
  startMobileBlockLabelCollision();
  injectReportFields();
  attachSubmissionOverrides();
  await connect();
})();
