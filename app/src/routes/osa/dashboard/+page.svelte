<script lang="ts">
    import AppShell from '$lib/components/AppShell.svelte';
    import NavBar from '$lib/components/NavBar.svelte';

    let { data } = $props();

    const navLinks = data.userRole === 'security' ? [] : [
        { label: 'Applications', href: '/osa' },
        { label: 'Departments', href: '/osa/departments' },
    ];

    // ── Stats ────────────────────────────────────────────────────────────────
    let statsData = $state(data.stats || { currentlyIn: 0, visitsToday: 0, registeredIn: 0, guestsIn: 0, anomaliesToday: 0 });
    let roleBreakdown = $state(data.roleBreakdown || { student: 0, employee: 0, visitor: 0, concessionaire: 0, guest: 0 });
    let hourlyChart = $state(data.hourlyChart || Array(24).fill(0));

    const statCards = $derived([
        {
            label: 'Currently In',
            value: statsData.currentlyIn,
            desc: 'Vehicles inside campus right now',
            icon: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
            color: '#6b1a2a',
            bg: 'rgba(107,26,42,0.08)'
        },
        {
            label: 'Visits Today',
            value: statsData.visitsToday,
            desc: 'Total gate entries logged today',
            icon: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
            color: '#2563eb',
            bg: 'rgba(37,99,235,0.08)'
        },
        {
            label: 'Registered In',
            value: statsData.registeredIn,
            desc: 'Sticker holders still parked inside',
            icon: `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>`,
            color: '#059669',
            bg: 'rgba(5,150,105,0.08)'
        },
        {
            label: 'Anomalies Today',
            value: statsData.anomaliesToday,
            desc: 'Flagged scans — expired, revoked, or unrecognized',
            icon: `<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
            color: '#d97706',
            bg: 'rgba(217,119,6,0.08)'
        },
    ]);

    // ── Donut chart ──────────────────────────────────────────────────────────
    const donutSegments = $derived.by(() => {
        const categories = [
            { label: 'Student',      value: roleBreakdown.student,       color: '#6b1a2a' },
            { label: 'Employee',     value: roleBreakdown.employee,       color: '#2563eb' },
            { label: 'Visitor',      value: roleBreakdown.visitor,        color: '#059669' },
            { label: 'Concessionaire', value: roleBreakdown.concessionaire, color: '#7c3aed' },
            { label: 'Guest',        value: roleBreakdown.guest,          color: '#d97706' },
        ].filter(s => s.value > 0);

        const total = categories.reduce((s, c) => s + c.value, 0);
        if (total === 0) return { segments: [], total: 0, categories: [] };

        const r = 36, cx = 50, cy = 50, stroke = 14;
        const circ = 2 * Math.PI * r;
        let offset = 0;
        const segments = categories.map(cat => {
            const pct = cat.value / total;
            const dash = pct * circ;
            const seg = { ...cat, dash, gap: circ - dash, offset, pct };
            offset += dash;
            return seg;
        });
        return { segments, total, categories, circ, r, cx, cy, stroke };
    });

    // ── Gate Logs ────────────────────────────────────────────────────────────
    let logs = $state(data.logs || []);
    let totalLogs = $state(data.total || 0);
    let currentPage = $state(data.page || 1);
    let totalPages = $state(data.totalPages || 1);
    const pageSize = 25;

    let selectedDate  = $state(new Date().toISOString().split('T')[0]);
    let searchQuery   = $state('');
    let boundFilter   = $state('all');
    
    const allRoles = ['student', 'employee', 'visitor', 'concessionaire', 'guest'];
    let selectedRoles = $state([...allRoles]);
    let roleDropdownOpen = $state(false);

    let loading       = $state(false);

    let searchTimer: ReturnType<typeof setTimeout> | null = null;

    function toggleRole(role: string) {
        if (selectedRoles.includes(role)) {
            selectedRoles = selectedRoles.filter(r => r !== role);
        } else {
            selectedRoles = [...selectedRoles, role];
        }
        currentPage = 1; fetchLogs();
    }
    
    function getRoleDropdownLabel() {
        if (selectedRoles.length === allRoles.length) return 'All Roles';
        if (selectedRoles.length === 0) return 'No Roles';
        if (selectedRoles.length === 1) return selectedRoles[0].charAt(0).toUpperCase() + selectedRoles[0].slice(1);
        return `${selectedRoles.length} Roles`;
    }

    function onSearchInput() {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { currentPage = 1; fetchLogs(); }, 300);
    }

    function onFilterChange() { currentPage = 1; fetchLogs(); }

    async function fetchLogs() {
        loading = true;
        try {
            const roleParam = selectedRoles.length === allRoles.length ? 'all' : selectedRoles.join(',');
            const params = new URLSearchParams({
                date:   selectedDate,
                search: searchQuery,
                type:   'all',
                bound:  boundFilter,
                role:   roleParam,
                page:   String(currentPage),
                limit:  String(pageSize),
            });
            const res = await fetch(`/api/gate/logs?${params}`);
            if (res.ok) {
                const json = await res.json();
                logs = json.logs;
                totalLogs = json.total;
                currentPage = json.page;
                totalPages = json.totalPages;
            }
        } catch (e) { console.error(e); }
        loading = false;
    }

    function prevPage() { if (currentPage > 1) { currentPage--; fetchLogs(); } }
    function nextPage() { if (currentPage < totalPages) { currentPage++; fetchLogs(); } }

    // ── Photo modal ──────────────────────────────────────────────────────────
    let showModal  = $state(false);
    let modalImage = $state('');
    function openPhoto(url: string | null) { if (!url) return; modalImage = url; showModal = true; }

    // ── Hourly chart helpers ─────────────────────────────────────────────────
    const hourlyMax = $derived(Math.max(...hourlyChart, 1));
    const peakHour  = $derived(hourlyChart.indexOf(Math.max(...hourlyChart)));

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
</script>

<svelte:head>
  <title>Dashboard — OSA | GateQR</title>
  <meta name="description" content="OSA vehicle monitoring dashboard for Liceo de Cagayan University." />
</svelte:head>

{#if showModal}
<div class="modal-backdrop" onclick={() => showModal = false} role="button" tabindex="0" onkeydown={(e) => e.key === 'Escape' && (showModal = false)}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="document">
        <button class="modal-close" onclick={() => showModal = false}>&times;</button>
        <img src={modalImage} alt="Snapshot" />
    </div>
</div>
{/if}

<AppShell>
  <NavBar title="Dashboard" links={navLinks} />

  <!-- ── 4-up Stat Cards ─────────────────────────────────────── -->
  <div class="stats-grid">
    {#each statCards as stat}
      <div class="stat-card">
        <div class="stat-icon" style="background:{stat.bg}; color:{stat.color}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            {@html stat.icon}
          </svg>
        </div>
        <div class="stat-body">
          <p class="stat-label">{stat.label}</p>
          <p class="stat-value" style="color:{stat.color}">{stat.value}</p>
          <p class="stat-desc">{stat.desc}</p>
        </div>
      </div>
    {/each}
  </div>

  <!-- ── Charts row ──────────────────────────────────────────── -->
  <div class="charts-row">

    <!-- Hourly bar chart -->
    <div class="chart-card flex-2">
      <div class="card-header">
        <span class="card-title">Hourly Activity</span>
        <span class="card-badge">Today · Peak {peakHour}:00</span>
      </div>
      <div class="bar-chart">
        {#each hourlyChart as count, hour}
          <div class="bar-col" title="{hour}:00 — {count} entries">
            <div class="bar-value" class:bar-peak={hour === peakHour}
              style="height:{count === 0 ? 2 : Math.max(8, (count / hourlyMax) * 100)}%">
            </div>
            <div class="bar-label">{hour % 4 === 0 ? hour : ''}</div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Donut breakdown chart -->
    <div class="chart-card flex-1">
      <div class="card-header">
        <span class="card-title">Role Breakdown</span>
        <span class="card-badge">Today</span>
      </div>
      <div class="donut-wrap">
        {#if donutSegments.total === 0}
          <div class="donut-empty">No entries today</div>
        {:else}
          <svg viewBox="0 0 100 100" class="donut-svg">
            {#each donutSegments.segments as seg}
              <circle
                cx={donutSegments.cx}
                cy={donutSegments.cy}
                r={donutSegments.r}
                fill="none"
                stroke={seg.color}
                stroke-width={donutSegments.stroke}
                stroke-dasharray="{seg.dash} {seg.gap}"
                stroke-dashoffset={-seg.offset}
                transform="rotate(-90 50 50)"
              />
            {/each}
            <text x="50" y="47" text-anchor="middle" class="donut-num">{donutSegments.total}</text>
            <text x="50" y="57" text-anchor="middle" class="donut-sub">total</text>
          </svg>
          <ul class="donut-legend">
            {#each donutSegments.categories as cat}
              <li>
                <span class="legend-dot" style="background:{cat.color}"></span>
                <span class="legend-label">{cat.label}</span>
                <span class="legend-val">{cat.value}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>

  </div>

  <!-- ── Gate Logs Table ─────────────────────────────────────── -->
  <div class="table-card">
    <div class="table-header">
      <div class="header-left">
        <span class="card-title">Gate Logs</span>
        {#if !loading}
          <span class="card-badge">{totalLogs} entries</span>
        {/if}
      </div>
    </div>

    <!-- Controls row -->
    <div class="controls-row">
      <div class="search-wrap">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search name, plate, vehicle…"
          bind:value={searchQuery}
          oninput={onSearchInput}
          class="search-input"
        />
        {#if searchQuery}
          <button class="search-clear" onclick={() => { searchQuery = ''; currentPage = 1; fetchLogs(); }}>×</button>
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
        <select bind:value={boundFilter} onchange={onFilterChange} class="filter-select">
          <option value="all">In &amp; Out</option>
          <option value="in">Entry Only</option>
          <option value="out">Exit Only</option>
        </select>
        <input type="date" bind:value={selectedDate} onchange={() => { currentPage = 1; fetchLogs(); }} class="ctrl-input" />
      </div>
    </div>

    {#if loading}
      <div class="loading-row">
        <div class="spinner"></div>
        Loading…
      </div>
    {:else}
      <div class="table-wrap">
        <table class="log-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Name / Role</th>
              <th>Vehicle</th>
              <th>Bound</th>
              <th>Photo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each logs as log}
              <tr>
                <td class="td-time">
                  <span class="time-main">{log.time}</span>
                  <span class="time-date">{log.date}</span>
                </td>
                <td>
                  <span class="chip {log.type === 'Guest' ? 'chip-guest' : 'chip-reg'}">{log.type}</span>
                </td>
                <td class="td-name">
                  <span class="name-text">{log.name}</span>
                  <span class="role-badge">{log.role}</span>
                  {#if log.reason}
                    <div class="reason-text">⚠ {log.reason}</div>
                  {/if}
                </td>
                <td class="td-vehicle">
                  {log.make}
                  <span class="plate-tag">{log.plate}</span>
                </td>
                <td>
                  <span class="chip" class:chip-in={log.bound === 'In'} class:chip-out={log.bound === 'Out'}>{log.bound}</span>
                </td>
                <td>
                  {#if log.photo}
                    <button class="photo-btn" onclick={() => openPhoto(log.photo)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      View
                    </button>
                  {:else}
                    <span class="no-photo">—</span>
                  {/if}
                </td>
                <td>
                  {#if log.status}
                    <span class="chip chip-anomaly">{log.status}</span>
                  {:else}
                    <span class="chip chip-ok">OK</span>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="7" class="empty-cell">No logs found for the selected filters.</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Paginator -->
      {#if totalPages > 1}
        <div class="paginator">
          <button class="page-btn" onclick={prevPage} disabled={currentPage <= 1}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            Prev
          </button>
          <span class="page-info">Page {currentPage} of {totalPages}</span>
          <button class="page-btn" onclick={nextPage} disabled={currentPage >= totalPages}>
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      {/if}
    {/if}
  </div>
</AppShell>

<style>
  /* ── Stats grid ──────────────────────────────────────────────────────── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    margin-bottom: 1rem;
  }


  .stat-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1.125rem 1rem;
    display: flex;
    gap: 0.875rem;
    align-items: center;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

  .stat-icon {
    width: 36px; height: 36px;
    border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .stat-body { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; overflow: hidden; }
  .stat-label { font-size: 0.72rem; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .stat-value { font-size: 1.5rem; font-weight: 800; line-height: 1.15; }
  .stat-desc  { font-size: 0.73rem; color: var(--text-dim); margin-top: 2px; line-height: 1.45; white-space: normal; word-break: break-word; }

  /* ── Charts row ──────────────────────────────────────────────────────── */
  .charts-row {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    align-items: stretch;
  }
  .flex-1 { flex: 1; }
  .flex-2 { flex: 2; }
  @media (max-width: 640px) { .charts-row { flex-direction: column; } }

  .chart-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }

  .card-header {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .card-title { font-size: 0.9375rem; font-weight: 600; color: var(--text); }
  .card-badge {
    font-size: 0.75rem; color: var(--text-dim);
    background: var(--border); padding: 2px 7px; border-radius: 20px;
  }

  /* ── Hourly bar chart ────────────────────────────────────────────────── */
  .bar-chart {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 140px;
    padding: 1.25rem 1rem 0.5rem;
  }
  .bar-col {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; height: 100%; justify-content: flex-end;
  }
  .bar-value {
    width: 100%; max-width: 14px;
    background: linear-gradient(to top, var(--maroon), #e05070);
    border-radius: 3px 3px 0 0;
    transition: height 0.4s ease;
    min-height: 2px;
    opacity: 0.65;
  }
  .bar-peak { opacity: 1; box-shadow: 0 0 6px rgba(107,26,42,0.4); }
  .bar-label { font-size: 0.55rem; color: var(--text-dim); margin-top: 3px; min-height: 10px; }

  /* ── Donut chart ─────────────────────────────────────────────────────── */
  .donut-wrap {
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .donut-svg {
    width: 110px; height: 110px;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.1));
  }
  .donut-num { font-size: 16px; font-weight: 800; fill: var(--text); }
  .donut-sub { font-size: 7px; fill: var(--text-dim); }
  .donut-empty { font-size: 0.85rem; color: var(--text-dim); padding: 1rem; }

  .donut-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .donut-legend li { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .legend-label { color: var(--text-dim); flex: 1; }
  .legend-val { font-weight: 700; color: var(--text); }

  /* ── Table card ──────────────────────────────────────────────────────── */
  .table-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    margin-bottom: 1rem;
  }
  .table-header {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .header-left { display: flex; align-items: center; gap: 0.5rem; }
  .header-right { display: flex; align-items: center; gap: 0.5rem; }

  /* ── Controls ────────────────────────────────────────────────────────── */
  .controls-row {
    padding: 0.625rem 1rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    background: var(--background);
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

  .filter-select, .ctrl-input {
    height: 32px;
    padding: 0 0.625rem;
    border: 1.5px solid var(--border); border-radius: var(--radius-sm);
    background: var(--surface); color: var(--text);
    font-size: 0.8125rem; font-family: inherit; outline: none;
    cursor: pointer; transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .filter-select:focus, .ctrl-input:focus { border-color: var(--maroon); }

  .dropdown-wrap { position: relative; }
  .dropdown-btn { min-width: 130px; text-align: left; display: flex; justify-content: space-between; align-items: center; }
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
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

  /* ── Loading ─────────────────────────────────────────────────────────── */
  .loading-row {
    display: flex; align-items: center; justify-content: center;
    gap: 0.5rem; padding: 3rem; color: var(--text-dim); font-size: 0.875rem;
  }
  .spinner {
    width: 16px; height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--maroon);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Table ───────────────────────────────────────────────────────────── */
  .table-wrap { overflow-x: auto; }
  .log-table {
    width: 100%; border-collapse: collapse;
    text-align: left; font-size: 0.875rem;
  }
  .log-table th, .log-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .log-table th {
    font-weight: 600; color: var(--text-dim);
    text-transform: uppercase; letter-spacing: 0.05em;
    font-size: 0.7rem; background: var(--surface); position: sticky; top: 0;
  }
  .log-table tbody tr:hover { background: var(--surface-hover); }

  .td-time { min-width: 80px; }
  .time-main { display: block; font-weight: 600; color: var(--text); }
  .time-date { display: block; font-size: 0.7rem; color: var(--text-dim); }

  .td-name { max-width: 180px; }
  .name-text { display: block; font-weight: 500; }
  .role-badge {
    display: inline-block; font-size: 0.65rem; font-weight: 600;
    padding: 1px 5px; border-radius: 4px; margin-top: 2px;
    background: var(--border); color: var(--text-dim); text-transform: capitalize;
  }
  .reason-text { font-size: 0.7rem; color: #d97706; margin-top: 2px; }

  .td-vehicle { color: var(--text); }
  .plate-tag {
    display: inline-block; font-size: 0.7rem; font-weight: 700;
    padding: 1px 5px; border-radius: 3px;
    background: var(--border); color: var(--text-dim); margin-left: 4px;
    font-family: monospace; letter-spacing: 0.05em;
  }

  /* ── Chips ───────────────────────────────────────────────────────────── */
  .chip {
    display: inline-flex; align-items: center;
    padding: 2px 8px; border-radius: 12px;
    font-size: 0.72rem; font-weight: 600;
  }
  .chip-in          { background: rgba(34,197,94,0.15);  color: #16a34a; }
  .chip-out         { background: rgba(239,68,68,0.15);  color: #dc2626; }
  .chip-guest       { background: rgba(245,158,11,0.15); color: #d97706; }
  .chip-reg         { background: rgba(59,130,246,0.15); color: #2563eb; }
  .chip-anomaly     { background: rgba(239,68,68,0.12);  color: #dc2626; border: 1px solid rgba(220,38,38,0.3); }
  .chip-ok          { background: rgba(34,197,94,0.12);  color: #16a34a; }

  /* ── Photo btn ───────────────────────────────────────────────────────── */
  .photo-btn {
    display: inline-flex; align-items: center; gap: 4px;
    background: var(--border); border: none;
    padding: 4px 8px; border-radius: 4px;
    cursor: pointer; font-size: 0.72rem; color: var(--text);
    transition: background 0.15s;
  }
  .photo-btn:hover { background: var(--maroon); color: white; }
  .no-photo { color: var(--text-dim); font-size: 0.8rem; }

  .empty-cell { text-align: center; padding: 3rem; color: var(--text-dim); font-size: 0.875rem; }

  /* ── Paginator ───────────────────────────────────────────────────────── */
  .paginator {
    display: flex; align-items: center; justify-content: center;
    gap: 0.75rem; padding: 0.875rem;
    border-top: 1px solid var(--border);
  }
  .page-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 0.4rem 0.875rem; border-radius: var(--radius-sm);
    border: 1.5px solid var(--border); background: var(--surface);
    color: var(--text); font-size: 0.8125rem; font-weight: 600;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .page-btn:hover:not(:disabled) { border-color: var(--maroon); color: var(--maroon); }
  .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .page-info { font-size: 0.8125rem; color: var(--text-dim); }

  /* ── Photo modal ─────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999;
  }
  .modal-content { position: relative; max-width: 90vw; max-height: 90vh; }
  .modal-content img { max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
  .modal-close {
    position: absolute; top: -40px; right: 0;
    background: none; border: none; color: white; font-size: 2rem; cursor: pointer;
  }
</style>