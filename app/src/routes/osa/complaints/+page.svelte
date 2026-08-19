<script lang="ts">
    import AppShell from '$lib/components/AppShell.svelte';
    import NavBar from '$lib/components/NavBar.svelte';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';

    let { data } = $props();

    const allNavLinks = data.userRole === 'security' ? [
        { label: 'Dashboard', href: '/osa/dashboard' },
        { label: 'Monitor', href: '/monitor' },
        { label: 'Complaints', href: '/osa/complaints', badge: data.unreadComplaints }
    ] : [
        { label: 'Dashboard', href: '/osa/dashboard' },
        { label: 'Complaints', href: '/osa/complaints', badge: data.unreadComplaints }
    ];
    const navLinks = $derived(allNavLinks.filter(l => l.href !== $page.url.pathname));

    let complaints: any[] = $state([]);
    let loading = $state(true);

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

    let displayedComplaints = $derived.by(() => {
        let filtered = complaints;

        if (selectedRoles.length !== allRoles.length) {
            filtered = filtered.filter(c => selectedRoles.includes((c.sender_role || '').toLowerCase()));
        }

        if (selectedCampus !== 'all') {
            filtered = filtered.filter(c => c.sender_campus === selectedCampus);
        }

        if (searchQuery) {
            const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
            filtered = filtered.filter(c => {
                const fullString = [c.sender_name, c.sender_email, c.sender_phone, c.message, c.sender_role]
                    .filter(val => val !== null && val !== undefined)
                    .map(val => String(val).toLowerCase())
                    .join(' ');
                return terms.every(term => fullString.includes(term));
            });
        }

        return filtered;
    });

    async function loadComplaints() {
        loading = true;
        try {
            const res = await fetch('/api/complaints');
            if (res.ok) {
                const json = await res.json();
                complaints = json.complaints || [];
            }
        } catch (e) {
            console.error(e);
        }
        loading = false;
    }

    onMount(() => {
        loadComplaints();
    });

    let selectedComplaint: any = $state(null);
    let scheduleModalOpen = $state(false);
    let selectedSchedule = $state('');
    let confirmLoading = $state(false);
    let resolveLoadingId = $state<number | null>(null);

    async function viewComplaint(c: any) {
        selectedComplaint = c;
        if (!c.is_read) {
            try {
                await fetch(`/api/complaints/${c.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_read: true })
                });
                c.is_read = 1;
                // Since this updates the read count, ideally we'd refresh the page or adjust navLinks
                data.unreadComplaints = Math.max(0, data.unreadComplaints - 1);
            } catch (e) {
                console.error(e);
            }
        }
    }

    function openScheduleModal(c: any, e: Event) {
        e.stopPropagation();
        selectedComplaint = c;
        selectedSchedule = c.schedule ? new Date(new Date(c.schedule).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
        scheduleModalOpen = true;
    }

    async function submitSchedule() {
        if (!selectedSchedule) {
            alert('Please select a schedule');
            return;
        }
        confirmLoading = true;
        try {
            const res = await fetch(`/api/complaints/${selectedComplaint.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedule: selectedSchedule })
            });

            if (res.ok) {
                selectedComplaint.schedule = selectedSchedule;
                scheduleModalOpen = false;
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to schedule');
            }
        } catch (e) {
            alert('Network error');
        }
        confirmLoading = false;
    }

    async function resolveComplaint(c: any, e: Event) {
        e.stopPropagation();
        if (!confirm('Mark this complaint as resolved?')) return;
        
        resolveLoadingId = c.id;
        try {
            const res = await fetch(`/api/complaints/${c.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'resolved' })
            });

            if (res.ok) {
                c.status = 'resolved';
            }
        } catch (e) {
            alert('Network error');
        }
        resolveLoadingId = null;
    }

    async function deleteComplaint(id: number, e: Event) {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this complaint?')) return;

        try {
            const res = await fetch(`/api/complaints/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                complaints = complaints.filter(c => c.id !== id);
                if (selectedComplaint?.id === id) {
                    selectedComplaint = null;
                }
            }
        } catch (e) {
            alert('Network error');
        }
    }
</script>

<svelte:head>
  <title>Complaints — Security | GateQR</title>
  <meta name="description" content="Manage user complaints." />
</svelte:head>

<AppShell>
  <NavBar title="Security Dashboard" links={navLinks} />

  <div class="layout-grid">
    <div class="complaints-list">
      <div class="list-header">
        <h2 class="section-title">Inbox</h2>
        
        <div class="controls-row">
          <div class="search-wrap">
            <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search name, email, message…"
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
      </div>

      <div class="list-content">
        {#if loading}
          <p class="empty-state">Loading complaints...</p>
        {:else if displayedComplaints.length === 0}
          <p class="empty-state">No complaints found.</p>
        {:else}
          {#each displayedComplaints as c}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="complaint-card" class:unread={!c.is_read} class:selected={selectedComplaint?.id === c.id} onclick={() => viewComplaint(c)}>
            <div class="card-header">
              <span class="sender-name">{c.sender_name || 'Unknown User'}</span>
              <span class="date-time">{new Date(c.created_at).toLocaleString()}</span>
            </div>
            <div class="card-meta">
              <span>{c.sender_email}</span>
              {#if c.sender_phone}
                <span> • {c.sender_phone}</span>
              {/if}
            </div>
            <div class="card-preview">
              {c.message}
            </div>
            <div class="card-actions">
                <div class="card-actions-left">
                  {#if c.status === 'resolved'}
                      <span class="status-badge resolved">Resolved</span>
                  {:else if c.schedule}
                      <span class="status-badge scheduled">Scheduled</span>
                      <button class="btn btn-sm btn-outline" disabled={resolveLoadingId === c.id} onclick={(e) => resolveComplaint(c, e)}>
                        {#if resolveLoadingId === c.id}<div class="spinner"></div>{/if}
                        Mark Resolved
                      </button>
                  {:else}
                      <span class="status-badge pending">Pending</span>
                      <button class="btn btn-sm btn-primary" onclick={(e) => openScheduleModal(c, e)}>Set Schedule</button>
                  {/if}
                </div>
                <button class="btn btn-sm btn-danger-outline" onclick={(e) => deleteComplaint(c.id, e)}>Delete</button>
            </div>
          </div>
          {/each}
        {/if}
      </div>
    </div>

    <div class="complaint-detail">
      {#if selectedComplaint}
        <div class="detail-header">
          <h3>{selectedComplaint.sender_name || 'Unknown User'}</h3>
          <p>{selectedComplaint.sender_email} {selectedComplaint.sender_phone ? `| ${selectedComplaint.sender_phone}` : ''}</p>
          <p class="detail-date">{new Date(selectedComplaint.created_at).toLocaleString()}</p>
        </div>
        <div class="detail-body">
          <p>{selectedComplaint.message}</p>
        </div>
        <div class="detail-footer">
          {#if selectedComplaint.status === 'resolved'}
              <div class="status-alert success">This complaint has been resolved.</div>
          {:else if selectedComplaint.schedule}
              <div class="status-alert info">Meeting Scheduled for: {new Date(selectedComplaint.schedule).toLocaleString()}</div>
              <button class="btn btn-primary" disabled={resolveLoadingId === selectedComplaint.id} onclick={(e) => resolveComplaint(selectedComplaint, e)}>
                {#if resolveLoadingId === selectedComplaint.id}<div class="spinner"></div>{/if}
                Mark as Resolved
              </button>
          {:else}
              <div class="status-alert warning">This complaint requires attention.</div>
              <button class="btn btn-primary" onclick={(e) => openScheduleModal(selectedComplaint, e)}>Schedule Meeting</button>
          {/if}
        </div>
      {:else}
        <div class="empty-detail">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <p>Select a complaint to view details</p>
        </div>
      {/if}
    </div>
  </div>

  {#if scheduleModalOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={() => { if (!confirmLoading) scheduleModalOpen = false; }}>
      <div class="modal-content" onclick={(e) => e.stopPropagation()}>
        <h3>Schedule Meeting</h3>
        <p>Set a date and time for the user to visit the security office.</p>
        <input type="datetime-local" bind:value={selectedSchedule} class="sched-input" disabled={confirmLoading} />
        <div class="modal-actions">
          <button class="btn-cancel" onclick={() => scheduleModalOpen = false} disabled={confirmLoading}>Cancel</button>
          <button class="btn-confirm" onclick={submitSchedule} disabled={confirmLoading} class:btn-confirming={confirmLoading}>
            {#if confirmLoading}
              <div class="spinner"></div>
              Scheduling...
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
  .layout-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 1.5rem;
    height: calc(100vh - 200px);
    min-height: 500px;
  }
  @media (max-width: 768px) {
    .layout-grid {
      grid-template-columns: 1fr;
      height: auto;
      min-height: unset;
    }
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 1rem;
    margin-top: 0;
  }

  .complaints-list {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .list-header {
    padding: 1rem;
    border-bottom: 1.5px solid var(--border);
    background: var(--background);
  }

  .list-content {
    padding: 1rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
  }

  .controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
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

  .complaint-card {
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    background: var(--background);
  }
  .complaint-card:hover { border-color: var(--text-dim); }
  .complaint-card.selected { border-color: var(--maroon); background: rgba(107, 26, 42, 0.03); }
  .complaint-card.unread { border-left: 4px solid var(--maroon); background: #fff; }

  .card-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;
  }
  .sender-name { font-weight: 700; color: var(--text); font-size: 0.95rem; }
  .date-time { font-size: 0.75rem; color: var(--text-dim); }
  .card-meta { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem; }
  .card-preview {
    font-size: 0.875rem; color: var(--text-primary);
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; text-overflow: ellipsis; margin-bottom: 1rem;
  }
  .card-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px dashed var(--border);
    flex-wrap: wrap;
  }

  .card-actions-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }

  .status-badge {
    font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 12px;
  }
  .status-badge.pending { background: rgba(217,119,6,0.15); color: #d97706; }
  .status-badge.scheduled { background: rgba(37,99,235,0.15); color: #2563eb; }
  .status-badge.resolved { background: rgba(34,197,94,0.15); color: #16a34a; }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 0.875rem;
    box-sizing: border-box;
    border-radius: var(--radius-sm);
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid transparent;
    font-family: inherit;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .btn-sm { height: 28px; padding: 0 0.625rem; font-size: 0.75rem; }
  .btn-primary { background: var(--maroon); color: white; }
  .btn-primary:hover { background: #551320; }
  .btn-outline { background: transparent; border-color: var(--border); color: var(--text); }
  .btn-outline:hover { border-color: var(--text-dim); }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .spinner {
    width: 14px; height: 14px; margin-right: 6px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn-danger-outline { background: transparent; border-color: rgba(220,38,38,0.3); color: #dc2626; }
  .btn-danger-outline:hover { background: rgba(220,38,38,0.1); }

  .complaint-detail {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
    display: flex; flex-direction: column;
    overflow-y: auto;
  }
  .empty-detail {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; color: var(--text-dim); gap: 1rem;
  }
  .detail-header {
    border-bottom: 2px solid var(--border); padding-bottom: 1rem; margin-bottom: 1.5rem;
  }
  .detail-header h3 { margin: 0 0 0.25rem 0; color: var(--text); font-size: 1.25rem; }
  .detail-header p { margin: 0; color: var(--text-secondary); font-size: 0.9rem; }
  .detail-date { margin-top: 0.5rem !important; font-size: 0.8rem !important; color: var(--text-dim) !important; }
  
  .detail-body { flex: 1; font-size: 0.95rem; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; }
  
  .detail-footer {
    margin-top: 2rem; padding-top: 1.5rem; border-top: 2px solid var(--border);
    display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;
  }

  .status-alert { padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.9rem; font-weight: 600; width: 100%; }
  .status-alert.info { background: rgba(37,99,235,0.1); color: #1d4ed8; }
  .status-alert.warning { background: rgba(217,119,6,0.1); color: #b45309; }
  .status-alert.success { background: rgba(34,197,94,0.1); color: #15803d; }

  .empty-state { text-align: center; color: var(--text-dim); padding: 2rem; }

  .modal-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
  }
  .modal-content {
    background: var(--surface); padding: 1.5rem; border-radius: var(--radius-md);
    width: 90%; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .modal-content h3 { margin-top: 0; color: var(--maroon); margin-bottom: 0.5rem; }
  .modal-content p { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
  .sched-input {
    width: 100%; padding: 0.75rem; margin: 1rem 0; border: 1px solid var(--border);
    border-radius: var(--radius-sm); font-family: inherit; box-sizing: border-box;
  }
  .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }

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
</style>
