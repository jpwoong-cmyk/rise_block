$ErrorActionPreference = 'Stop'

function Read-Normalized([string]$Path) {
  if (-not (Test-Path $Path)) { throw "Missing $Path. Put this script in the RiseBlock repo root." }
  return ([System.IO.File]::ReadAllText((Resolve-Path $Path))).Replace("`r`n", "`n")
}

function Write-Utf8([string]$Path, [string]$Content) {
  [System.IO.File]::WriteAllText((Resolve-Path $Path), $Content, [System.Text.UTF8Encoding]::new($false))
}

function Replace-Once([string]$Text, [string]$Old, [string]$New, [string]$Label) {
  if (-not $Text.Contains($Old)) { throw "Could not find expected $Label block. Your file may be newer/different; no partial write was made for that file." }
  return $Text.Replace($Old, $New)
}

$files = @('app.js','styles.css','quick-update-mobile.js','quick-update-mobile.css')
foreach ($file in $files) {
  if (-not (Test-Path "$file.bak-before-guardrails")) { Copy-Item $file "$file.bak-before-guardrails" }
}

# ---------------- app.js ----------------
$app = Read-Normalized 'app.js'

$old = @'
  function toggleFavourite(u = selectedUnit) {
    if (!u) return;
    const key = favouriteKey(u);
    if (favouriteKeys.has(key)) {
      favouriteKeys.delete(key);
      delete favouriteLastStatus[key];
      newlyTakenFavouriteKeys.delete(key);
    } else {
      favouriteKeys.add(key);
      favouriteLastStatus[key] = u.status;
    }
    persistFavourites();
    updateFavouriteButtons();
    renderFavouritesPanel();
    if (selectedBlock) renderUnitGrid();
  }
'@
$new = @'
  function toggleFavourite(u = selectedUnit) {
    if (!u) return;
    const key = favouriteKey(u);
    if (favouriteKeys.has(key)) {
      favouriteKeys.delete(key);
      delete favouriteLastStatus[key];
      newlyTakenFavouriteKeys.delete(key);
    } else {
      favouriteKeys.add(key);
      favouriteLastStatus[key] = u.status;
    }
    persistFavourites();
    updateFavouriteButtons();
    renderFavouritesPanel();
    if (selectedBlock) renderUnitGrid();
  }

  // Reuse the existing browser-local favourites from the mobile My Booking view.
  window.RiseBlockFavourites = {
    isFavourite(blockCode, unitNo) {
      return favouriteKeys.has(`${String(blockCode)}|${String(unitNo)}`);
    },
    toggle(blockCode, unitNo) {
      const u = unitByFavouriteKey(`${String(blockCode)}|${String(unitNo)}`);
      if (!u) return false;
      toggleFavourite(u);
      return isFavourite(u);
    }
  };
'@
$app = Replace-Once $app $old $new 'favourites bridge'

$old = @'
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
'@
$new = @'
  document.getElementById('unitReportForm').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const status = new FormData(form).get('unitReportStatus');
    const blockCode = document.getElementById('unitReportBlock').value;
    const unitNo = document.getElementById('unitReportUnit').value;
    const targetUnit = findUnitByCode(blockCode, unitNo);

    if (status === 'available' && targetUnit) {
      const takenReports = Number(targetUnit.live?.taken_reports || 0);
      if (takenReports === 0 && isAvailableStatus(targetUnit.status)) {
        showReportResult('This unit is already shown as available. No new report was added.', true);
        return;
      }
      if (takenReports > 0) {
        const confirmed = await confirmAvailableCorrection(targetUnit);
        if (!confirmed) return;
      }
    }

    if (!communityDbReady || !communityClient) {
      showReportResult('Community updates are not connected right now. Please try again shortly.', false);
      return;
    }

    const button = form.querySelector('.submit-report-btn');
    button.disabled = true;
    resetReportResult();

    try {
      const { data, error } = await communityClient.rpc('submit_unit_report', {
        p_block_code: blockCode,
        p_unit_no: unitNo,
        p_status: status,
        p_observed_at: new Date(document.getElementById('unitReportObserved').value).toISOString(),
        p_source_type: document.getElementById('unitReportSource').value,
        p_source_note: document.getElementById('unitReportNote').value,
        p_evidence_url: document.getElementById('unitReportEvidence').value,
        p_reporter_token: reporterToken
      });
      if (error) throw error;

      await refreshCommunityData();

      if (status === 'available' && Number(data) < 0) {
        showReportResult('Your recent Taken report was undone. No Available report was added.', true);
      } else if (status === 'available' && targetUnit?.status === 'conflicting') {
        showReportResult('Available correction added. This unit now shows conflicting reports.', true);
      } else {
        showReportResult('Unit status submitted.', true);
      }
    } catch (err) {
      console.error(err);
      showReportResult(err?.message || 'Could not submit this update.', false);
    } finally {
      button.disabled = false;
    }
  });
'@
$app = Replace-Once $app $old $new 'guarded unit report form'

$old = @'
  async function quickReportSelectedUnit(status) {
    if (!selectedUnit) return;
    if (!communityDbReady || !communityClient) {
      quickUnitFeedback.textContent = 'Community updates are unavailable right now.';
      return;
    }

    const buttons = [quickTakenBtn, quickAvailableBtn, quickDetailsBtn];
    buttons.forEach(btn => btn.disabled = true);
    quickUnitFeedback.textContent = status === 'taken' ? 'Reporting taken…' : 'Reporting available…';

    try {
      const { error } = await communityClient.rpc('submit_unit_report', {
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
'@
$new = @'
  function findUnitByCode(blockCode, unitNo) {
    return units.find(u =>
      u.block === String(blockCode) &&
      `${floorNumber(u.floor)}-${u.stack}` === String(unitNo)
    ) || null;
  }

  function confirmAvailableCorrection(u) {
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.className = 'availability-correction-dialog';
      dialog.innerHTML = `
        <div class="availability-correction-copy">
          <div class="eyebrow">STATUS CHECK</div>
          <h3>Report this unit available?</h3>
          <p><strong>Block ${u.block} · #${floorNumber(u.floor)}-${u.stack}</strong> is currently reported taken.</p>
          <p>Continue only if you have reason to believe it is available now. If this was your own recent Taken tap, RiseBlock will undo that report instead.</p>
        </div>
        <div class="availability-correction-actions">
          <button type="button" data-correction-cancel>Cancel</button>
          <button type="button" class="confirm" data-correction-confirm>Report available</button>
        </div>
      `;
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

  async function quickReportSelectedUnit(status) {
    if (!selectedUnit) return;
    if (!communityDbReady || !communityClient) {
      quickUnitFeedback.textContent = 'Community updates are unavailable right now.';
      return;
    }

    if (status === 'available') {
      const takenReports = Number(selectedUnit.live?.taken_reports || 0);
      if (takenReports === 0 && isAvailableStatus(selectedUnit.status)) {
        quickUnitFeedback.textContent = 'Already shown as available · no update needed.';
        return;
      }
      if (takenReports > 0) {
        const confirmed = await confirmAvailableCorrection(selectedUnit);
        if (!confirmed) {
          quickUnitFeedback.textContent = 'No change made.';
          return;
        }
      }
    }

    const buttons = [quickTakenBtn, quickAvailableBtn, quickDetailsBtn, quickFavouriteBtn];
    buttons.forEach(btn => btn.disabled = true);
    quickUnitFeedback.textContent = status === 'taken' ? 'Reporting taken…' : 'Checking correction…';

    try {
      const { data, error } = await communityClient.rpc('submit_unit_report', {
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

      if (status === 'available' && Number(data) < 0) {
        quickUnitFeedback.textContent = 'Your recent Taken report was undone.';
      } else if (status === 'available' && selectedUnit.status === 'conflicting') {
        quickUnitFeedback.textContent = 'Correction added · now showing conflicting reports.';
      } else {
        quickUnitFeedback.textContent = status === 'taken' ? 'Taken report added.' : 'Available report added.';
      }
    } catch (err) {
      console.error(err);
      quickUnitFeedback.textContent = err?.message || 'Could not submit the update.';
    } finally {
      buttons.forEach(btn => btn.disabled = false);
    }
  }
'@
$app = Replace-Once $app $old $new 'quick status guardrails'
Write-Utf8 'app.js' $app

# ---------------- styles.css ----------------
$styles = Read-Normalized 'styles.css'
$guardCss = @'

/* Unit status correction guardrail */
.availability-correction-dialog{width:min(430px,calc(100vw - 28px));padding:0;border:1px solid rgba(188,232,138,.22);background:#10231e;color:var(--text);box-shadow:var(--shadow)}
.availability-correction-dialog::backdrop{background:rgba(3,8,6,.78);backdrop-filter:blur(5px)}
.availability-correction-copy{padding:22px 22px 18px}.availability-correction-copy h3{margin:7px 0 12px;font-size:23px}.availability-correction-copy p{margin:8px 0;color:var(--muted);font-size:11px;line-height:1.55}.availability-correction-copy p strong{color:#eef7f0}
.availability-correction-actions{display:grid;grid-template-columns:1fr 1.25fr;gap:8px;padding:14px 18px calc(14px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:#0b1814}.availability-correction-actions button{min-height:42px;border:1px solid var(--line-strong);background:transparent;color:#dce9df;cursor:pointer;font-size:10px;font-weight:850}.availability-correction-actions .confirm{border-color:rgba(188,232,138,.55);background:var(--accent);color:#0b1713}
'@
if (-not $styles.Contains('/* Unit status correction guardrail */')) { $styles += $guardCss }
Write-Utf8 'styles.css' $styles

# ---------------- quick-update-mobile.js ----------------
$quick = Read-Normalized 'quick-update-mobile.js'

$old = @'
  const $ = id => document.getElementById(id);
  const typeLabel = type => DATA.flatTypes?.[type]?.label || type;
  const blocks = DATA.blocks.map(block => block.id);
'@
$new = @'
  const $ = id => document.getElementById(id);
  const typeLabel = type => DATA.flatTypes?.[type]?.label || type;
  const blocks = DATA.blocks.map(block => block.id);

  function isBookingFavourite(row) {
    return Boolean(window.RiseBlockFavourites?.isFavourite?.(row.block_code, row.unit_no));
  }

  function toggleBookingFavourite(row) {
    const active = window.RiseBlockFavourites?.toggle?.(row.block_code, row.unit_no);
    if (typeof active === 'boolean') renderBookingMatch();
  }
'@
$quick = Replace-Once $quick $old $new 'My Booking favourite helpers'

$old = @'
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
'@
$new = @'
    const favourite = isBookingFavourite(row);
    host.innerHTML = `
      <div class="qum-booking-card">
        <div class="qum-booking-card-head">
          <div class="qum-booking-card-copy">
            <span>BLOCK ${safeText(row.block_code)}</span>
            <strong>#${safeText(row.unit_no)}</strong>
            <small>${safeText(typeLabel(row.flat_type))} · ${safeText(statusLabel(row.community_status))}</small>
          </div>
          <button id="qumBookFavouriteBtn" class="qum-book-favourite-btn${favourite ? ' active' : ''}" type="button"
                  aria-pressed="${favourite}" aria-label="${favourite ? 'Remove unit from favourites' : 'Add unit to favourites'}">
            <span aria-hidden="true">${favourite ? '♥' : '♡'}</span>
          </button>
        </div>
        <button id="qumBookTakenBtn" class="qum-book-taken-btn" type="button" ${confirmed || state.busy ? 'disabled' : ''}>
          ${confirmed ? 'Already taken' : reported ? 'Confirm taken ✓' : 'Mark taken ✓'}
        </button>
      </div>
    `;

    $('qumBookFavouriteBtn')?.addEventListener('click', () => toggleBookingFavourite(row));
    $('qumBookTakenBtn')?.addEventListener('click', () => submitBookingUnit(row));
'@
$quick = Replace-Once $quick $old $new 'My Booking favourite button'
Write-Utf8 'quick-update-mobile.js' $quick

# ---------------- quick-update-mobile.css ----------------
$quickCss = Read-Normalized 'quick-update-mobile.css'
$favCss = @'

  /* My Booking favourite heart: uses the main RiseBlock browser-local favourites. */
  .qum-booking-card-head {
    display: flex !important;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .qum-booking-card-copy {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .qum-booking-card-copy > span {
    color: var(--muted, #9eada5);
    font-size: 8px;
    font-weight: 850;
    letter-spacing: .12em;
  }

  .qum-booking-card-copy > strong {
    font-size: 24px;
  }

  .qum-booking-card-copy > small {
    color: #aac0b5;
    font-size: 9px;
  }

  .qum-book-favourite-btn {
    width: 46px;
    height: 46px;
    flex: 0 0 46px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(244,154,160,.38);
    border-radius: 50%;
    background: rgba(244,154,160,.055);
    color: #f49aa0;
    cursor: pointer;
  }

  .qum-book-favourite-btn span {
    font-size: 24px;
    line-height: 1;
    transform: translateY(-1px);
  }

  .qum-book-favourite-btn.active {
    border-color: rgba(244,154,160,.72);
    background: rgba(244,154,160,.15);
    color: #ffc3c7;
    box-shadow: inset 0 0 0 1px rgba(244,154,160,.12);
  }
'@
if (-not $quickCss.Contains('/* My Booking favourite heart:')) { $quickCss += $favCss }
Write-Utf8 'quick-update-mobile.css' $quickCss

Write-Host ''
Write-Host 'RiseBlock guardrails update applied successfully.' -ForegroundColor Green
Write-Host 'Edited: app.js, styles.css, quick-update-mobile.js, quick-update-mobile.css'
Write-Host 'Backups: *.bak-before-guardrails'
Write-Host 'Supabase migration is already applied to the live RiseBlock project.'
