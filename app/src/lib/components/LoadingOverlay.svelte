<script lang="ts">
  let { message = 'Processing…' }: { message?: string } = $props();
</script>

<div class="overlay" role="status" aria-live="polite">
  <div class="overlay-card">
    <div class="spinner-ring">
      <svg class="spinner-svg" viewBox="0 0 50 50">
        <circle class="track" cx="25" cy="25" r="20" fill="none" stroke-width="4"/>
        <circle class="arc"   cx="25" cy="25" r="20" fill="none" stroke-width="4"
          stroke-dasharray="80 200" stroke-dashoffset="-30" stroke-linecap="round"/>
      </svg>
    </div>
    <p class="overlay-msg">{message}</p>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(3px);
    animation: fadeIn 0.18s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .overlay-card {
    background: var(--surface, #fff);
    border: 1.5px solid var(--border, #e5e7eb);
    border-radius: 16px;
    padding: 2rem 2.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.22);
    animation: slideUp 0.22s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(12px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .spinner-ring {
    width: 56px;
    height: 56px;
  }

  .spinner-svg {
    width: 100%;
    height: 100%;
    animation: rotate 1.2s linear infinite;
  }

  @keyframes rotate {
    100% { transform: rotate(360deg); }
  }

  .track {
    stroke: var(--border, #e5e7eb);
  }

  .arc {
    stroke: var(--maroon, #6b1a2a);
    animation: dash 1.5s ease-in-out infinite;
  }

  @keyframes dash {
    0%   { stroke-dasharray: 1 200;  stroke-dashoffset: 0; }
    50%  { stroke-dasharray: 100 200; stroke-dashoffset: -35; }
    100% { stroke-dasharray: 100 200; stroke-dashoffset: -124; }
  }

  .overlay-msg {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text, #1a1a1a);
    margin: 0;
    letter-spacing: 0.01em;
  }
</style>
