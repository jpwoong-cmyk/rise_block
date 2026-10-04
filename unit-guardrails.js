(() => {
  'use strict';

  const CFG = window.BERLAYAR_COMMUNITY;
  if (!CFG?.url || !CFG?.publishableKey) return;

  const reporterTokenKey = 'berlayar_rise_reporter_token_v1';
  const favouritesKey = 'berlayar_rise_favourites_v1';
  let client = null;
  let favouriteDirty = false;

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

  async function getClient() {
    if (client) return client;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.117.2');
    client = createClient(CFG.url, CFG.publishableKey, {
      db: { schema: CFG.schema || 'riseblock' }
    });
    return client;
  }

  async function getUnit(blockCode, unitNo) {
    const db = await getClient();
    const { data, error } = await db
      .from('unit_status_current')
      .select('block_code,unit_no,flat_type,community_status,taken_reports,available_reports')
      .eq('block_code', String(blockCode))
      .eq('unit_no', String(unitNo))
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  function isAvailableLike(status) {
    return ['available', 'untracked', 'reported_available', 'confirmed_available'].includes(status);
  }

  function safeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
    }[char]));
  }

  function setQuickFeedback(message) {
    const el = document.getElementById('quickUnitFeedback');
    if (el) el.textContent = message;
  }

  function setReportFeedback(message, ok = true) {
    const el = document.getElementById('reportResult');
    if (!el) return;
    el.hidden = false;
    el.className = `report-result ${ok ? 'success' : 'error'}`;
    el.textContent = message;
  }

  function confirmAvailableCorrection(blockCode, unitNo) {
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.className = 'availability-correction-dialog';
      dialog.innerHTML = `
        <div class="availability-correction-copy">
          <div class="eyebrow">STATUS CHECK</div>
          <h3>Report this unit available?</h3>
          <p><strong>Block ${blockCode} · #${unitNo}</strong> has a Taken report.</p>
          <p>If you genuinely saw that it is available now, continue. If the Taken report was your own recent tap, RiseBlock will treat this as an undo instead of creating a contradictory Available report.</p>
        </div>
        <div class="availability-correction-actions">
          <button type="button" data-correction-cancel>Cancel</button>
          <button type="button" class="confirm" data-correction-confirm>Report available</button>
        </div>`;
      document.body.appendChild(dialog);

      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        if (dialog.open) dialog.close();
        dialog.remove();
        resolve(value);
      };

      dialog.querySelector('[data-correction-cancel]').addEventListener('click', () => finish(false));
      dialog.querySelector('[data-correction-confirm]').addEventListener('click', () => finish(true));
      dialog.addEventListener('cancel', event => {
        event.preventDefault();
        finish(false);
      });
      dialog.addEventListener('click', event => {
        if (event.target === dialog) finish(false);
      });
      dialog.showModal();
    });
  }

  async function submitAvailable(payload) {
    const db = await getClient();
    const { data, error } = await db.rpc('submit_unit_report', payload);
    if (error) throw error;
    return Number(data);
  }

  async function handleQuickAvailable(button) {
    const blockCode = document.getElementById('drawerBlockName')?.textContent?.trim();
    const unitNo = document.getElementById('quickUnitTitle')?.textContent?.replace(/^#/, '').trim();
    if (!blockCode || !unitNo) return;

    button.disabled = true;
    setQuickFeedback('Checking status…');
    try {
      const row = await getUnit(blockCode, unitNo);
      const takenReports = Number(row?.taken_reports || 0);

      if (takenReports === 0 && isAvailableLike(row?.community_status || 'available')) {
        setQuickFeedback('Already shown as available · no update needed.');
        return;
      }

      if (takenReports > 0) {
        const confirmed = await confirmAvailableCorrection(blockCode, unitNo);
        if (!confirmed) {
          setQuickFeedback('No change made.');
          return;
        }
      }

      setQuickFeedback('Submitting correction…');
      const result = await submitAvailable({
        p_block_code: blockCode,
        p_unit_no: unitNo,
        p_status: 'available',
        p_observed_at: new Date().toISOString(),
        p_source_type: 'community_observation',
        p_source_note: '',
        p_evidence_url: '',
        p_reporter_token: reporterToken
      });

      if (result < 0) {
        setQuickFeedback('Your recent Taken report was undone.');
      } else {
        const updated = await getUnit(blockCode, unitNo);
        setQuickFeedback(updated?.community_status === 'conflicting'
          ? 'Correction added · now showing conflicting reports.'
          : 'Available report added.');
      }
      window.setTimeout(() => window.location.reload(), 850);
    } catch (error) {
      console.error('Available guardrail failed:', error);
      setQuickFeedback(error?.message || 'Could not submit the update.');
    } finally {
      button.disabled = false;
    }
  }

  async function handleUnitForm(form) {
    const status = new FormData(form).get('unitReportStatus');
    if (status !== 'available') return false;

    const blockCode = document.getElementById('unitReportBlock')?.value;
    const unitNo = document.getElementById('unitReportUnit')?.value;
    if (!blockCode || !unitNo) return false;

    const submit = form.querySelector('.submit-report-btn');
    if (submit) submit.disabled = true;

    try {
      const row = await getUnit(blockCode, unitNo);
      const takenReports = Number(row?.taken_reports || 0);

      if (takenReports === 0 && isAvailableLike(row?.community_status || 'available')) {
        setReportFeedback('This unit is already shown as available. No new report was added.', true);
        return true;
      }

      if (takenReports > 0) {
        const confirmed = await confirmAvailableCorrection(blockCode, unitNo);
        if (!confirmed) return true;
      }

      const result = await submitAvailable({
        p_block_code: blockCode,
        p_unit_no: unitNo,
        p_status: 'available',
        p_observed_at: new Date(document.getElementById('unitReportObserved').value).toISOString(),
        p_source_type: document.getElementById('unitReportSource').value,
        p_source_note: document.getElementById('unitReportNote').value,
        p_evidence_url: document.getElementById('unitReportEvidence').value,
        p_reporter_token: reporterToken
      });

      if (result < 0) {
        setReportFeedback('Your recent Taken report was undone. No Available report was added.', true);
      } else {
        const updated = await getUnit(blockCode, unitNo);
        setReportFeedback(updated?.community_status === 'conflicting'
          ? 'Available correction added. This unit now shows conflicting reports.'
          : 'Unit status submitted.', true);
      }
      window.setTimeout(() => window.location.reload(), 950);
      return true;
    } catch (error) {
      console.error('Unit form guardrail failed:', error);
      setReportFeedback(error?.message || 'Could not submit this update.', false);
      return true;
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  // ---------- Taken confirmation: protect community status from accidental taps ----------
  let bypassTakenConfirmation = false;

  function confirmTakenReport(blockCode, unitNo) {
    return new Promise(resolve => {
      const favouriteButton = document.getElementById('quickFavouriteBtn');
      const alreadyFavourite = favouriteButton?.getAttribute('aria-pressed') === 'true';

      const dialog = document.createElement('dialog');
      dialog.className = 'taken-confirmation-dialog';
      dialog.innerHTML = `
        <div class="taken-confirmation-copy">
          <div class="eyebrow">BEFORE YOU MARK IT TAKEN</div>
          <h3>Is this unit actually taken?</h3>
          <p><strong>Block ${safeText(blockCode)} · #${safeText(unitNo)}</strong></p>
          <p><b>Taken</b> changes the community tracker for everyone. Use it only when you know this flat has already been selected or booked.</p>
          <div class="taken-favourite-callout">
            <span aria-hidden="true">♡</span>
            <p><strong>Saving this unit for yourself?</strong><br />Please use Favourite instead. Favouriting keeps the unit available and saves it privately on this device.</p>
          </div>
        </div>
        <div class="taken-confirmation-actions">
          <button type="button" data-taken-cancel>Cancel</button>
          <button type="button" class="favourite" data-taken-favourite ${alreadyFavourite ? 'disabled' : ''}>
            ${alreadyFavourite ? '♥ Already favourited' : '♡ Favourite instead'}
          </button>
          <button type="button" class="confirm" data-taken-confirm>Yes, report taken</button>
        </div>`;
      document.body.appendChild(dialog);

      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        if (dialog.open) dialog.close();
        dialog.remove();
        resolve(value);
      };

      dialog.querySelector('[data-taken-cancel]').addEventListener('click', () => finish('cancel'));
      dialog.querySelector('[data-taken-confirm]').addEventListener('click', () => finish('taken'));
      dialog.querySelector('[data-taken-favourite]')?.addEventListener('click', () => {
        if (!alreadyFavourite && favouriteButton) favouriteButton.click();
        finish('favourite');
      });
      dialog.addEventListener('cancel', event => {
        event.preventDefault();
        finish('cancel');
      });
      dialog.addEventListener('click', event => {
        if (event.target === dialog) finish('cancel');
      });
      dialog.showModal();
    });
  }

  async function handleQuickTaken(button) {
    const blockCode = document.getElementById('drawerBlockName')?.textContent?.trim();
    const unitNo = document.getElementById('quickUnitTitle')?.textContent?.replace(/^#/, '').trim();
    if (!blockCode || !unitNo) return;

    const action = await confirmTakenReport(blockCode, unitNo);
    if (action === 'favourite') {
      setQuickFeedback('Saved to favourites · unit status was not changed.');
      return;
    }
    if (action !== 'taken') {
      setQuickFeedback('No change made.');
      return;
    }

    // Re-fire the existing app.js Taken action exactly once.
    bypassTakenConfirmation = true;
    button.click();
  }

  // Capture phase lets the guardrails step in before app.js one-tap handlers.
  document.addEventListener('click', event => {
    const taken = event.target.closest('#quickTakenBtn');
    if (!taken) return;
    if (bypassTakenConfirmation) {
      bypassTakenConfirmation = false;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    handleQuickTaken(taken);
  }, true);

  document.addEventListener('click', event => {
    const available = event.target.closest('#quickAvailableBtn');
    if (!available) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handleQuickAvailable(available);
  }, true);

  document.addEventListener('submit', event => {
    const form = event.target.closest?.('#unitReportForm');
    if (!form) return;
    const status = new FormData(form).get('unitReportStatus');
    if (status !== 'available') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handleUnitForm(form);
  }, true);

  // ---------- Quick Update > My Booking backspace fix ----------
  // The base formatter turns 12-10 back into 01-210 while deleting.
  // Intercept backward deletion so partial values remain editable: 12-105 -> 12-10 -> 12-1 -> 12 -> 1.
  document.addEventListener('beforeinput', event => {
    const input = event.target?.closest?.('#qumBookingUnitInput');
    if (!input || event.inputType !== 'deleteContentBackward') return;

    event.preventDefault();

    const value = input.value || '';
    let start = Number.isInteger(input.selectionStart) ? input.selectionStart : value.length;
    let end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
    let next;
    let caret;

    if (start !== end) {
      next = value.slice(0, start) + value.slice(end);
      caret = start;
    } else if (start > 0) {
      next = value.slice(0, start - 1) + value.slice(end);
      caret = start - 1;
    } else {
      return;
    }

    // Don't leave a dangling dash after the stack digits have been deleted.
    if (next.endsWith('-')) {
      next = next.slice(0, -1);
      caret = Math.min(caret, next.length);
    }

    input.value = next;
    try { input.setSelectionRange(caret, caret); } catch (_) {}

    const host = document.getElementById('qumBookingMatch');
    if (host) {
      host.innerHTML = next
        ? `<div class="qum-booking-placeholder"><strong>Keep typing the unit number</strong><span>Backspace now edits normally.</span></div>`
        : `<div class="qum-booking-placeholder"><strong>Enter your booked unit</strong><span>Choose the block above, then type the unit number.</span></div>`;
    }
  }, true);

  // ---------- My Booking favourite heart ----------
  function readFavourites() {
    try {
      const raw = JSON.parse(localStorage.getItem(favouritesKey) || '[]');
      return new Set(Array.isArray(raw) ? raw.map(String) : []);
    } catch (_) {
      return new Set();
    }
  }

  function writeFavourites(set) {
    try {
      localStorage.setItem(favouritesKey, JSON.stringify([...set]));
      return true;
    } catch (_) {
      return false;
    }
  }

  function updateTopFavouriteCount(set) {
    const count = document.getElementById('favouritesCount');
    if (count) count.textContent = set.size.toLocaleString('en-SG');
    document.getElementById('favouritesBtn')?.classList.toggle('has-favourites', set.size > 0);
  }

  function enhanceBookingFavourite() {
    const card = document.querySelector('#qumBookingMatch .qum-booking-card');
    if (!card || card.querySelector('.qum-book-favourite-btn')) return;

    const blockText = card.querySelector('span')?.textContent || '';
    const unitText = card.querySelector('strong')?.textContent || '';
    const blockCode = blockText.replace(/^BLOCK\s+/i, '').trim();
    const unitNo = unitText.replace(/^#/, '').trim();
    if (!blockCode || !unitNo) return;

    const key = `${blockCode}|${unitNo}`;
    const favourites = readFavourites();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'qum-book-favourite-btn';

    const sync = () => {
      const active = favourites.has(key);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', active ? `Remove #${unitNo} from favourites` : `Save #${unitNo} to favourites`);
      button.innerHTML = `<span aria-hidden="true">${active ? '♥' : '♡'}</span>`;
    };

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (favourites.has(key)) favourites.delete(key);
      else favourites.add(key);
      if (writeFavourites(favourites)) {
        favouriteDirty = true;
        updateTopFavouriteCount(favourites);
        sync();
      }
    });

    sync();
    card.appendChild(button);
  }

  const bookingObserver = new MutationObserver(enhanceBookingFavourite);
  bookingObserver.observe(document.documentElement, { childList: true, subtree: true });
  enhanceBookingFavourite();

  // app.js keeps an in-memory favourites Set. Reload only after Quick Update closes,
  // so the heart is instant while the main favourites panel stays fully in sync afterwards.
  document.addEventListener('close', event => {
    if (event.target?.id === 'quickUpdateMobileDialog' && favouriteDirty) {
      window.location.reload();
    }
  }, true);
})();
