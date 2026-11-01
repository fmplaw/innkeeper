<script lang="ts">
	import { enhance } from '$app/forms';
	import { keepValues } from '$lib/forms';

	let { data, form } = $props();
	const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
	type Template = (typeof data.templates)[number];
	const levels = (l: readonly [number, number]) => (l[0] === l[1] ? `${l[0]}` : `${l[0]}-${l[1]}`);
	const imageGroups = $derived([
		{ title: 'Types de sortie', items: data.activities.map((a) => ({ key: `activity:${a.id}`, name: a.name, hint: 'image par défaut' })) },
		{ title: 'Donjons', items: data.instances.filter((i) => i.kind === 'dungeon').map((i) => ({ key: `instance:${i.id}`, name: i.name, hint: `niv. ${levels(i.levels)}` })) },
		{ title: 'Raids', items: data.instances.filter((i) => i.kind === 'raid').map((i) => ({ key: `instance:${i.id}`, name: i.name, hint: `${i.size} joueurs` })) }
	]);
</script>

<h1>Sorties</h1>
<p class="muted intro">
	Le site crée les sorties dans <strong>Raid-Helper</strong> : l'événement est posté sur Discord et les joueurs s'y
	inscrivent comme d'habitude. Les modèles préremplissent le formulaire de <a href="/sorties/nouvelle">nouvelle sortie</a>.
</p>

{#if form?.saved}<p class="card ok">Réglages enregistrés.</p>{/if}
{#if form?.created}<p class="card ok">Modèle créé.</p>{/if}
{#if form?.deleted}<p class="card ok">Modèle supprimé.</p>{/if}
{#if form?.error}<p class="card error">{form.error}</p>{/if}
{#if data.channelsError}<p class="card warn">{data.channelsError}</p>{/if}

{#snippet channelSelect(id: string, name: string, value: string | null, empty: string)}
	<select {id} {name} value={value ?? ''}>
		<option value="">{empty}</option>
		{#each data.channels as ch (ch.id)}<option value={ch.id}># {ch.name}</option>{/each}
		{#if value && !data.channels.some((ch) => ch.id === value)}<option {value}>Salon {value}</option>{/if}
	</select>
{/snippet}

<form method="POST" action="?/connection" use:enhance={keepValues} class="card form">
	<h2>Connexion Raid-Helper</h2>
	<div class="grid">
		<div>
			<label for="apiKey">Clé API du serveur {data.hasKey ? '' : '*'}</label>
			{#if data.instanceAdmin}
				<input id="apiKey" name="apiKey" type="password" autocomplete="off" placeholder={data.hasKey ? 'Inchangée (laisser vide)' : ''} />
				<p class="hint muted">
					Un administrateur du serveur Discord tape <code>/apikey</code> : Raid-Helper lui répond en privé. La clé est
					vérifiée avant d'être enregistrée.
				</p>
				{#if data.hasKey}<label class="choice"><input type="checkbox" name="removeKey" /> Retirer la clé</label>{/if}
			{:else}
				<p class="muted">{data.hasKey ? 'Configurée.' : 'Pas encore configurée.'} Seul l'admin d'instance peut la changer.</p>
			{/if}
		</div>
		<div>
			<label for="defaultChannelId">Salon des sorties officielles</label>
			{@render channelSelect('defaultChannelId', 'defaultChannelId', data.defaultChannelId, '— Choisir —')}
			<p class="hint muted">Utilisé quand le modèle ne précise pas de salon.</p>
		</div>
		<div>
			<label for="memberChannelId">Salon des sorties des membres</label>
			{@render channelSelect('memberChannelId', 'memberChannelId', data.memberChannelId, '— Aucun : pas de sorties membres —')}
			<p class="hint muted">
				Tout membre peut y proposer un donjon, des quêtes, du farm ou du PvP (pas de raid), 3 sorties à venir au plus par
				joueur. Conseillé : un salon où seul Raid-Helper peut écrire.
			</p>
		</div>
	</div>
	<label class="choice">
		<input type="checkbox" name="discordEvents" checked={data.discordEvents} />
		Créer aussi un événement Discord pour les sorties officielles (jamais pour les sorties des membres)
	</label>
	<p class="hint muted">
		La sortie apparaît alors dans la liste des événements du serveur, avec ses rappels. Il faut donner la permission
		« Gérer les événements » au rôle Raid-Helper sur Discord, sinon Raid-Helper envoie un message d'erreur au créateur.
	</p>
	<div class="row"><button>Enregistrer</button></div>
</form>

{#snippet templateFields(t: Template | null)}
	{@const key = t ? t.id : 'new'}
	<div class="grid">
		<div>
			<label for="name-{key}">Nom du modèle</label>
			<input id="name-{key}" name="name" required minlength="2" maxlength="60" value={t?.name ?? ''} placeholder="Raid du mercredi" />
		</div>
		<div>
			<label for="kind-{key}">Sortie</label>
			<select id="kind-{key}" name="kind" value={t?.instanceId ? `${t.activity}:${t.instanceId}` : (t?.activity ?? '')}>
				<option value="">— Libre —</option>
				{#each data.activities as a (a.id)}
					{#if a.instances}
						<optgroup label={a.name}>
							<option value={a.id}>{a.name} (instance au choix)</option>
							{#each data.instances.filter((i) => i.kind === a.instances) as i (i.id)}<option value="{a.id}:{i.id}">{i.name}</option>{/each}
						</optgroup>
					{:else}
						<option value={a.id}>{a.name}</option>
					{/if}
				{/each}
			</select>
		</div>
		<div>
			<label for="title-{key}">Titre de l'événement</label>
			<input id="title-{key}" name="title" required minlength="2" maxlength="100" value={t?.title ?? ''} placeholder="Cœur du Magma" />
		</div>
		<div>
			<label for="channelId-{key}">Salon</label>
			{@render channelSelect(`channelId-${key}`, 'channelId', t?.channelId ?? null, '— Salon par défaut —')}
		</div>
		<div class="when">
			<div>
				<label for="weekday-{key}">Jour habituel</label>
				<select id="weekday-{key}" name="weekday" value={t?.weekday ?? ''}>
					<option value="">—</option>
					{#each WEEKDAYS as day, i (day)}<option value={i + 1}>{day}</option>{/each}
				</select>
			</div>
			<div>
				<label for="time-{key}">Heure</label>
				<input id="time-{key}" name="time" type="time" value={t?.time ?? ''} />
			</div>
		</div>
		<div>
			<label for="rosterId-{key}">Roster à comparer</label>
			<select id="rosterId-{key}" name="rosterId" value={t?.rosterId ?? ''}>
				<option value="">— Aucun —</option>
				{#each data.rosters as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
			</select>
		</div>
		<div class="wide">
			<label for="description-{key}">Description</label>
			<textarea id="description-{key}" name="description" rows="3" maxlength="1500" placeholder="Consommables, résistance feu…">{t?.description ?? ''}</textarea>
		</div>
	</div>
{/snippet}

<h2 class="section">Modèles de sortie</h2>
<div class="list">
	{#each data.templates as t (t.id)}
		<form method="POST" action="?/update" use:enhance={keepValues} class="card form">
			<input type="hidden" name="id" value={t.id} />
			{@render templateFields(t)}
			<div class="row actions">
				<a href="/sorties/nouvelle?modele={t.id}">Créer une sortie avec ce modèle</a>
				<span class="spacer"></span>
				<button class="secondary">Enregistrer</button>
				<button
					class="danger"
					formaction="?/delete"
					formnovalidate
					onclick={(e) => {
						if (!window.confirm(`Supprimer le modèle « ${t.name} » ?`)) e.preventDefault();
					}}>Supprimer</button
				>
			</div>
		</form>
	{:else}
		<p class="muted">Aucun modèle pour l'instant.</p>
	{/each}
</div>

<form method="POST" action="?/create" use:enhance class="card form">
	<h2>Nouveau modèle</h2>
	{@render templateFields(null)}
	<div class="row"><button>Créer le modèle</button></div>
</form>

<h2 class="section">Images des sorties</h2>
<p class="muted intro">
	Affichées en grand dans l'événement Raid-Helper sur Discord et dans la liste des sorties du site. L'image d'une
	instance passe avant celle de son type. PNG, JPEG ou WebP, 2 Mo maximum, format large conseillé (16:9, par exemple
	1280 × 720). Utilise des images que tu as le droit de diffuser : captures du jeu, illustrations faites par la guilde…
</p>
{#each imageGroups as group (group.title)}
	<h3>{group.title}</h3>
	<div class="images">
		{#each group.items as item (item.key)}
			<form method="POST" action="?/image" enctype="multipart/form-data" use:enhance class="card image-card">
				<input type="hidden" name="key" value={item.key} />
				{#if data.images[item.key]}
					<img src={data.images[item.key]} alt="" />
				{:else}
					<div class="placeholder muted">Pas d'image</div>
				{/if}
				<strong>{item.name}</strong>
				<span class="muted small">{item.hint}</span>
				{#if form?.imageKey === item.key && form?.imageError}<p class="error small">{form.imageError}</p>{/if}
				<input type="file" name="image" accept="image/png,image/jpeg,image/webp" aria-label="Image pour {item.name}" onchange={(e) => e.currentTarget.form?.requestSubmit()} />
				{#if data.images[item.key]}<button class="secondary small" name="remove" value="1" formnovalidate>Retirer</button>{/if}
			</form>
		{/each}
	</div>
{/each}

<style>
	h3 {
		margin: 1.25rem 0 0.5rem;
		font-size: 1rem;
		color: var(--muted);
	}
	.images {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: 0.75rem;
	}
	.image-card {
		display: grid;
		gap: 0.35rem;
		align-content: start;
		padding: 0.6rem;
	}
	.image-card img,
	.placeholder {
		width: 100%;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		border-radius: 4px;
	}
	.placeholder {
		display: grid;
		place-items: center;
		background: var(--surface-2);
		font-size: 0.85rem;
	}
	.image-card input[type='file'] {
		font-size: 0.8rem;
		max-width: 100%;
	}
	.small {
		font-size: 0.8rem;
	}
	.intro {
		max-width: 65ch;
	}
	h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.section {
		margin: 1.5rem 0 0.75rem;
	}
	.form {
		display: grid;
		gap: 1rem;
	}
	.list {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.75rem 1rem;
	}
	.when {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
	.wide {
		grid-column: 1 / -1;
	}
	.hint {
		margin: 0.3rem 0 0;
		font-size: 0.82rem;
	}
	.choice {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--text);
	}
	code {
		background: var(--surface-2);
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
	}
	.actions {
		align-items: center;
	}
	.spacer {
		flex: 1;
	}
	.ok,
	.warn {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
	.warn {
		color: var(--gold);
	}
	p.card.error {
		margin-bottom: 1rem;
	}
</style>
