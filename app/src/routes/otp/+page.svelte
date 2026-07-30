<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let email = $state('');
  let otp = $state('');
  let loading = $state(false);
  let error = $state('');

  onMount(() => {
    email = $page.url.searchParams.get('email') || '';
    if (!email) {
      goto('/login'); // Email is required
    }
  });

  async function handleVerify(e: Event) {
    e.preventDefault();
    if (!email || !otp) return;

    loading = true;
    error = '';

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      if (res.ok) {
        const data = await res.json();
        // Redirect based on role
        if (data.role === 'osa') {
          goto('/osa');
        } else if (data.role === 'dean') {
          goto('/dean');
        } else if (data.role === 'security') {
          goto('/osa/dashboard');
        } else {
          goto('/status'); // Or '/' if they need to apply
        }
      } else {
        const data = await res.json();
        error = data.error || 'Invalid code';
      }
    } catch (err) {
      error = 'A network error occurred. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Enter Code — GateQR</title>
  <meta name="description" content="Enter the login code sent to your email." />
</svelte:head>

<div class="otp-page">
  <div class="bg-glow"></div>

  <div class="otp-card">
    <div class="envelope-icon">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    </div>

    <h1 class="otp-title">Check your email</h1>
    <p class="otp-main">We sent a 6-digit login code to <strong>{email}</strong></p>
    
    <form class="otp-form" onsubmit={handleVerify}>
      {#if error}
        <div class="error-msg">{error}</div>
      {/if}

      <div class="field-group">
        <input 
          type="text" 
          bind:value={otp} 
          placeholder="000000" 
          maxlength="6"
          required
          class="otp-input"
          disabled={loading}
        />
      </div>

      <button type="submit" class="verify-btn" disabled={loading || otp.length < 6}>
        {loading ? 'Verifying...' : 'Verify Code'}
      </button>
    </form>

    <p class="otp-sub">
      Didn't receive it? Check your spam folder or
      <a href="/login" class="retry-link">try again</a>.
    </p>

    <a href="/login" class="back-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back to Sign In
    </a>
  </div>
</div>

<style>
  .otp-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.25rem;
    background: linear-gradient(135deg, var(--maroon-deep) 0%, var(--maroon-dark) 50%, var(--maroon) 100%);
    position: relative;
    overflow: hidden;
  }

  .bg-glow {
    position: absolute;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(201,162,39,0.12) 0%, transparent 70%);
    bottom: -100px;
    left: -100px;
    pointer-events: none;
  }

  .otp-card {
    background: var(--surface);
    border-radius: var(--radius-lg);
    padding: 2.5rem 2rem;
    width: 100%;
    max-width: 400px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    box-shadow: var(--shadow-lg);
    position: relative;
    z-index: 1;
  }

  .envelope-icon {
    width: 72px;
    height: 72px;
    background: linear-gradient(135deg, var(--maroon-tint), var(--maroon-muted));
    border: 2px solid var(--border);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--maroon);
    margin-bottom: 0.5rem;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }

  .otp-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--maroon);
    letter-spacing: -0.02em;
    margin: 0;
  }

  .otp-main {
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  .otp-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    margin-top: 0.5rem;
  }

  .error-msg {
    color: #b91c1c;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
  }

  .field-group {
    display: flex;
    flex-direction: column;
  }

  .otp-input {
    text-align: center;
    font-size: 1.5rem;
    letter-spacing: 0.5rem;
    padding: 0.75rem;
    border: 2px solid var(--border);
    border-radius: var(--radius-sm);
    outline: none;
    transition: border-color 0.2s;
  }

  .otp-input:focus {
    border-color: var(--maroon);
  }

  .verify-btn {
    padding: 0.875rem;
    background: var(--maroon);
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: var(--radius-sm);
    border: none;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .verify-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .verify-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .otp-sub {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 1rem 0 0;
  }

  .retry-link {
    color: var(--maroon);
    font-weight: 600;
    text-decoration: underline;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: var(--maroon-muted);
    color: var(--maroon);
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: var(--radius-sm);
    text-decoration: none;
    border: 1.5px solid var(--border);
    transition: background 0.15s, transform 0.15s;
  }

  .back-btn:hover {
    background: var(--maroon-tint);
    transform: translateY(-1px);
  }
</style>