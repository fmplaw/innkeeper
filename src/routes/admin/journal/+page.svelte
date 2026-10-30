<script lang="ts">
	import { AUDIT_ACTIONS, type AuditAction } from '$lib/audit';

	let { data } = $props();

	const label = (action: string) => AUDIT_ACTIONS[action as AuditAction]?.label ?? action;

	// Détail affichable : « avant → après » pour une modification, valeur brute sinon.
	function show(value: unknown): string {
		if (value && typeof value === 'object' && 'avant' in value && 'apres' in value) {
			const v = value as { avant: unknown; apres: unknown };
			return `${show(v.avant)} → ${show(v.apres)}`;
		}
		if (Array.isArray(value)) return value.map(show).join(', ') || '—';
		if (value && typeof value === 'object') return JSON.stringify(value);
		return value === null || value === undefined || value === '' ? '—' : String(value);
	}

	function pageUrl(page: number) {
		const params = new URLSearchParams(Object.entries(data.filters).filter(([, v]) => v));
		if (page > 1) params.set('page', String(page));
		return `?${params}`;
	}

	function submit(e: Event) {
		(e.currentTarget as HTMLInputElement | HTMLSelectElement).form?.requestSubmit();
	}
</script>

<h1>Journal</h1>
<p class="muted intro">
	Actions des officiers et de l'admin sur le site : fiches des autres joueurs, rosters, rôles, configuration,
	connexions admin. Visible par l'admin de l'instance uniquement. Les entrées de plus de 12 mois sont effacées
	automatiquement.
</p>

<form method="GET" class="card row filters">
	<label>
		Qui
		<select name="qui" value={data.filters.qui} onchange={submit}>
			<option value="">Tout le monde</option>
			{#each data.actors as name (name)}<option value={name}>{name}</option>{/each}
		</select>
	</label>
	<label>
		Quoi
		<select name="quoi" value={data.filters.quoi} onchange={submit}>
			<option value="">Toutes les actions</option>
			{#each data.groups as group (group)}<option value={group}>{group}</option>{/each}
		</select>
	</label>
	<label>
		Du
		<input type="date" name="du" value={data.filters.du} onchange={submit} />
	</label>
	<label>
		Au
		<input type="date" name="au" value={data.filters.au} onchange={submit} />
	</label>
	<noscript><button>Filtrer</button></noscript>
	<a href="/admin/journal" class="muted">Réinitialiser</a>
</form>

{#if data.entries.length === 0}
	<p class="card muted">Aucune action enregistrée{data.filters.qui || data.filters.quoi || data.filters.du || data.filters.au ? ' pour ces filtres' : ''}.</p>
{:else}
	<ol class="entries">
		{#each data.entries as e (e.id)}
			<li class="card entry" class:failed={e.action === 'admin.login-failed'}>
				<div class="line">
					<time class="muted">{e.when}</time>
					<span>
						{#if e.action !== 'admin.login-failed'}<strong>{e.actorName}</strong>{/if}
						{e.action === 'admin.login-failed' ? `${label(e.action)} (identifiant « ${e.actorName} »)` : label(e.action)}
						{#if e.targetLabel}
							:
							{#if e.targetUrl}<a href={e.targetUrl}>{e.targetLabel}</a>{:else}<em>{e.targetLabel}</em>{/if}
						{/if}
					</span>
					<span class="who">{e.actorType === 'local-admin' ? 'admin local' : e.actorType === 'discord' ? 'Discord' : ''}</span>
				</div>
				{#if e.details || e.ip}
					<dl class="details">
						{#each Object.entries(e.details ?? {}) as [key, value] (key)}
							<div><dt>{key}</dt><dd>{show(value)}</dd></div>
						{/each}
						{#if e.ip}<div><dt>adresse</dt><dd>{e.ip}</dd></div>{/if}
					</dl>
				{/if}
			</li>
		{/each}
	</ol>
	<nav class="row pager">
		{#if data.page > 1}<a class="button secondary" href={pageUrl(data.page - 1)}>Plus récentes</a>{/if}
		{#if data.hasMore}<a class="button secondary" href={pageUrl(data.page + 1)}>Plus anciennes</a>{/if}
	</nav>
{/if}

<style>
	.intro {
		max-width: 65ch;
	}
	.filters {
		align-items: end;
		margin-bottom: 1rem;
	}
	.filters label {
		min-width: 9rem;
	}
	.entries {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	.entry {
		padding: 0.7rem 1rem;
		display: grid;
		gap: 0.4rem;
	}
	.entry.failed {
		border-color: color-mix(in srgb, var(--danger) 50%, var(--border));
	}
	.line {
		display: grid;
		grid-template-columns: 10.5rem 1fr auto;
		gap: 0.75rem;
		align-items: baseline;
	}
	@media (max-width: 40rem) {
		.line {
			grid-template-columns: 1fr;
			gap: 0.15rem;
		}
	}
	time {
		font-variant-numeric: tabular-nums;
		font-size: 0.88rem;
	}
	.who {
		font-size: 0.78rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.details {
		margin: 0;
		display: grid;
		gap: 0.15rem;
		font-size: 0.88rem;
		padding-left: 11.25rem;
	}
	@media (max-width: 40rem) {
		.details {
			padding-left: 0;
		}
	}
	.details div {
		display: flex;
		gap: 0.5rem;
	}
	.details dt {
		color: var(--muted);
		min-width: 6rem;
	}
	.details dd {
		margin: 0;
		word-break: break-word;
	}
	.pager {
		margin-top: 1rem;
	}
</style>
