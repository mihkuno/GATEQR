<script lang="ts">
    import AppShell from '$lib/components/AppShell.svelte';
    import ApplicationCard from '$lib/components/ApplicationCard.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    
    // Convert to any[] to avoid TypeScript strict property checks on RowDataPacket
    let app = $derived((data.application as any) || null);
    let skipDean = $derived(app ? ['visitor', 'concessionaire'].includes(app.role) : false);

    // Helpers to determine step states
    function stepStatus(app: any, stepNum: number) {
        if (!app) return 'pending';
        const s = app.status;
        
        if (s === 'rejected' || s === 'revoked') return 'rejected';
        
        if (stepNum === 1) { // Dean Approval
            if (['visitor', 'concessionaire'].includes(app.role)) return 'done'; // Visitors & concessionaires skip dean
            if (['osa_val', 'osa_dist', 'expired'].includes(s)) return 'done';
            if (s === 'dept_val') return 'active';
            return 'pending';
        }
        
        if (stepNum === 2) { // OSA Validation
            if (['osa_dist', 'expired'].includes(s)) return 'done';
            if (s === 'osa_val') return 'active';
            return 'pending';
        }

        if (stepNum === 3) { // Status / Distribution
            if (s === 'osa_dist') return 'done'; // Available for pickup
            if (s === 'expired') return 'expired';
            return 'pending';
        }
        return 'pending';
    }
</script>

<svelte:head>
  <title>Application Status — GateQR</title>
  <meta name="description" content="Track the status of your vehicle sticker application at Liceo de Cagayan University." />
</svelte:head>

<AppShell>
  <!-- User greeting -->
  <div class="welcome-bar">
    <div class="wb-user">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span>{data.userEmail}</span>
    </div>
    <a href="/complaints" class="wb-action" class:wb-action-alert={data.scheduledCount > 0}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      My Complaints
      {#if data.scheduledCount > 0}
        <span class="wb-badge"></span>
      {/if}
    </a>
  </div>

  {#if app}
    {#if app.status === 'rejected' || app.status === 'revoked'}
      <div class="alert-box alert-error">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>
          <p class="alert-title">Application {app.status}</p>
          <p class="alert-desc">{app.invalid_reason || 'No reason provided.'}</p>
        </div>
      </div>
      <a href="/" class="btn-reapply">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Submit New Application
      </a>
    {:else if app.status === 'expired'}
      <div class="alert-box alert-warning">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div>
          <p class="alert-title">Sticker Expired</p>
          <p class="alert-desc">Your parking sticker has expired. Please submit a new application to renew.</p>
        </div>
      </div>
      <a href="/" class="btn-reapply">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Submit New Application
      </a>
    {:else}
      <!-- Progress Steps -->
      <div class="progress-steps">
        {#if !skipDean}
        <div class="progress-step" class:step-done={stepStatus(app, 1) === 'done'} class:step-active={stepStatus(app, 1) === 'active'} class:step-pending={stepStatus(app, 1) === 'pending'}>
          <div class="ps-icon">
            {#if stepStatus(app, 1) === 'done'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            {:else}
              1
            {/if}
          </div>
          <div class="ps-info">
            <span class="ps-label">Step 1</span>
            <span class="ps-desc">Approval from College Head</span>
          </div>
        </div>

        <div class="ps-connector"></div>
        {/if}

        <div class="progress-step" class:step-done={stepStatus(app, 2) === 'done'} class:step-active={stepStatus(app, 2) === 'active'} class:step-pending={stepStatus(app, 2) === 'pending'}>
          <div class="ps-icon">
            {#if stepStatus(app, 2) === 'done'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            {:else}
              {skipDean ? 1 : 2}
            {/if}
          </div>
          <div class="ps-info">
            <span class="ps-label">Step {skipDean ? 1 : 2}</span>
            <span class="ps-desc">Approval from Office of Student Affairs</span>
          </div>
        </div>

        <div class="ps-connector"></div>

        <div class="progress-step" class:step-done={stepStatus(app, 3) === 'done'} class:step-active={stepStatus(app, 3) === 'active'} class:step-pending={stepStatus(app, 3) === 'pending'}>
          <div class="ps-icon">
            {#if stepStatus(app, 3) === 'done'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            {:else}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
            {/if}
          </div>
          <div class="ps-info">
            <span class="ps-label">Step {skipDean ? 2 : 3}</span>
            <span class="ps-desc">Visit OSA to pass hardcopied agreements & receive QR</span>
            {#if app.dist_sched}
              <div class="sched-pill">Scheduled: {new Date(app.dist_sched).toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'})}</div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <ApplicationCard data={{
      id: app.id || '-',
      name: `${app.first_name} ${app.last_name}`,
      role: app.role,
      email: data.userEmail,
      department: app.department_name || '-',
      'dept. email': app.department_email || '-',
      campus: app.campus || '-',
      'year level': app.role === 'student' ? (app.year_level || '-') : undefined,
      vehicle: app.vehicle_make,
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
    }}>
    </ApplicationCard>
  {:else}
    <div class="no-app">
      <p>You have not submitted a vehicle application yet.</p>
      <a href="/" class="btn-apply">Submit Application</a>
    </div>
  {/if}

  <p class="form-footer">
    Issues? Contact <a href="mailto:osa@liceo.edu.ph" class="footer-link">osa@liceo.edu.ph</a>
  </p>
</AppShell>

<style>
  .welcome-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.875rem;
  }

  .wb-user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .wb-user svg { color: var(--maroon); flex-shrink: 0; }

  .wb-action {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.75rem;
    background: var(--maroon);
    color: white;
    border-radius: var(--radius-sm);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.75rem;
    transition: background 0.15s, color 0.15s, box-shadow 0.15s;
    box-shadow: 0 2px 8px rgba(107,26,42,0.25);
  }
  
  .wb-action:hover {
    background: #551320;
    box-shadow: 0 4px 12px rgba(107,26,42,0.35);
  }

  .wb-action-alert {
    animation: pulse-alert 2s ease-in-out infinite;
  }

  @keyframes pulse-alert {
    0%, 100% { box-shadow: 0 2px 8px rgba(220,38,38,0.3); }
    50% { box-shadow: 0 2px 16px rgba(220,38,38,0.6); }
  }

  .wb-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 9px;
    height: 9px;
    background: #ef4444;
    border-radius: 50%;
    border: 1.5px solid var(--surface);
    animation: badge-pulse 1.5s ease-in-out infinite;
  }

  @keyframes badge-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.8; }
  }

  .progress-steps {
    display: flex;
    flex-direction: column;
    gap: 0;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1rem 1.25rem;
    box-shadow: var(--shadow-sm);
  }

  .progress-step {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
  }

  .ps-connector {
    width: 2px;
    height: 24px;
    background: var(--border-light);
    margin-left: 17px;
    margin: 4px 0 4px 17px;
  }

  .ps-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 2px solid var(--border);
    background: var(--surface);
    color: var(--text-muted);
    transition: all 0.2s;
  }

  .step-done .ps-icon {
    background: var(--maroon);
    border-color: var(--maroon);
    color: #fff;
    box-shadow: 0 2px 8px rgba(107,26,42,0.25);
  }

  .ps-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding-top: 0.5rem;
  }

  .ps-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--maroon);
  }

  .step-pending .ps-label { color: var(--text-muted); }

  .ps-desc {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .step-pending .ps-desc { color: var(--text-muted); }

  .sched-pill {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--maroon);
    background: var(--maroon-muted);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    display: inline-block;
  }

  .form-footer {
    text-align: center;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .footer-link:hover { text-decoration: underline; }

  .no-app {
    text-align: center;
    padding: 3rem 1rem;
    background: var(--surface);
    border: 1.5px dashed var(--border);
    border-radius: var(--radius-md);
  }

  .btn-apply {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: var(--maroon);
    color: white;
    border-radius: var(--radius-sm);
    text-decoration: none;
    font-weight: 600;
  }

  .alert-box {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: var(--radius-md);
    margin-bottom: 1rem;
  }

  .alert-error {
    background: #fef2f2;
    border: 1.5px solid #fca5a5;
    color: #b91c1c;
    margin-bottom: 0.75rem;
  }

  .alert-warning {
    background: #fffbeb;
    border: 1.5px solid #fde68a;
    color: #b45309;
    margin-bottom: 0.75rem;
  }

  .btn-reapply {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem 1.25rem;
    background: var(--maroon);
    color: white;
    border-radius: var(--radius-sm);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.85rem;
    box-shadow: 0 4px 12px rgba(107,26,42,0.3);
    transition: background 0.15s, transform 0.15s;
  }

  .btn-reapply:hover {
    background: var(--maroon-light);
    transform: translateY(-1px);
  }

  .alert-title {
    font-weight: 700;
    margin: 0 0 0.2rem;
    text-transform: capitalize;
  }
  
  .alert-desc {
    font-size: 0.85rem;
    margin: 0;
  }

  .user-qr-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px dashed var(--border-light);
  }

  .user-qr-display p {
    font-weight: 700;
    color: var(--maroon);
    margin: 0;
  }

  .user-qr-display img {
    width: 150px;
    height: 150px;
    border: 2px solid var(--border);
    border-radius: 8px;
    padding: 0.5rem;
    background: white;
  }

  .dl-btn {
    padding: 0.5rem 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.8rem;
    transition: background 0.2s;
  }

  .dl-btn:hover {
    background: var(--maroon-muted);
    color: var(--maroon);
  }
</style>