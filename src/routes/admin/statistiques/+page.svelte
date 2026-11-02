<script lang="ts">
	import Donut from '$lib/components/Donut.svelte';
	import { className, classColor } from '$lib/labels';
	import { AXIS_LABELS } from '$lib/interests';
	import { ROLES, ROLE_LABELS } from '$lib/roles';

	let { data } = $props();
	const cfg = $derived(data.config);
	const s = $derived(data.stats);

	const ROLE_COLORS = { tank: '#5b8def', healer: '#4caf7d', melee: '#d9534f', ranged: '#e8c26a' } as const;
	const dayFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
	const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

	// Classes triées de la plus jouée à la moins jouée : les manques finissent en bas.
	const classes = $derived([...s.classes].sort((a, b) => b.mains - a.mains || b.rerolls - a.rerolls));
	const maxClass = $derived(Math.max(1, ...s.classes.map((c) => c.mains + c.rerolls)));
	const canPlay = (classId: string, role: string) =>
		cfg.classes.find((c) => c.id === classId)?.specs.some((sp) => (sp.roles as readonly string[]).includes(role)) ?? false;
	const professionName = (id: string) => cfg.professions.find((p) => p.id === id)?.name ?? id;
	const maxLevelBand = $derived(Math.max(1, ...s.levels.map((l) => l.mains)));

	let copied = $state(false);
	async function copyMentions() {
		await navigator.clipboard.writeText(s.incomplete.map((p) => `<@${p.id}>`).join(' '));
		copied = true;
		setTimeout(() => (copied = false), 2500);
	}
</script>

<h1>Statistiques</h1>
<p class="muted intro">
	Les mains comptent pour la composition, tous les persos pour les métiers. Seuls les joueurs qui ont encore accès au
	site sont comptés.
</p>

<section class="figures card">
	<div><strong>{s.totals.members}</strong><span>membres</span></div>
	<div><strong>{s.totals.withCharacters}</strong><span>avec au moins un perso</span></div>
	<div><strong>{s.totals.characters}</strong><span>persos, dont {s.totals.mains} mains</span></div>
	<div><strong>{s.totals.maxLevel}</strong><span>mains au niveau {cfg.maxLevel}</span></div>
</section>

<div class="grid">
	<section class="card">
		<h2>Rôles des mains</h2>
		<Donut label="Rôles des mains" parts={ROLES.map((r) => ({ label: ROLE_LABELS[r], value: s.roles.find((x) => x.role === r)?.mains ?? 0, color: ROLE_COLORS[r] }))} />
		<div class="table-wrap">
			<table class="compact">
				<thead>
					<tr><th>Rôle</th><th class="num">Mains</th><th class="num" title="Mains qui peuvent passer à ce rôle avec leur spé secondaire">+ spé secondaire</th><th class="num">Rerolls</th></tr>
				</thead>
				<tbody>
					{#each s.roles as r (r.role)}
						<tr>
							<td>{ROLE_LABELS[r.role]}{#if r.wanted}{' '}<span class="badge wanted">recherché</span>{/if}</td>
							<td class="num">{r.mains}</td>
							<td class="num">{r.offspec || '·'}</td>
							<td class="num">{r.rerolls || '·'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="card">
		<h2>Niveaux des mains</h2>
		{#each s.levels as l (l.label)}
			<div class="bar">
				<span>{l.label}</span>
				<span class="track"><span class="fill" style:width="{(l.mains / maxLevelBand) * 100}%"></span></span>
				<span class="count">{l.mains}</span>
			</div>
		{/each}
		<h2 class="spaced">Intérêts des mains</h2>
		{#each s.interests as i (i.axis)}
			{@const total = i.competitive + i.casual + i.none}
			<div class="interest">
				<span>{AXIS_LABELS[i.axis]}</span>
				<span class="stack" title="Compétitif {i.competitive}, détente {i.casual}, non renseigné {i.none}">
					<span class="seg competitive" style:width="{pct(i.competitive, total)}%"></span>
					<span class="seg casual" style:width="{pct(i.casual, total)}%"></span>
				</span>
				<span class="muted small">{i.competitive} compétitif · {i.casual} détente</span>
			</div>
		{/each}
	</section>
</div>

<section class="card">
	<h2>Classes</h2>
	<p class="muted small">
		Mains par rôle ; un tiret signale un rôle que la classe ne peut pas tenir. Barre pleine : mains, barre claire :
		rerolls.
	</p>
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Classe</th>
					{#each ROLES as r (r)}<th class="num">{ROLE_LABELS[r]}</th>{/each}
					<th class="wide">Mains et rerolls</th>
				</tr>
			</thead>
			<tbody>
				{#each classes as c (c.id)}
					<tr class:empty={!c.mains}>
						<td>
							<span class="cls"><span class="dot" style:--c={classColor(cfg, c.id)}></span>{className(cfg, c.id)}</span>
							{#if c.wanted}{' '}<span class="badge wanted">recherché</span>{/if}
						</td>
						{#each ROLES as r (r)}
							<td class="num">{canPlay(c.id, r) ? c.byRole[r] || '·' : '–'}</td>
						{/each}
						<td class="wide">
							<div class="class-bar">
								<span class="track">
									<span class="fill" style:width="{(c.mains / maxClass) * 100}%" style:background={classColor(cfg, c.id)}></span>
									<span class="fill alt" style:width="{(c.rerolls / maxClass) * 100}%" style:background={classColor(cfg, c.id)}></span>
								</span>
								<span class="count">{c.mains}{#if c.rerolls}{' '}<span class="muted">+{c.rerolls}</span>{/if}</span>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if classes.some((c) => !c.mains)}
		<p class="warn small">
			Aucun main :
			{classes
				.filter((c) => !c.mains)
				.map((c) => className(cfg, c.id))
				.join(', ')}.
		</p>
	{/if}
</section>

<section class="card">
	<h2>Métiers</h2>
	<p class="muted small">Tous les persos, rerolls compris. Le niveau n'est connu que s'il est renseigné sur la fiche ou importé du jeu.</p>
	<div class="table-wrap">
		<table>
			<thead>
				<tr><th>Métier</th><th class="num">Persos</th><th class="num">Meilleur niveau</th><th>Les plus avancés</th></tr>
			</thead>
			<tbody>
				{#each s.professions as p (p.id)}
					<tr class:secondary-start={p.secondary && !s.professions[s.professions.indexOf(p) - 1]?.secondary}>
						<td>{professionName(p.id)}{#if p.secondary}{' '}<span class="muted small">secondaire</span>{/if}</td>
						<td class="num">{#if p.count}{p.count}{:else}<span class="warn">personne</span>{/if}</td>
						<td class="num">{p.best ?? '·'}</td>
						<td class="holders">
							{#each p.top as h, i (h.id)}{#if i}{', '}{/if}<a href="/joueurs/{h.userId}">{h.name}</a>{#if h.level}{' '}<span class="muted">{h.level}</span>{/if}{/each}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<div class="grid">
	<section class="card">
		<h2>Activité sur le site</h2>
		<Donut
			label="Dernière connexion"
			parts={[
				{ label: 'Cette semaine', value: s.activity.week, color: '#4caf7d' },
				{ label: 'Ce mois-ci', value: s.activity.month, color: '#e8c26a' },
				{ label: 'Plus de 30 jours ou jamais', value: s.activity.older, color: '#8a817b' }
			]}
		/>
		{#if s.activity.seenInGame !== null}
			<p class="muted small">{s.activity.seenInGame} mains sur {s.totals.mains} trouvés dans le registre de guilde au dernier import du jeu.</p>
		{/if}
		{#if s.activity.inactive.length}
			<details>
				<summary>Pas venus depuis plus de 30 jours ({s.activity.inactive.length})</summary>
				<ul class="people">
					{#each s.activity.inactive as u (u.id)}
						<li>
							<a href="/joueurs/{u.id}">{u.displayName}</a>
							<span class="muted small">{u.lastLogin ? dayFormat.format(u.lastLogin) : 'jamais connecté'}</span>
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</section>

	<section class="card">
		<h2>Fiches à compléter</h2>
		{#if s.incomplete.length}
			<div class="row">
				<button class="secondary" onclick={copyMentions}>{copied ? 'Mentions copiées ✔' : 'Copier les mentions'}</button>
				<span class="muted small">{s.incomplete.length} {s.incomplete.length > 1 ? 'joueurs' : 'joueur'}, à relancer d'un message sur Discord.</span>
			</div>
			<ul class="people">
				{#each s.incomplete as p (p.id)}
					<li>
						<a href="/joueurs/{p.id}">{p.displayName}</a>
						<span class="muted small">{p.missing.join(', ')}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="muted">Toutes les fiches sont complètes.</p>
		{/if}
	</section>
</div>

<style>
	h1 {
		margin: 0 0 0.25rem;
	}
	.intro {
		margin: 0 0 1.25rem;
	}
	h2 {
		margin: 0 0 0.75rem;
		font-size: 1.15rem;
		color: var(--gold);
	}
	.spaced {
		margin-top: 1.5rem;
	}
	section.card {
		margin-bottom: 1.5rem;
		display: grid;
		gap: 0.75rem;
		align-content: start;
	}
	section.card h2,
	section.card p {
		margin: 0;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
		gap: 0 1.5rem;
	}
	section.card.figures {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 2.5rem;
	}
	.figures div {
		display: flex;
		flex-direction: column;
	}
	.figures strong {
		font-size: 2rem;
		color: var(--gold);
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}
	.figures span {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.small {
		font-size: 0.85rem;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.compact th,
	.compact td {
		padding: 0.35rem 0.5rem;
	}
	.wide {
		width: 40%;
		min-width: 10rem;
	}
	tr.empty td:first-child {
		opacity: 0.75;
	}
	tr.secondary-start td {
		border-top: 2px solid var(--border);
	}
	.badge.wanted {
		border-color: color-mix(in srgb, #3fb950 55%, transparent);
		color: #56d364;
	}
	.warn {
		color: #e3a03a;
	}
	.bar,
	.interest {
		display: grid;
		grid-template-columns: 3.5rem 1fr auto;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.9rem;
	}
	.track,
	.stack {
		display: flex;
		height: 0.6rem;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
	}
	.fill {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	.fill.alt {
		opacity: 0.35;
	}
	.count {
		min-width: 2rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.class-bar {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 0.6rem;
	}
	.seg {
		height: 100%;
	}
	.seg.competitive {
		background: var(--accent);
	}
	.seg.casual {
		background: color-mix(in srgb, var(--accent) 40%, var(--surface-2));
	}
	.holders {
		white-space: normal;
		min-width: 14rem;
	}
	.people {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
	}
	.people li {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.6rem;
		align-items: baseline;
	}
	details summary {
		cursor: pointer;
		color: var(--muted);
	}
	details[open] summary {
		margin-bottom: 0.5rem;
	}
</style>
