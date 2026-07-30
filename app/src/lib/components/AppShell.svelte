<script lang="ts">
  let { title = 'GateQR', children } = $props();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }
</script>

<!-- Header bar -->
<header class="app-header">
  <div class="header-inner">
    <div class="header-brand">
      <div class="brand-mark">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <circle cx="17.5" cy="17.5" r="2.5"/>
        </svg>
      </div>
      <span class="brand-name">GateQR</span>
    </div>
    <div class="header-actions">
      <span class="brand-sub">Liceo de Cagayan University</span>
      <button class="logout-btn" onclick={handleLogout}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
        Logout
      </button>
    </div>
  </div>
</header>

<!-- Page shell -->
<main class="app-shell">
  <div class="shell-content">
    {@render children()}
  </div>
</main>

<style>
  .app-header {
    background: linear-gradient(135deg, var(--maroon-deep) 0%, var(--maroon-dark) 40%, var(--maroon) 100%);
    border-bottom: 2px solid var(--gold);
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .header-inner {
    max-width: 900px;
    margin: 0 auto;
    padding: 0.75rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-brand {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .brand-mark {
    width: 34px;
    height: 34px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  .brand-name {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.02em;
  }

  .brand-sub {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.55);
    font-weight: 400;
    letter-spacing: 0.01em;
    display: none;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .logout-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .logout-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  @media (min-width: 480px) {
    .brand-sub { display: block; }
  }

  .app-shell {
    min-height: calc(100vh - 58px);
    padding: 2rem 1.25rem 3rem;
  }

  .shell-content {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
