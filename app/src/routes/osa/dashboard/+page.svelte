<script lang="ts">
    import AppShell from '$lib/components/AppShell.svelte';
    import NavBar from '$lib/components/NavBar.svelte';

    const navLinks = [
        { label: 'Applications', href: '/osa' },
        { label: 'Departments', href: '/osa/departments' },
    ];

    let { data } = $props();

    const stats = $derived([
        { label: 'Currently In', value: data.stats.currentlyIn, icon: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>` },
        { label: 'Visits Today', value: data.stats.visitsToday, icon: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>` },
    ]);

    let logs = $state(data.logs);
    let selectedDate = $state(new Date().toISOString().split('T')[0]);
    let loading = $state(false);

    let showModal = $state(false);
    let modalImage = $state('');

    async function loadLogs() {
        loading = true;
        try {
            const res = await fetch(`/api/gate/logs?date=${selectedDate}`);
            if (res.ok) {
                const json = await res.json();
                logs = json.logs;
            }
        } catch (e) {
            console.error(e);
        }
        loading = false;
    }

    function openPhoto(url: string | null) {
        if (!url) return;
        modalImage = url;
        showModal = true;
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

  <div class="stats-grid">
    {#each stats as stat}
      <div class="stat-card">
        <div class="stat-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            {@html stat.icon}
          </svg>
        </div>
        <div class="stat-body">
          <p class="stat-label">{stat.label}</p>
          <p class="stat-value">{stat.value}</p>
        </div>
      </div>
    {/each}
  </div>

  <div class="chart-card">
    <div class="table-header">
      <span class="table-title">Hourly Activity</span>
      <span class="table-sub">Today</span>
    </div>
    <div class="chart-container">
        {#each data.hourlyChart as count, hour}
            <div class="chart-bar-wrap" title="{hour}:00 - {count} entries">
                <div class="chart-bar" style="height: {count === 0 ? 0 : Math.max(10, (count / Math.max(...data.hourlyChart, 1)) * 100)}%"></div>
                <div class="chart-label">{hour}</div>
            </div>
        {/each}
    </div>
  </div>

  <div class="table-card">
    <div class="table-header" style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span class="table-title">Gate Logs</span>
      </div>
      <div>
        <input type="date" bind:value={selectedDate} onchange={loadLogs} class="date-filter" />
      </div>
    </div>
    
    {#if loading}
      <div style="padding: 2rem; text-align: center; color: var(--text-dim);">Loading logs...</div>
    {:else}
      <div class="table-wrap">
        <table class="log-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Name</th>
              <th>Vehicle</th>
              <th>Bound</th>
              <th>Photo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each logs as log}
              <tr>
                <td>{log.time}</td>
                <td>
                  <span class="type-chip {log.type === 'Guest' ? 'chip-guest' : 'chip-reg'}">{log.type}</span>
                </td>
                <td class="plate-cell">
                  {log.name}
                  {#if log.reason}
                    <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: normal; margin-top: 2px;">
                      Reason: {log.reason}
                    </div>
                  {/if}
                </td>
                <td>{log.make} <span class="plate-mini">({log.plate})</span></td>
                <td>
                  <span class="bound-chip" class:chip-in={log.bound === 'In'} class:chip-out={log.bound === 'Out'}>
                    {log.bound}
                  </span>
                </td>
                <td>
                    {#if log.photo}
                        <button class="photo-btn" onclick={() => openPhoto(log.photo)}>View</button>
                    {:else}
                        <span style="color: var(--text-dim); font-size: 0.8rem;">None</span>
                    {/if}
                </td>
                <td>
                    {#if log.status}
                        <span class="anomaly-chip">{log.status}</span>
                    {:else}
                        <span class="ok-chip">OK</span>
                    {/if}
                </td>
              </tr>
            {:else}
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-dim);">No logs found for this date.</td>
                </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</AppShell>

<style>
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.625rem;
    margin-bottom: 1rem;
  }

  .stat-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    box-shadow: var(--shadow-sm);
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .stat-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: var(--primary-alpha);
    color: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text);
  }

  .chart-card, .table-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    margin-bottom: 1rem;
    overflow: hidden;
  }

  .table-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .table-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text);
    margin-right: 0.5rem;
  }

  .table-sub {
    font-size: 0.8125rem;
    color: var(--text-dim);
    background: var(--border);
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  .date-filter {
      padding: 0.25rem 0.5rem;
      border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--background);
      color: var(--text);
      font-size: 0.875rem;
      outline: none;
  }
  .date-filter:focus {
      border-color: var(--primary);
  }

  .chart-container {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 120px;
      padding: 1rem;
      padding-top: 2rem;
  }

  .chart-bar-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
  }

  .chart-bar {
      width: 100%;
      max-width: 12px;
      background: var(--primary);
      border-radius: 4px 4px 0 0;
      min-height: 2px;
      transition: height 0.3s;
  }

  .chart-label {
      font-size: 0.6rem;
      color: var(--text-dim);
      margin-top: 4px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  .log-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 0.875rem;
  }

  .log-table th, .log-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
  }

  .log-table th {
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.75rem;
    background: var(--surface);
  }

  .log-table tbody tr:hover {
    background: var(--surface-hover);
  }

  .plate-cell {
    font-weight: 500;
    color: var(--text);
  }
  
  .plate-mini {
      color: var(--text-dim);
      font-size: 0.75rem;
  }

  .bound-chip, .type-chip, .anomaly-chip, .ok-chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .bound-chip { background: var(--border); color: var(--text-dim); }
  .chip-in { background: rgba(34, 197, 94, 0.15); color: #16a34a; }
  .chip-out { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
  
  .chip-guest { background: rgba(245, 158, 11, 0.15); color: #d97706; }
  .chip-reg { background: rgba(59, 130, 246, 0.15); color: #2563eb; }
  
  .anomaly-chip { background: rgba(239, 68, 68, 0.15); color: #dc2626; border: 1px solid #dc2626; }
  .ok-chip { background: rgba(34, 197, 94, 0.15); color: #16a34a; }

  .photo-btn {
      background: var(--border);
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
      color: var(--text);
  }
  .photo-btn:hover {
      background: var(--primary);
      color: white;
  }

  .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
  }
  
  .modal-content {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
  }
  
  .modal-content img {
      max-width: 100%;
      max-height: 90vh;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  }
  
  .modal-close {
      position: absolute;
      top: -40px;
      right: 0;
      background: none;
      border: none;
      color: white;
      font-size: 2rem;
      cursor: pointer;
  }
</style>