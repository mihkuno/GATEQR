<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';
  import DocumentGrid from './DocumentGrid.svelte';

  let {
    tab = 'validation',
    showQR = false,
    showDocs = true,
    data = {},
    children
  }: {
    tab?: string;
    showQR?: boolean;
    showDocs?: boolean;
    data?: Record<string, any>;
    children?: any;
  } = $props();

  let showDocPopup = $state<string | null>(null);

  let defaults = $derived({
    id: '2022307166',
    name: 'Joeninyo Cainday',
    role: 'Student',
    email: 'joenino.cainday@liceo.edu.ph',
    department: 'BSCS',
    'dept. email': 'junar.landicho@liceo.edu.ph',
    vehicle: 'Toyota Corolla',
    plate: 'ABC-1234',
    owner: 'No',
    ...data
  } as Record<string, any>);

  const docLabels: Record<string, string> = {
    id: 'School ID',
    enrollment: 'Enrollment / Load',
    or: 'Vehicle OR',
    cr: 'Vehicle CR',
    license: "Driver's License",
    letter: 'Signed Letter / DOAS'
  };

  let role = $derived(defaults.role?.toLowerCase() ?? 'student');
  let ownerVal = $derived(defaults.owner?.toLowerCase() === 'yes' ? 'yes' : 'no');
  let rejectionReason = $derived(defaults.rejection_reason ?? null);
  let appStatus = $derived(defaults.status ?? null);
  let reasonLabel = $derived(appStatus === 'revoked' ? 'Revoked:' : 'Rejected:');

  function formatDate(d: string | null | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  let statusLabel = $derived(appStatus?.replace('_', ' ')?.toUpperCase() || 'UNKNOWN');
  let statusVariant = $derived(
    ['osa_dist', 'osa_val', 'dept_val'].includes(appStatus) ? 'success' :
    ['rejected', 'revoked', 'expired'].includes(appStatus) ? 'danger' : 'warning'
  );
</script>

<div class="app-card">
  <!-- Top: QR + Details + Badges -->
  <div class="card-top">
    <!-- QR Code -->
    {#if showQR && tab !== 'validation'}
      <div class="qr-block">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="2.5"/>
        </svg>
        <span>QR</span>
      </div>
    {/if}

    <!-- Details table -->
    <div class="card-details">
      <table class="info-table">
        <tbody>
          {#each Object.entries(defaults) as [key, val]}
            {#if val !== undefined && !['documents', 'owner', 'rejection_reason', 'status', 'crd', 'sgn', 'apv', 'sch', 'exp', 'dlv'].includes(key)}
              <tr>
                <td class="info-key">{key}:</td>
                <td class="info-val">{val}</td>
              </tr>
            {/if}
          {/each}
          {#if rejectionReason}
            <tr>
              <td class="info-key reason-key">{reasonLabel}</td>
              <td class="info-val reason-val">{rejectionReason}</td>
            </tr>
          {/if}
        </tbody>
      </table>

      <!-- Badges column -->
      <div class="badge-col">
        {#if appStatus}
          <StatusBadge code="STS" date={statusLabel} variant={statusVariant} />
        {/if}
        {#if data.crd}
          <StatusBadge code="CRD" date={formatDate(data.crd)} />
        {/if}
        {#if data.sgn}
          <StatusBadge code="SGN" date={formatDate(data.sgn)} variant="success" />
        {/if}
        {#if data.apv}
          <StatusBadge code="APV" date={formatDate(data.apv)} variant="success" />
        {/if}
        {#if data.sch}
          <StatusBadge code="SCH" date={formatDate(data.sch)} variant="warning" />
        {/if}
        {#if data.dlv}
          <StatusBadge code="DLV" date={formatDate(data.dlv)} variant="success" />
        {/if}
        {#if data.exp}
          <StatusBadge code="EXP" date={formatDate(data.exp)} variant="warning" />
        {/if}
      </div>
    </div>
  </div>

  <!-- Document grid -->
  {#if showDocs}
    <div class="card-divider"></div>
    <DocumentGrid role={role} owner={ownerVal} documents={defaults.documents || {}} onopen={(url) => showDocPopup = url} />
  {/if}

  <!-- Extra slot (action bar, inputs etc.) -->
  {#if children}
    <div class="card-divider"></div>
    {@render children()}
  {/if}
</div>

{#if showDocPopup}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="doc-modal-overlay" onclick={() => showDocPopup = null}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="doc-modal-content" onclick={(e) => e.stopPropagation()}>
      <button class="close-modal" onclick={() => showDocPopup = null}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="doc-image-wrap">
        <img src={showDocPopup} alt="Document Preview" class="doc-preview-img" />
      </div>
    </div>
  </div>
{/if}

<style>
  .app-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: var(--shadow-sm);
  }

  .card-top {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  @media (min-width: 480px) {
    .card-top {
      flex-direction: row;
    }
  }

  .qr-block {
    width: 100%;
    height: 72px;
    border: 1.5px dashed var(--border);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    color: var(--text-muted);
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    flex-shrink: 0;
  }

  @media (min-width: 480px) {
    .qr-block {
      width: 100px;
      height: 100px;
    }
  }

  .qr-block:hover {
    background: var(--maroon-muted);
  }

  .card-details {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
    gap: 0.75rem;
    min-width: 0;
  }

  .info-table {
    width: 100%;
    font-size: 0.8rem;
    border-collapse: collapse;
  }

  .info-key {
    font-weight: 600;
    color: var(--text-secondary);
    padding-right: 0.75rem;
    padding-bottom: 0.25rem;
    white-space: nowrap;
    vertical-align: top;
    text-transform: capitalize;
  }

  .info-val {
    color: var(--text-primary);
    padding-bottom: 0.25rem;
    word-break: break-all;
  }

  .reason-key {
    color: #b91c1c;
    font-weight: 700;
  }

  .reason-val {
    color: #b91c1c;
    font-size: 0.8rem;
  }

  .badge-col {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    flex-shrink: 0;
  }

  .card-divider {
    height: 1px;
    background: var(--border-light);
    margin: -0.25rem 0;
  }

  .doc-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .doc-modal-content {
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: 1.5rem;
    position: relative;
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
    max-width: 92vw;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(16px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .close-modal {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: var(--maroon-muted);
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    transition: background 0.15s, color 0.15s;
  }

  .close-modal:hover {
    background: var(--maroon);
    color: #fff;
    border-color: var(--maroon);
  }

  .doc-image-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .doc-preview-img {
    max-width: 90vw;
    max-height: 80vh;
    object-fit: contain;
    border-radius: var(--radius-sm);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
</style>
