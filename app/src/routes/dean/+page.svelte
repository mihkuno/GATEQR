<script lang="ts">
  import AppShell from "$lib/components/AppShell.svelte";
  import TabBar from "$lib/components/TabBar.svelte";
  import ApplicationCard from "$lib/components/ApplicationCard.svelte";
  import ActionBar from "$lib/components/ActionBar.svelte";
  import { invalidateAll } from "$app/navigation";

  let { data } = $props();
  let apps = $derived((data.applications as any[]) || []);

  let tab = $state(data.activeTab || "validation");
  const tabs = ["validation", "history"];

  let searchQuery = $state("");

  const allRoles = [
    "student",
    "employee",
    "visitor",
    "concessionaire",
    "guest",
  ];
  let selectedRoles = $state([...allRoles]);
  let roleDropdownOpen = $state(false);

  let selectedCampus = $state("all");

  function toggleRole(role: string) {
    if (selectedRoles.includes(role)) {
      selectedRoles = selectedRoles.filter((r) => r !== role);
    } else {
      selectedRoles = [...selectedRoles, role];
    }
  }

  function getRoleDropdownLabel() {
    if (selectedRoles.length === allRoles.length) return "All Roles";
    if (selectedRoles.length === 0) return "No Roles";
    if (selectedRoles.length === 1)
      return (
        selectedRoles[0].charAt(0).toUpperCase() + selectedRoles[0].slice(1)
      );
    return `${selectedRoles.length} Roles`;
  }

  function clickOutside(node: HTMLElement, callback: () => void) {
    const handleClick = (e: MouseEvent) => {
      if (node && !node.contains(e.target as Node) && !e.defaultPrevented) {
        callback();
      }
    };
    document.addEventListener("click", handleClick, true);
    return {
      destroy() {
        document.removeEventListener("click", handleClick, true);
      },
    };
  }

  $effect(() => {
    document.cookie = `dean_active_tab=${tab}; path=/dean; max-age=31536000; SameSite=Lax`;
  });

  let displayedApps = $derived.by(() => {
    let filtered = apps;

    if (tab === "validation")
      filtered = filtered.filter((a) => a.status === "dept_val");
    else filtered = filtered.filter((a) => a.status !== "dept_val");

    if (selectedRoles.length !== allRoles.length) {
      filtered = filtered.filter((a) =>
        selectedRoles.includes((a.role || "").toLowerCase()),
      );
    }

    if (selectedCampus !== "all") {
      filtered = filtered.filter((a) => a.campus === selectedCampus);
    }

    if (searchQuery) {
      const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      filtered = filtered.filter((a) => {
        const fullString = Object.values(a)
          .filter((val) => val !== null && val !== undefined)
          .map((val) => String(val).toLowerCase())
          .join(" ");
        return terms.every((term) => fullString.includes(term));
      });
    }

    return filtered;
  });

  async function handleAction(registration_id: number, action: string) {
    let reason = "";
    if (action === "reject" || action === "revoke") {
      reason = prompt(`Please provide a reason to ${action}:`);
      if (reason === null) return; // cancelled
    }

    try {
      const res = await fetch("/api/dean/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id, action, reason }),
      });

      if (res.ok) {
        await invalidateAll();
      } else {
        const err = await res.json();
        alert(err.error || "Action failed");
      }
    } catch (e) {
      alert("Network error");
    }
  }
</script>

<svelte:head>
  <title>Dean Review — GateQR</title>
  <meta
    name="description"
    content="Review and approve vehicle sticker applications for your college department."
  />
</svelte:head>

<AppShell>
  <div class="page-header">
    <div class="page-badge">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        ><path
          d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 13.5 19.79 19.79 0 0 1 1.08 4.9 2 2 0 0 1 3.06 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 10.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 18a2 2 0 0 1 2 2z"
        /></svg
      >
      College Head Portal
    </div>
  </div>

  <TabBar {tabs} active={tab} onchange={(t) => (tab = t)} />

  <div class="controls-row">
    <div class="search-wrap">
      <svg
        class="search-icon"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        placeholder="Search name, plate, vehicle…"
        bind:value={searchQuery}
        class="search-input"
      />
      {#if searchQuery}
        <button
          class="search-clear"
          onclick={() => {
            searchQuery = "";
          }}>×</button
        >
      {/if}
    </div>

    <div class="filters">
      <div
        class="dropdown-wrap"
        use:clickOutside={() => (roleDropdownOpen = false)}
      >
        <button
          class="filter-select dropdown-btn"
          onclick={() => (roleDropdownOpen = !roleDropdownOpen)}
        >
          {getRoleDropdownLabel()}
        </button>
        {#if roleDropdownOpen}
          <div class="dropdown-menu">
            {#each allRoles as role}
              <label class="dropdown-item">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role)}
                  onchange={() => toggleRole(role)}
                />
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
      <ApplicationCard
        data={{
          id: app.id || "-",
          name: `${app.first_name} ${app.last_name}`,
          role: app.role,
          email: app.user_email,
          department: app.department_name || "-",
          dean: app.department_email || "-",
          vehicle: app.vehicle_make,
          plate: app.vehicle_plate,
          owner: app.is_owner ? "Yes" : "No",
          status: app.status,
          rejection_reason: app.invalid_reason || null,
          documents: {
            id: app.doc_id,
            enrollment: app.doc_load,
            or: app.doc_or,
            cr: app.doc_cr,
            license: app.doc_license,
            letter: app.doc_letter,
          },
        }}
      >
        {#snippet children()}
          <ActionBar
            {tab}
            status={app.status}
            onaction={(action) => handleAction(app.auto_id, action)}
          />
        {/snippet}
      </ApplicationCard>
    {:else}
      <p class="empty-state">No applications found.</p>
    {/each}
  </div>
</AppShell>

<style>
  .page-header {
    display: flex;
    align-items: center;
  }

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
  .search-icon {
    position: absolute;
    left: 0.625rem;
    color: var(--text-dim);
    pointer-events: none;
    flex-shrink: 0;
  }
  .search-input {
    width: 100%;
    height: 32px;
    padding: 0 2rem 0 2.1rem;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text);
    font-size: 0.8125rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .search-input:focus {
    border-color: var(--maroon);
  }
  .search-clear {
    position: absolute;
    right: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-dim);
    font-size: 1rem;
    line-height: 1;
    padding: 0;
  }
  .search-clear:hover {
    color: var(--text);
  }

  .filters {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
  }

  .filter-select {
    height: 32px;
    padding: 0 0.625rem;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text);
    font-size: 0.8125rem;
    font-family: inherit;
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .filter-select:focus {
    border-color: var(--maroon);
  }

  .dropdown-wrap {
    position: relative;
  }
  .dropdown-btn {
    min-width: 130px;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
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
  .dropdown-item:hover {
    background: var(--surface-hover);
  }

  .page-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--maroon);
    background: var(--maroon-muted);
    border: 1.5px solid var(--border);
    border-radius: 20px;
    padding: 0.3rem 0.75rem;
  }

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
</style>
