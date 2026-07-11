<script lang="ts">
    import AppShell from '$lib/components/AppShell.svelte';
    import { goto } from '$app/navigation';

    let { data } = $props();

    let role = $state('');
    let section = $state(1);
    let owner = $state('no');
    let dept = $state('');
    
    let fname = $state('');
    let lname = $state('');
    let vehicle = $state('');
    let plate = $state('');
    let idno = $state('');
    let loading = $state(false);

    let agreedToPark = $state(false);
    let agreedToRegulations = $state(false);
    let hasOpenedLink = $state(false);

    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear();
    const daySuffix = (d: number) => {
        if (d > 3 && d < 21) return 'TH';
        switch (d % 10) {
            case 1:  return "ST";
            case 2:  return "ND";
            case 3:  return "RD";
            default: return "TH";
        }
    };
    const dayStr = `${day}${daySuffix(day)}`;

    let canProceed = $derived((() => {
        if (section === 1) {
            if (!fname || !lname || !vehicle || !plate || !role) return false;
            if (['student', 'employee'].includes(role) && (!dept || !idno)) return false;
            return true;
        }
        if (section === 2) {
            if (!files.or.file || !files.cr.file) return false;
            if (role !== 'visitor' || owner === 'no') {
                if (!files.license.file) return false;
            }
            if (role !== 'visitor') {
                if (['student', 'employee'].includes(role) && !files.id.file) return false;
                if (!files.enrollment.file) return false;
                if (owner === 'yes' && !files.letter.file) return false;
            }
            if (role === 'visitor' && owner === 'yes') {
                if (!files.license.file || !files.letter.file) return false;
            }
            return true;
        }
        if (section === 3) {
            return agreedToPark;
        }
        if (section === 4) {
            return agreedToRegulations && hasOpenedLink;
        }
        return false;
    })());

    type FileState = { file: File | null; url: string | null }

    let files = $state({
        id:         { file: null, url: null } as FileState,
        enrollment: { file: null, url: null } as FileState,
        letter:     { file: null, url: null } as FileState,
        or:         { file: null, url: null } as FileState,
        cr:         { file: null, url: null } as FileState,
        license:    { file: null, url: null } as FileState,
    })

    function setFile(key: keyof typeof files, file: File | null) {
        if (files[key].url) URL.revokeObjectURL(files[key].url!)
        files[key] = file
            ? { file, url: URL.createObjectURL(file) }
            : { file: null, url: null }
    }

    const totalSections = 4;
    const sectionTitles = [
        'Personal Information',
        'Document Evaluation',
        'Agreement to Park',
        'Parking Regulations',
    ];

    async function handleSubmit() {
        if (!fname || !lname || !vehicle || !plate || !role) {
            alert('Please fill out all required fields.');
            return;
        }

        loading = true;
        try {
            const formData = new FormData();
            formData.append('role', role);
            formData.append('department_name', dept);
            formData.append('id_no', idno);
            formData.append('first_name', fname);
            formData.append('last_name', lname);
            formData.append('vehicle_make', vehicle);
            formData.append('vehicle_plate', plate);
            formData.append('is_owner', owner);
            
            if (files.or.file) formData.append('doc_or', files.or.file);
            if (files.cr.file) formData.append('doc_cr', files.cr.file);
            if (files.license.file) formData.append('doc_license', files.license.file);
            if (files.id.file) formData.append('doc_id', files.id.file);
            if (files.enrollment.file) formData.append('doc_load', files.enrollment.file);
            if (files.letter.file) formData.append('doc_letter', files.letter.file);

            const res = await fetch('/api/apply', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                goto('/status');
            } else {
                const data = await res.json();
                alert('Error submitting application: ' + data.error);
            }
        } catch(e) {
            alert('Network error');
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
  <title>Vehicle Sticker Application — GateQR</title>
  <meta name="description" content="Apply for a Liceo de Cagayan University vehicle parking sticker." />
</svelte:head>

<AppShell>
  <!-- User greeting -->
  <div class="welcome-bar">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    <span>{data.userEmail}</span>
  </div>

  <!-- Step progress -->
  <div class="step-progress">
    {#each Array(totalSections) as _, i}
      <div class="step-item" class:step-done={section > i + 1} class:step-active={section === i + 1} class:step-pending={section < i + 1}>
        <div class="step-circle">
          {#if section > i + 1}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          {:else}
            {i + 1}
          {/if}
        </div>
        {#if i < totalSections - 1}
          <div class="step-connector"></div>
        {/if}
      </div>
    {/each}
  </div>

  <p class="section-title">
    <span class="section-num">Step {section}</span>
    {sectionTitles[section - 1]}
  </p>

  <!-- Section card -->
  <div class="form-card">

    <!-- SECTION 1 -->
    {#if section === 1}
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="fname">First name</label>
          <input id="fname" type="text" placeholder="Juan" bind:value={fname} />
        </div>
        <div class="field-group">
          <label class="field-label" for="lname">Last name</label>
          <input id="lname" type="text" placeholder="Dela Cruz" bind:value={lname} />
        </div>
      </div>

      <div class="field-group">
        <label class="field-label" for="vehicle">Vehicle make & model</label>
        <input id="vehicle" type="text" placeholder="e.g. Honda Civic 2022" bind:value={vehicle} />
      </div>

      <div class="field-group">
        <label class="field-label" for="plate">Plate number</label>
        <input id="plate" type="text" placeholder="ABC-1234" bind:value={plate} />
      </div>

      <div class="field-group">
        <label class="field-label" for="role">Role</label>
        <select id="role" bind:value={role} class:placeholder-sel={!role}>
          <option value="" disabled hidden selected>Select role</option>
          <option value="student">Student</option>
          <option value="employee">Employee</option>
          <option value="visitor">Visitor</option>
        </select>
      </div>

      {#if ['student', 'employee'].includes(role)}
        <div class="field-group">
          <label class="field-label" for="dept">Department</label>
          <select id="dept" bind:value={dept} class:placeholder-sel={!dept}>
            <option value="" disabled hidden selected>Select department</option>
            {#each data.departments as d}
              <option value={d}>{d}</option>
            {/each}
          </select>
        </div>
        <div class="field-group">
          <label class="field-label" for="idno">ID number</label>
          <input id="idno" type="text" placeholder="2022-XXXXXXX" bind:value={idno} />
        </div>
      {/if}

    <!-- SECTION 2 -->
    {:else if section === 2}
      <div class="owner-question">
        <p class="owner-q-text">Is the vehicle registered under someone else's name?</p>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" bind:group={owner} name="registered" value="yes" />
            <span>Yes</span>
          </label>
          <label class="radio-label">
            <input type="radio" bind:group={owner} name="registered" value="no" />
            <span>No</span>
          </label>
        </div>
      </div>

      <!-- Liceo documents -->
      {#if role !== 'visitor'}
        <div class="upload-section">
          <p class="upload-section-title">Liceo Documents</p>
          <div class="upload-grid" style="--cols: {owner === 'no' ? 3 : 2}">
            {#if ['student', 'employee'].includes(role)}
              {@render uploadLabel(`${role === 'student' ? 'Student' : 'Employee'} ID`, 'id')}
            {/if}
            {@render uploadLabel(role === 'student' ? 'Enrollment Form' : 'Load Sheet / DTR', 'enrollment')}
            {#if owner === 'yes'}
              {@render uploadLabel('Signed Letter / DOAS', 'letter')}
            {/if}
          </div>
        </div>
      {/if}

      {#if role === 'visitor' && owner === 'yes'}
        <div class="upload-section">
          <p class="upload-section-title">Visitor Documents</p>
          <div class="upload-grid" style="--cols: 2">
            {@render uploadLabel("Driver's License (LTO)", 'license')}
            {@render uploadLabel('Signed Letter / DOAS', 'letter')}
          </div>
        </div>
      {/if}

      <div class="upload-section">
        <p class="upload-section-title">LTO Vehicle Documents</p>
        <div class="upload-grid" style="--cols: {role === 'visitor' && owner === 'yes' ? 2 : 3}">
          {@render uploadLabel('Vehicle OR', 'or')}
          {@render uploadLabel('Vehicle CR', 'cr')}
          {#if role !== 'visitor' || owner === 'no'}
            {@render uploadLabel("Driver's License", 'license')}
          {/if}
        </div>
      </div>

    <!-- SECTION 3 -->
    {:else if section === 3}
      <div class="agreement-body">
        <p><strong>KNOWN ALL MEN BY THESE PRESENTS:</strong></p>
        <p>That this agreement is signed by <u>{fname} {lname}</u>, in favor of Liceo de Cagayan University.</p>
        <p>WHEREAS, the President of Liceo de Cagayan has granted permission to allow the owner of the vehicle to park on the school premises.</p>
        <p>WHEREAS, the undersigned has agreed to the parking rules and regulations of Liceo de Cagayan University.</p>
        <p>Now, therefore, in view of the foregoing, the undersigned have agreed to the following rules and regulations.</p>
        <ol>
          <li>That the vehicle owner obligates himself to follow all the University parking regulations as may be implemented from the time by Liceo de Cagayan University in connection with this agreement to park;</li>
          <li>That the vehicle owner shall place an authorized School Sticker on his/her vehicle upon entering the University premises;</li>
          <li>That the vehicle must be driven personally by the owner and authorized driver,</li>
          <li>The official parking sticker be placed at the most prominent portion of the vehicle;</li>
          <li>That the owner of the vehicles shall park only at designed bays;</li>
          <li>That the school is not liable for whatever damage may happen to the vehicle while inside the University premises;</li>
          <li>That the undersigned is obligated to renew this agreement every semester;</li>
        </ol>
        <p>IN WITNESS HEREOF THE UNDERSIGNED HAS AFFIXED HIS/HER SIGNATURE THIS <u>{dayStr}</u> DAY OF <u>{month.toUpperCase()}</u> <u>{year}</u>.</p>
      </div>
      <label class="agree-checkbox">
        <input type="checkbox" bind:checked={agreedToPark} />
        <span>I agree to the terms and conditions of this agreement.</span>
      </label>

    <!-- SECTION 4 -->
    {:else if section === 4}
      <div class="agreement-body">
        <p>Liceo de Cagayan University provides vehicle parking privileges as part of the services offered to employees, students, and concessionaires. To ensure safety, these regulations have been produced and must be followed.</p>
        <ol>
          <li>Application for parking shall be transacted through the Office of Student Affairs. Stickers may be availed only by the Employees, Students, and Concessionaires of the University.</li>
          <li>Requirements:
            <ol type="a">
              <li>Agreement to Park form (original and photocopy)</li>
              <li>School ID (photocopy)</li>
              <li>Enrollment Form (students) or Load Sheet (Non-Regular Faculty) (photocopy)</li>
              <li>Vehicle official receipt (OR) and certificate of registration (photocopy)</li>
              <li>Driver's License (photocopy)</li>
              <li>Authorization letter (If the vehicle is registered under a different name).</li>
            </ol>
          </li>
          <li>The Liceo U Official Parking Sticker fee shall be paid at the cashiers office only. Only one (1) sticker is provided for every employee, student, and concessionaire.</li>
          <li>Stickers are color coded for security and monitoring purposes. Vehicles must park only in designated areas to park.</li>
          <li>Parking inside the University premises shall be on a first-come, first-served basis. Members of the administration are given priority to use the parking space adjacent to the Rodelsa Hall.</li>
          <li>Parking permits may be revoked temporarily or permanently for the following:
            <ol type="a">
              <li>parking in unauthorized areas;</li>
              <li>using another person's sticker;</li>
              <li>duplication or using fake stickers;</li>
              <li>repeated failure to display permit;</li>
              <li>violating traffic rules while inside the campus, and</li>
              <li>having items in the vehicle that violate Liceo U policies on alcohol, prohibited drugs, and deadly weapons.</li>
            </ol>
          </li>
          <li>The Director of the Office of Student Affairs, the Security and Safety Chief Officer, and the guard on duty reserve the right to inspect all vehicles going in and out of the university to ensure the safety and security of the Liceo de Cagayan University community.</li>
          <li>For concessionaires, delivery time is between 6:00 am to 12:00nn only.</li>
          <li>For concerns, the Office of Student Affairs and the LICEO U Administration shall be the venue to resolve the issue.</li>
        </ol>
      </div>

      <div class="link-section">
        <p>Please download, print, and fill up the physical copy of the Agreement to Park and Parking Regulations:</p>
        <a 
          href="https://docs.google.com/document/d/1y8OGxeORcqTE9JZ8m-82jM_6oQSrdtSyqrAEf2kaLAM/edit?tab=t.0" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="doc-link-btn"
          onclick={() => hasOpenedLink = true}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open Agreement Document
        </a>
      </div>

      <label class="agree-checkbox">
        <input type="checkbox" bind:checked={agreedToRegulations} />
        <span>I have read and fully understood the policies and regulations.</span>
      </label>
    {/if}
  </div>

  <!-- Navigation -->
  <div class="nav-btns" class:split={section > 1}>
    {#if section > 1}
      <button class="nav-btn btn-back" onclick={() => section--}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back
      </button>
    {/if}
    {#if section < totalSections}
      <button class="nav-btn btn-next" onclick={() => section++} disabled={!canProceed}>
        Next
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    {:else}
      <button class="nav-btn btn-submit" onclick={handleSubmit} disabled={loading || !canProceed}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        {loading ? 'Submitting...' : 'Submit Application'}
      </button>
    {/if}
  </div>

  <p class="form-footer">
    Issues? Contact <a href="mailto:osa@liceo.edu.ph" class="footer-link">osa@liceo.edu.ph</a>
  </p>
</AppShell>

{#snippet uploadLabel(label: string, key: keyof typeof files)}
  <label class="upload-tile">
    <span class="upload-label-text">{label}</span>
    {#if files[key].url}
      <img src={files[key].url} class="upload-preview" alt={label} />
      <span class="upload-filename">{files[key].file?.name}</span>
    {:else}
      <div class="upload-placeholder">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span>Upload</span>
      </div>
    {/if}
    <input hidden type="file" accept="image/*"
      onchange={(e) => setFile(key, e.currentTarget.files?.[0] ?? null)} />
  </label>
{/snippet}

<style>
  .welcome-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.875rem;
  }

  .welcome-bar svg { color: var(--maroon); flex-shrink: 0; }

  /* ─── Step Progress ─── */
  .step-progress {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    padding: 0.25rem;
  }

  .step-item {
    display: flex;
    align-items: center;
    flex: 1;
  }

  .step-item:last-child { flex: 0; }

  .step-circle {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 700;
    flex-shrink: 0;
    border: 2px solid var(--border);
    background: var(--surface);
    color: var(--text-muted);
    transition: all 0.25s;
  }

  .step-active .step-circle {
    background: var(--maroon);
    border-color: var(--maroon);
    color: #fff;
    box-shadow: 0 0 0 4px rgba(107,26,42,0.15);
  }

  .step-done .step-circle {
    background: var(--maroon-light);
    border-color: var(--maroon-light);
    color: #fff;
  }

  .step-connector {
    flex: 1;
    height: 2px;
    background: var(--border-light);
    transition: background 0.25s;
  }

  .step-done .step-connector,
  .step-active .step-connector {
    background: var(--maroon-light);
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-num {
    background: var(--maroon);
    color: #fff;
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    letter-spacing: 0.03em;
  }

  /* ─── Form Card ─── */
  .form-card {
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: var(--shadow-sm);
  }

  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .field-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.02em;
  }

  .placeholder-sel { color: var(--text-muted); }

  /* ─── Owner question ─── */
  .owner-question {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.875rem 1rem;
    background: var(--maroon-muted);
    border: 1.5px solid var(--border-light);
    border-radius: var(--radius-sm);
    flex-wrap: wrap;
  }

  .owner-q-text {
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0;
    flex: 1;
  }

  .radio-group {
    display: flex;
    gap: 1.25rem;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .radio-label input[type="radio"] {
    accent-color: var(--maroon);
  }

  /* ─── Upload ─── */
  .upload-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .upload-section-title {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--maroon);
    margin: 0;
  }

  .upload-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 3), 1fr);
    gap: 0.5rem;
  }

  .upload-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 0.375rem;
    padding: 0.75rem 0.5rem;
    background: var(--maroon-muted);
    border: 1.5px dashed var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
    text-align: center;
    min-height: 88px;
  }

  .upload-tile:hover {
    background: var(--maroon-tint);
    border-color: var(--maroon-light);
    transform: translateY(-1px);
  }

  .upload-label-text {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--maroon);
    line-height: 1.3;
  }

  .upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    color: var(--text-muted);
    font-size: 0.65rem;
    font-weight: 500;
  }

  .upload-preview {
    width: 100%;
    height: 48px;
    object-fit: cover;
    border-radius: 4px;
  }

  .upload-filename {
    font-size: 0.6rem;
    color: var(--text-muted);
    word-break: break-all;
    text-align: center;
  }

  /* ─── Agreement ─── */
  .agreement-body {
    font-size: 0.82rem;
    color: var(--text-secondary);
    line-height: 1.7;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 340px;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .agreement-body p { margin: 0; }
  .agreement-body ol { margin: 0; padding-left: 1.5rem; }
  .agreement-body li { margin-top: 0.375rem; }

  .agree-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.875rem 1rem;
    background: var(--maroon-muted);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.5;
  }

  .agree-checkbox input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border: 2px solid var(--text-muted);
    border-radius: 4px;
    background: var(--surface);
    margin-top: 1px;
    flex-shrink: 0;
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
  }

  .agree-checkbox input[type="checkbox"]:checked {
    background: var(--maroon);
    border-color: var(--maroon);
  }

  .agree-checkbox input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 5.5px;
    top: 1.5px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2.5px 2.5px 0;
    transform: rotate(45deg);
  }

  /* ─── Nav Buttons ─── */
  .nav-btns {
    display: flex;
    gap: 0.625rem;
  }

  .nav-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.875rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: inherit;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
  }

  .nav-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .btn-back {
    background: var(--surface);
    color: var(--text-secondary);
    border: 1.5px solid var(--border);
    flex: 0.5;
  }

  .btn-back:hover { background: var(--maroon-muted); color: var(--maroon); border-color: var(--maroon-light); }

  .btn-next {
    background: var(--maroon);
    color: #fff;
    box-shadow: 0 4px 12px rgba(107,26,42,0.3);
  }

  .btn-next:hover { background: var(--maroon-light); box-shadow: 0 6px 18px rgba(107,26,42,0.4); }

  .btn-submit {
    background: linear-gradient(135deg, var(--maroon-dark), var(--maroon));
    color: #fff;
    box-shadow: 0 4px 14px rgba(107,26,42,0.35);
  }

  .btn-submit:hover { box-shadow: 0 6px 20px rgba(107,26,42,0.4); }

  .btn-next:disabled,
  .btn-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .link-section {
    padding: 1rem;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .link-section p {
    margin: 0;
    font-size: 0.82rem;
    color: var(--text-primary);
    font-weight: 500;
  }

  .doc-link-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--maroon);
    color: #fff;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: var(--radius-sm);
    transition: opacity 0.15s, transform 0.15s;
    box-shadow: 0 2px 8px rgba(107,26,42,0.25);
  }

  .doc-link-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .form-footer {
    text-align: center;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .footer-link {
    color: var(--maroon);
    font-weight: 600;
    text-decoration: none;
  }

  .footer-link:hover { text-decoration: underline; }
</style>