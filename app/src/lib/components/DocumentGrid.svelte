<script lang="ts">
  let { role, owner, clickable = true, documents = {}, onopen }: {
    role: string;
    owner: string;
    clickable?: boolean;
    documents?: Record<string, string | null>;
    onopen?: (url: string) => void;
  } = $props();

  const ltoFull = $derived(!(role === 'visitor' && owner === 'yes'));

  function open(url: string | null | undefined) {
    if (url && onopen) onopen(url);
  }
</script>

<div class="doc-section">
  <!-- Liceo documents for non-visitors/concessionaires (always shown for student/employee) -->
  {#if role !== 'visitor' && role !== 'concessionaire'}
    <div class="doc-grid" style="--cols: {owner === 'no' ? 3 : 2}">
      <button class="doc-tile" class:has-doc={!!documents.id} disabled={!clickable || !documents.id} onclick={() => open(documents.id)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>
        (Liceo) {role === 'student' ? 'Student ID' : 'Employee ID'}
      </button>
      <button class="doc-tile" class:has-doc={!!documents.enrollment} disabled={!clickable || !documents.enrollment} onclick={() => open(documents.enrollment)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        (Liceo) {role === 'student' ? 'Enrollment Form' : 'Load Sheet / DTR'}
      </button>
      {#if owner === 'yes'}
        <button class="doc-tile" class:has-doc={!!documents.letter} disabled={!clickable || !documents.letter} onclick={() => open(documents.letter)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>
          Signed Letter / DOAS
        </button>
      {/if}
    </div>
  {/if}

  <!-- Visitor + registered under someone else -->
  {#if role === 'visitor' && owner === 'yes'}
    <div class="doc-grid" style="--cols: 2">
      <button class="doc-tile" class:has-doc={!!documents.license} disabled={!clickable || !documents.license} onclick={() => open(documents.license)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        (LTO) Driver's License
      </button>
      <button class="doc-tile" class:has-doc={!!documents.letter} disabled={!clickable || !documents.letter} onclick={() => open(documents.letter)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>
        Signed Letter / DOAS
      </button>
    </div>
  {/if}

  <!-- LTO documents (always shown) -->
  <div class="doc-grid" style="--cols: {ltoFull ? 3 : 2}">
    {#if ltoFull}
      <button class="doc-tile" class:has-doc={!!documents.license} disabled={!clickable || !documents.license} onclick={() => open(documents.license)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        (LTO) Driver's License
      </button>
    {/if}
    <button class="doc-tile" class:has-doc={!!documents.or} disabled={!clickable || !documents.or} onclick={() => open(documents.or)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      (LTO) Vehicle OR
    </button>
    <button class="doc-tile" class:has-doc={!!documents.cr} disabled={!clickable || !documents.cr} onclick={() => open(documents.cr)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      (LTO) Vehicle CR
    </button>
  </div>
</div>

<style>
  .doc-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .doc-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 3), 1fr);
    gap: 0.5rem;
  }

  .doc-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: 72px;
    padding: 0.5rem;
    background: var(--maroon-muted);
    border: 1.5px solid var(--border-light);
    border-radius: var(--radius-sm);
    font-size: 0.68rem;
    font-weight: 500;
    color: var(--maroon);
    font-family: inherit;
    cursor: pointer;
    text-align: center;
    line-height: 1.3;
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
  }

  .doc-tile:hover:not(:disabled) {
    background: var(--maroon-tint);
    border-color: var(--maroon-light);
    transform: translateY(-1px);
  }

  .doc-tile:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .doc-tile.has-doc {
    border-color: var(--maroon-light);
    background: var(--maroon-tint);
  }

  .doc-tile svg {
    color: var(--maroon-light);
    flex-shrink: 0;
  }
</style>
