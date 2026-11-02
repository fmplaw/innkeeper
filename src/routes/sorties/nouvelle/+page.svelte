<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	import { getActivity, getInstance, imageKeys, instanceLabel, instancesFor, levelRange } from '$lib/activities';

	let { data, form } = $props();
	const v = $derived(data.values);
	let submitting = $state(false);

	// Type et instance choisis : préremplissent le titre, et affichent places, niveaux et image.
	let kind = $state<'official' | 'member'>('official');
	let activity = $state('');
	let instanceId = $state('');
	let title = $state('');
	$effect.pre(() => {
		kind = v.kind;
		activity = v.activity;
		instanceId = v.instanceId;
		title = v.title;
	});
	const member = $derived(kind === 'member');
	// Les membres ne proposent pas de raid : ils sont organisés par les officiers.
	const activities = $derived(member ? data.activities.filter((a) => a.id !== 'raid') : data.activities);
	const chosenActivity = $derived(getActivity(activity));
	const choices = $derived(instancesFor(chosenActivity));
	const instance = $derived(getInstance(instanceId));
	const image = $derived(imageKeys(activity || null, instanceId || null).map((k) => data.images[k]).find(Boolean));
	const places = $derived(instance?.size ?? chosenActivity?.limit);

	function pickKind(next: 'official' | 'member') {
		kind = next;
		if (next === 'member' && activity === 'raid') pickActivity('');
	}
	function pickActivity(id: string) {
		activity = id;
		if (!instancesFor(getActivity(id)).some((i) => i.id === instanceId)) pickInstance('');
	}
	function pickInstance(id: string) {
		const previous = getInstance(instanceId)?.name;
		instanceId = id;
		// Le titre suit l'instance tant qu'il n'a pas été personnalisé.
		const next = getInstance(id)?.name;
		if (next && (!title || title === previous)) title = next;
	}
</script>

<p><a href="/sorties" class="muted">← Sorties</a></p>
<h1>{data.kinds.includes('official') ? 'Nouvelle sortie' : 'Proposer une sortie'}</h1>
<p class="muted intro">
	La sortie est créée dans Raid-Helper, qui la poste sur Discord. Les joueurs s'y inscrivent sur Discord ou depuis le
	site. Heures en {data.timezone}.
</p>

{#if data.kinds.length > 1}
	<fieldset class="kinds">
		<legend>Publier comme</legend>
		<label class="choice"><input type="radio" name="kind-choice" value="official" checked={kind === 'official'} onchange={() => pickKind('official')} /> Sortie officielle de la guilde</label>
		<label class="choice"><input type="radio" name="kind-choice" value="member" checked={kind === 'member'} onchange={() => pickKind('member')} /> Sortie membre (donjon, quêtes… entre joueurs)</label>
	</fieldset>
{/if}

{#if member}
	<p class="card info">
		Ta sortie sera publiée dans <strong>#{data.memberChannel ?? 'sorties membres'}</strong> et c'est toi qui l'organises : tu
		pourras la modifier ou la supprimer depuis sa page.
		{#if data.remaining !== null}Encore <strong>{Math.max(data.remaining, 0)}</strong> sortie{data.remaining > 1 ? 's' : ''} possible{data.remaining > 1 ? 's' : ''} (3 à venir au plus par joueur).{/if}
	</p>
{/if}

{#if data.templates.length && !member}
	<div class="templates">
		<label for="modele">Partir d'un modèle</label>
		<select id="modele" value={data.template ?? ''} onchange={(e) => goto(`?modele=${e.currentTarget.value}`, { replaceState: true })}>
			<option value="">— Aucun —</option>
			{#each data.templates as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
		</select>
	</div>
{/if}

{#if form?.error}<p class="notice bad">{form.error}</p>{/if}
{#if data.channelsError}<p class="notice warn">{data.channelsError}</p>{/if}

{#key data.template}
	<form
		method="POST"
		class="card form"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				submitting = false;
			};
		}}
	>
		<input type="hidden" name="kind" value={kind} />
		<input type="hidden" name="rosterId" value={v.rosterId ?? ''} />
		<div class="grid">
			<div>
				<label for="activity">Type de sortie</label>
				<select id="activity" name="activity" value={activity} onchange={(e) => pickActivity(e.currentTarget.value)}>
					<option value="">— Libre —</option>
					{#each activities as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
				</select>
			</div>
			{#if choices.length}
				<div>
					<label for="instanceId">{chosenActivity?.instances === 'raid' ? 'Raid' : 'Donjon'}</label>
					<select id="instanceId" name="instanceId" value={instanceId} onchange={(e) => pickInstance(e.currentTarget.value)}>
						<option value="">— Choisir —</option>
						{#each choices as i (i.id)}<option value={i.id}>{instanceLabel(i)}</option>{/each}
					</select>
				</div>
			{:else}
				<input type="hidden" name="instanceId" value="" />
			{/if}
			{#if chosenActivity}
				<div class="facts wide">
					{#if image}<img src={image} alt="" />{/if}
					<p class="muted">
						{places ? `${places} places` : 'Places illimitées'}{instance ? ` · ${levelRange(instance)}` : ''} · durée {chosenActivity.duration / 60} h
						{#if !image}<br /><span class="small">Pas d'image pour cette sortie : un officier peut en ajouter dans Admin → Sorties.</span>{/if}
					</p>
				</div>
			{/if}
			<div class="wide">
				<label for="title">Titre</label>
				<input id="title" name="title" required minlength="2" maxlength="100" bind:value={title} placeholder="Cœur du Magma" />
			</div>
			<div class="wide">
				<label for="description">Description <span class="muted">(affichée dans l'événement sur Discord)</span></label>
				<textarea
					id="description"
					name="description"
					rows="4"
					maxlength="1500"
					placeholder={"Rendez-vous devant l'entrée à 20h50.\nPrévoir potions et nourriture. Quête de la clé à faire avant si possible."}
				>{v.description}</textarea>
			</div>
			<div>
				<label for="date">Date</label>
				<input id="date" name="date" type="date" required min={data.today} value={v.date} />
			</div>
			<div>
				<label for="time">Heure</label>
				<input id="time" name="time" type="time" required value={v.time} />
			</div>
			{#if !member}
				<div>
					<label for="channelId">Salon</label>
					<select id="channelId" name="channelId" required value={v.channelId}>
						<option value="">— Choisir —</option>
						{#each data.channels as ch (ch.id)}<option value={ch.id}># {ch.name}</option>{/each}
					</select>
				</div>
				<div>
					<label for="leaderId">Chef de raid</label>
					<select id="leaderId" name="leaderId" required value={v.leaderId}>
						<option value="">— Choisir —</option>
						{#each data.officers as o (o.id)}<option value={o.id}>{o.name}</option>{/each}
					</select>
				</div>
			{/if}
		</div>
		<div class="row">
			<button disabled={submitting || (member && data.remaining !== null && data.remaining <= 0)}>
				{submitting ? 'Création dans Raid-Helper…' : member ? 'Proposer la sortie' : 'Créer la sortie'}
			</button>
		</div>
	</form>
{/key}

<style>
	.kinds {
		border: 1px solid var(--border);
		border-radius: 6px;
		display: grid;
		gap: 0.4rem;
		margin-bottom: 1rem;
		max-width: 40rem;
	}
	.kinds legend {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.choice {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		color: var(--text);
	}
	.info {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
	.intro {
		max-width: 65ch;
	}
	.templates {
		display: grid;
		gap: 0.3rem;
		max-width: 20rem;
		margin-bottom: 1rem;
	}
	.form {
		display: grid;
		gap: 1rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: 0.75rem 1rem;
	}
	.wide {
		grid-column: 1 / -1;
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
	}
	.facts img {
		width: min(16rem, 100%);
		aspect-ratio: 16 / 9;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid var(--border);
	}
	.facts p {
		margin: 0;
	}
	.small {
		font-size: 0.85rem;
	}
	.warn {
		border-color: var(--gold);
		color: var(--gold);
		margin-bottom: 1rem;
	}
</style>
