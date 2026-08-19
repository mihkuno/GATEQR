<script lang="ts">
    import AppShell from '$lib/components/AppShell.svelte';
    import NavBar from '$lib/components/NavBar.svelte';
    import TabBar from '$lib/components/TabBar.svelte';
    import ApplicationCard from '$lib/components/ApplicationCard.svelte';
    import ActionBar from '$lib/components/ActionBar.svelte';
    import { invalidateAll } from '$app/navigation';

    let { data } = $props();
    let apps = $derived((data.applications as any[]) || []);

    let tab = $state(data.activeTab || 'validation');
    const tabs = ['validation', 'distribution', 'monitoring', 'history'];
    const navLinks = [
        { label: 'Dashboard', href: '/osa/dashboard' },
        { label: 'Departments', href: '/osa/departments' },
    ];

    let searchQuery = $state('');
    
    const allRoles = ['student', 'employee', 'visitor', 'concessionaire', 'guest'];
    let selectedRoles = $state([...allRoles]);
    let roleDropdownOpen = $state(false);

    let selectedCampus = $state('all');

    function toggleRole(role: string) {
        if (selectedRoles.includes(role)) {
            selectedRoles = selectedRoles.filter(r => r !== role);
        } else {
            selectedRoles = [...selectedRoles, role];
        }
    }
    
    function getRoleDropdownLabel() {
        if (selectedRoles.length === allRoles.length) return 'All Roles';
        if (selectedRoles.length === 0) return 'No Roles';
        if (selectedRoles.length === 1) return selectedRoles[0].charAt(0).toUpperCase() + selectedRoles[0].slice(1);
        return `${selectedRoles.length} Roles`;
    }

    function clickOutside(node: HTMLElement, callback: () => void) {
        const handleClick = (e: MouseEvent) => {
            if (node && !node.contains(e.target as Node) && !e.defaultPrevented) {
                callback();
            }
        };
        document.addEventListener('click', handleClick, true);
        return {
            destroy() {
                document.removeEventListener('click', handleClick, true);
            }
        };
    }

    $effect(() => {
        document.cookie = `osa_active_tab=${tab}; path=/osa; max-age=31536000; SameSite=Lax`;
    });

    let displayedApps = $derived.by(() => {
        let filtered = apps;

        if (tab === 'validation') filtered = filtered.filter(a => a.status === 'osa_val');
        else if (tab === 'distribution') filtered = filtered.filter(a => a.status === 'osa_dist' && !a.osa_dist_at);
        else if (tab === 'monitoring') filtered = filtered.filter(a => a.status === 'osa_dist' && a.osa_dist_at);
        else filtered = filtered.filter(a => ['rejected', 'revoked', 'expired'].includes(a.status));

        if (selectedRoles.length !== allRoles.length) {
            filtered = filtered.filter(a => selectedRoles.includes((a.role || '').toLowerCase()));
        }

        if (selectedCampus !== 'all') {
            filtered = filtered.filter(a => a.campus === selectedCampus);
        }

        if (searchQuery) {
            const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
            filtered = filtered.filter(a => {
                const fullString = Object.values(a)
                    .filter(val => val !== null && val !== undefined)
                    .map(val => String(val).toLowerCase())
                    .join(' ');
                return terms.every(term => fullString.includes(term));
            });
        }

        return filtered;
    });

    let scheduleModalOpen = $state(false);
    let selectedSchedule = $state('');
    let pendingAction = $state<{ id: number; action: string; resolve: () => void } | null>(null);
    let confirmLoading = $state(false);

    async function handleAction(registration_id: number, action: string) {
        if (action === 'accept') {
            // Return a promise that stays pending until the modal resolves or is cancelled.
            // This keeps ActionBar's loadingAction active (spinner + disabled) the whole time.
            return new Promise<void>((resolve) => {
                pendingAction = { id: registration_id, action, resolve };
                scheduleModalOpen = true;
            });
        }

        let reason = '';
        if (action === 'reject' || action === 'revoke') {
            reason = prompt(`Please provide a reason to ${action}:`);
            if (reason === null) return;
        } else if (action === 'delete' || action === 'unrevoke') {
            if (!confirm(`Are you sure you want to ${action} this application?`)) return;
        }

        await submitAction(registration_id, action, reason);
    }

    async function submitSchedule() {
        if (!selectedSchedule) {
            alert('Please select a schedule');
            return;
        }
        if (pendingAction) {
            confirmLoading = true;
            try {
                await submitAction(pendingAction.id, pendingAction.action, '', selectedSchedule);
            } finally {
                confirmLoading = false;
                scheduleModalOpen = false;
                pendingAction.resolve(); // release ActionBar's loadingAction
            }
        }
        pendingAction = null;
        selectedSchedule = '';
    }

    function cancelSchedule() {
        if (confirmLoading) return;
        scheduleModalOpen = false;
        pendingAction?.resolve(); // release ActionBar so the button re-enables
        pendingAction = null;
        selectedSchedule = '';
    }

    async function submitAction(registration_id: number, action: string, reason: string = '', schedule: string = '') {
        try {
            const res = await fetch('/api/osa/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registration_id, action, reason, schedule })
            });

            if (res.ok) {
                await invalidateAll();
            } else {
                const err = await res.json();
                alert(err.error || 'Action failed');
            }
        } catch (e) {
            alert('Network error');
        }
    }
</script>

<svelte:head>
  <title>Applications — OSA | GateQR</title>
  <meta name="description" content="Manage vehicle sticker applications at the Office of Student Affairs." />
</svelte:head>

<AppShell>
  <NavBar title="Applications" links={navLinks} />

  <TabBar {tabs} active={tab} onchange={(t) => tab = t} />

  <div class="controls-row">
    <div class="search-wrap">
      <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        type="text"
        placeholder="Search name, plate, vehicle…"
        bind:value={searchQuery}
        class="search-input"
      />
      {#if searchQuery}
        <button class="search-clear" onclick={() => { searchQuery = ''; }}>×</button>
      {/if}
    </div>

    <div class="filters">
      <div class="dropdown-wrap" use:clickOutside={() => roleDropdownOpen = false}>
        <button class="filter-select dropdown-btn" onclick={() => roleDropdownOpen = !roleDropdownOpen}>
          {getRoleDropdownLabel()}
        </button>
        {#if roleDropdownOpen}
          <div class="dropdown-menu">
            {#each allRoles as role}
              <label class="dropdown-item">
                <input type="checkbox" checked={selectedRoles.includes(role)} onchange={() => toggleRole(role)} />
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </label>
            {/each}
          </div>
        {/if}
      </div>

      <select bind:value={selectedCampus} class="filter-select">
        <option value="all">All Campuses</option>
        <option value="Liceo Main">Liceo Main</option>
        <option value="RNP">RNP</option>
        <option value="PASEO">PASEO</option>
      </select>
    </div>
  </div>

  <div class="cards-list">
    {#each displayedApps as app}
      <ApplicationCard data={{
        id: app.id || '-',
        name: `${app.first_name} ${app.last_name}`,
        role: app.role,
        campus: app.campus,
        'year level': app.year_level || '-',
        email: app.user_email,
        contact: app.contact_number,
        department: app.department_name || '-',
        'dept. email': app.department_email || '-',
        vehicle: app.vehicle_make,
        'vehicle type': app.vehicle_type,
        plate: app.vehicle_plate,
        owner: app.is_owner ? 'Yes' : 'No',
        status: app.status,
        crd: app.created_at,
        sgn: app.dept_val_at,
        apv: app.osa_val_at,
        sch: app.dist_sched,
        exp: app.expires_at,
        dlv: app.osa_dist_at,
        rejection_reason: app.invalid_reason || null,
        documents: {
          id: app.doc_id,
          enrollment: app.doc_load,
          or: app.doc_or,
          cr: app.doc_cr,
          license: app.doc_license,
          letter: app.doc_letter
        }
      }} showQR={app.doc_qr != null}>
        {#snippet children()}
          {#if app.doc_qr}
            <div class="card-qr">
              <img src={app.doc_qr} alt="QR" width="100"/>
              <a href={app.doc_qr} download>Download</a>
            </div>
          {/if}
          <ActionBar {tab} status={app.status} expiresAt={app.expires_at} onaction={(action) => handleAction(app.auto_id, action)} />
        {/snippet}
      </ApplicationCard>
    {:else}
      <p class="empty-state">No applications found.</p>
    {/each}
  </div>

  {#if scheduleModalOpen}
    <div class="modal-overlay" onclick={() => { if (!confirmLoading) cancelSchedule(); }}>
      <div class="modal-content" onclick={(e) => e.stopPropagation()}>
        <h3>Schedule Sticker Pickup</h3>
        <p>Please select a date and time for the applicant to visit OSA.</p>
        <input type="datetime-local" bind:value={selectedSchedule} class="sched-input" disabled={confirmLoading} />
        <div class="modal-actions">
          <button class="btn-cancel" onclick={cancelSchedule} disabled={confirmLoading}>Cancel</button>
          <button class="btn-confirm" onclick={submitSchedule} disabled={confirmLoading} class:btn-confirming={confirmLoading}>
            {#if confirmLoading}
              <svg class="modal-spinner" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2.5" stroke-dasharray="35 15" stroke-linecap="round"/>
              </svg>
              Confirming…
            {:else}
              Confirm Schedule
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</AppShell>

<style>
  .controls-row {
    padding: 0.625rem 1rem;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }

  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 200px;
    display: flex;
    align-items: center;
  }
  .search-icon { position: absolute; left: 0.625rem; color: var(--text-dim); pointer-events: none; flex-shrink: 0; }
  .search-input {
    width: 100%;
    height: 32px;
    padding: 0 2rem 0 2.1rem;
    border: 1.5px solid var(--border); border-radius: var(--radius-sm);
    background: var(--surface); color: var(--text); font-size: 0.8125rem;
    font-family: inherit; outline: none; transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .search-input:focus { border-color: var(--maroon); }
  .search-clear {
    position: absolute; right: 0.5rem;
    background: none; border: none; cursor: pointer;
    color: var(--text-dim); font-size: 1rem; line-height: 1; padding: 0;
  }
  .search-clear:hover { color: var(--text); }

  .filters { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; }

  .filter-select {
    height: 32px;
    padding: 0 0.625rem;
    border: 1.5px solid var(--border); border-radius: var(--radius-sm);
    background: var(--surface); color: var(--text);
    font-size: 0.8125rem; font-family: inherit; outline: none;
    cursor: pointer; transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .filter-select:focus { border-color: var(--maroon); }

  .dropdown-wrap { position: relative; }
  .dropdown-btn { min-width: 130px; text-align: left; display: flex; justify-content: space-between; align-items: center; }
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
    padding: 0.5rem;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 140px;
  }
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: var(--text);
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    transition: background 0.15s;
  }
  .dropdown-item:hover { background: var(--surface-hover); }

  .cards-list {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-top: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-muted);
    font-size: 0.9rem;
    background: var(--surface);
    border: 1.5px dashed var(--border);
    border-radius: var(--radius-md);
  }

  .card-qr {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--border-light);
  }

  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-content {
    background: var(--surface);
    padding: 1.5rem;
    border-radius: var(--radius-md);
    width: 90%;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .modal-content h3 { margin-top: 0; color: var(--maroon); margin-bottom: 0.5rem; }
  .modal-content p { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
  .sched-input {
    width: 100%;
    padding: 0.75rem;
    margin: 1rem 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-family: inherit;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .btn-cancel, .btn-confirm {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    border: none;
    font-weight: 600;
    font-family: inherit;
    font-size: 0.875rem;
    transition: opacity 0.15s;
  }
  .btn-cancel { background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); }
  .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-confirm { background: var(--maroon); color: white; }
  .btn-confirm:disabled { opacity: 0.7; cursor: not-allowed; }
  .btn-confirming { cursor: wait !important; }

  .modal-spinner {
    width: 14px;
    height: 14px;
    animation: spin 0.75s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>