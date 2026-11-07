<script lang="ts">
	import { enhance } from '$app/forms';
	import { keepValues } from '$lib/forms';
	import { classColor, className } from '$lib/labels';

	let { data, form } = $props();
	const cfg = $derived(data.config);
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
	const when = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

	type Person = (typeof data.former)[number];

	function how(p: Person) {
		if (p.leftBy === 'Battle.net') return p.leftForGuild ? `a rejoint la guilde « ${p.leftForGuild} » (vu par Battle.net)` : 'a quitté la guilde en jeu, sans nouvelle guilde (vu par Battle.net)';
		return `départ noté par ${p.leftBy}`;
	}
</script>

<h1>Anciens membres</h1>
<p class="muted intro">
	Un ancien membre n'a plus accès au site et n'apparaît plus dans le roster, les artisans, les rosters ni les statistiques. Ses fiches sont gardées : s'il revient,
	« Réintégrer » les rend visibles (ses rôles Discord se rendent sur Discord). Un départ est repéré tout seul quand aucun de ses persos n'est plus dans la guilde en jeu
	et que l'Armurerie en montre un dans une autre guilde ou sans guilde.
	{#if data.demoteFormer}Le bot retire alors ses rôles de membre.{:else}Les rôles Discord ne sont pas touchés (réglable dans <a href="/admin/recrutement">Recrutement</a>).{/if}
	{#if !data.announces}<br />Choisis le salon des annonces dans <a href="/admin/recrutement">Recrutement</a> pour que les officiers soient prévenus sur Discord.{/if}
</p>

{#if form?.error}<p class="notice bad">{form.error}</p>{/if}
{#if form?.left}<p class="notice ok">Départ de {form.left} enregistré.</p>{/if}
{#if form?.reinstated}<p class="notice ok">{form.reinstated} est de nouveau membre sur le site. Pense à lui rendre ses rôles sur Discord.</p>{/if}

{#snippet chars(p: Person)}
	{#if p.characters.length}
		<ul class="chars">
			{#each p.characters as c (c.id)}
				<li><span class="dot" style:--c={classColor(cfg, c.class)}></span>{c.name}{c.surname ? ` ${c.surname}` : ''} <span class="muted">{className(cfg, c.class)} niv. {c.level}{c.isMain ? ' · main' : ''}</span></li>
			{/each}
		</ul>
	{/if}
{/snippet}

{#snippet who(p: Person)}
	<div class="who">
		{#if p.avatar}<img src={p.avatar} alt="" />{:else}<span class="initial" aria-hidden="true">{p.displayName[0]?.toUpperCase()}</span>{/if}
		<div>
			<a href="/joueurs/{p.id}"><strong>{p.displayName}</strong></a> <span class="muted small">@{p.username}</span>
			{@render chars(p)}
		</div>
	</div>
{/snippet}

{#if data.suspects.length}
	<h2>Plus dans la guilde en jeu <span class="muted">({data.suspects.length})</span></h2>
	<p class="muted small intro">
		Aucun de leurs persos n'est dans le registre de la guilde. Le départ se confirme tout seul si l'Armurerie montre un perso dans une autre guilde ; sinon (perso
		renommé, introuvable, ou officier), c'est à vous de décider.
	</p>
	<ul class="list">
		{#each data.suspects as p (p.id)}
			<li class="card person">
				{@render who(p)}
				<p class="muted small">Absent du registre depuis le {when.format(p.absentSince!)}{p.officer ? ' · officier : jamais confirmé automatiquement' : ''}</p>
				<form method="POST" action="?/leave" use:enhance={keepValues} class="row">
					<input type="hidden" name="userId" value={p.id} />
					<input name="comment" maxlength="500" placeholder="Pourquoi ? (facultatif)" aria-label="Raison du départ de {p.displayName}" />
					<button class="secondary">Confirmer le départ</button>
				</form>
			</li>
		{/each}
	</ul>
{/if}

<h2>Anciens membres <span class="muted">({data.former.length})</span></h2>
{#if data.former.length}
	<ul class="list">
		{#each data.former as p (p.id)}
			<li class="card person" class:unseen={!p.seen}>
				<div class="head">
					{@render who(p)}
					{#if !p.seen}<span class="badge new">Nouveau</span>{/if}
				</div>
				<p class="small">Parti le {day.format(p.leftAt!)} : {how(p)}.</p>
				{#if p.leftDiscord}<p class="muted small">Discord : {p.leftDiscord}</p>{/if}
				<form method="POST" action="?/comment" use:enhance={keepValues} class="comment">
					<input type="hidden" name="userId" value={p.id} />
					<label class="small" for="comment-{p.id}">Commentaire des officiers</label>
					<div class="row">
						<input id="comment-{p.id}" name="comment" maxlength="500" value={p.leftComment ?? ''} placeholder="Pourquoi est-il parti ? (rejoint des amis, pause…)" />
						<button class="secondary">Enregistrer</button>
					</div>
				</form>
				<div class="row actions">
					{#if !p.seen}
						<form method="POST" action="?/seen" use:enhance>
							<input type="hidden" name="userId" value={p.id} />
							<button class="secondary small">Vu</button>
						</form>
					{/if}
					<form method="POST" action="?/reinstate" use:enhance>
						<input type="hidden" name="userId" value={p.id} />
						<button class="secondary small">Réintégrer</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
{:else}
	<p class="muted">Aucun départ pour l'instant.</p>
{/if}

<h2>Noter un départ</h2>
<p class="muted small intro">Pour un membre parti sans que le jeu le montre encore (ou sans Battle.net).</p>
<form method="POST" action="?/leave" use:enhance class="row manual">
	<select name="userId" aria-label="Joueur" required>
		<option value="">— Choisir un joueur —</option>
		{#each data.players as p (p.id)}<option value={p.id}>{p.displayName}</option>{/each}
	</select>
	<input name="comment" maxlength="500" placeholder="Pourquoi ? (facultatif)" aria-label="Raison du départ" />
	<button class="secondary">Noter le départ</button>
</form>

<style>
	.intro {
		max-width: 75ch;
	}
	h2 {
		font-size: 1.1rem;
		margin: 1.75rem 0 0.75rem;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.6rem;
	}
	.person {
		display: grid;
		gap: 0.5rem;
	}
	.person p {
		margin: 0;
	}
	.person.unseen {
		border-color: var(--gold);
	}
	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.new {
		border-color: var(--gold);
		color: var(--gold);
	}
	.who {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}
	.who img,
	.initial {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.initial {
		display: grid;
		place-items: center;
		background: var(--tint);
		color: var(--accent-ink);
		font-weight: 700;
	}
	.who a {
		color: var(--text);
		text-decoration: none;
	}
	.chars {
		list-style: none;
		margin: 0.2rem 0 0;
		padding: 0;
		font-size: 0.875rem;
	}
	.dot {
		display: inline-block;
		width: 0.55rem;
		height: 0.55rem;
		margin-right: 0.35rem;
		border-radius: 50%;
		background: var(--c);
	}
	.comment {
		display: grid;
		gap: 0.25rem;
	}
	.comment input {
		flex: 1;
		min-width: 12rem;
	}
	.actions {
		gap: 0.5rem;
	}
	.manual select,
	.manual input {
		width: auto;
		min-width: 12rem;
	}
	.small {
		font-size: 0.85rem;
	}
</style>
