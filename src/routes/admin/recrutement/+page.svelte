<script lang="ts">
	import { enhance } from '$app/forms';
	import { keepValues } from '$lib/forms';

	let { data, form } = $props();
	const s = $derived(data.settings);
</script>

<h1>Recrutement</h1>
<p class="muted intro">
	L'ouverture du recrutement et les classes recherchées se règlent dans <a href="/admin/guilde">Guilde</a>. Ici : ce
	que fait le bot quand une candidature arrive ou est acceptée, et les questions posées aux candidats.
</p>

{#if form?.saved}<p class="notice ok">Réglages enregistrés.</p>{/if}
{#if form?.tested}<p class="notice ok">Message de test envoyé : vérifie le salon sur Discord.</p>{/if}
{#if form?.error}<p class="notice bad">{form.error}</p>{/if}
{#if !data.botReady}
	<p class="notice warn">Le bot n'est pas encore configuré (Admin → Connexion Discord) : les salons ne peuvent pas être listés.</p>
{:else if data.channelsError}
	<p class="notice warn">{data.channelsError}</p>
{/if}

<form method="POST" action="?/save" use:enhance={keepValues} class="card form">
	<fieldset>
		<legend>Arrivée d'une recrue acceptée</legend>
		<div class="grid">
			<div>
				<label for="arrivalRoleId">Rôle donné par le bot</label>
				<select id="arrivalRoleId" name="arrivalRoleId" value={s.arrivalRoleId ?? ''}>
					<option value="">— Choisir —</option>
					{#each data.roles as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
				</select>
				<p class="hint muted">Le rôle du bot doit être placé au-dessus de ce rôle sur Discord.</p>
			</div>
			<div>
				<label for="inviteChannelId">Salon d'arrivée des invitations</label>
				<select id="inviteChannelId" name="inviteChannelId" value={s.inviteChannelId ?? ''}>
					<option value="">— Choisir —</option>
					{#each data.channels as ch (ch.id)}<option value={ch.id}># {ch.name}</option>{/each}
					{#if s.inviteChannelId && !data.channels.some((ch) => ch.id === s.inviteChannelId)}<option value={s.inviteChannelId}>Salon {s.inviteChannelId}</option>{/if}
				</select>
				<p class="hint muted">Pour un candidat accepté qui n'est pas encore sur le serveur.</p>
			</div>
		</div>
	</fieldset>

	<fieldset>
		<legend>Annonces aux officiers</legend>
		<div class="grid">
			<div>
				<label for="notifyChannelId">Salon des annonces</label>
				<select id="notifyChannelId" name="notifyChannelId" value={s.notifyChannelId ?? ''}>
					<option value="">— Aucune annonce —</option>
					{#each data.channels as ch (ch.id)}<option value={ch.id}># {ch.name}</option>{/each}
					{#if s.notifyChannelId && !data.channels.some((ch) => ch.id === s.notifyChannelId)}<option value={s.notifyChannelId}>Salon {s.notifyChannelId}</option>{/if}
				</select>
				<p class="hint muted">Salon privé : autorise le bot à y voir, écrire et intégrer des liens.</p>
			</div>
			<div>
				<label for="mentionRoleId">Rôle à mentionner</label>
				<select id="mentionRoleId" name="mentionRoleId" value={s.mentionRoleId ?? ''}>
					<option value="">— Personne —</option>
					{#each data.roles as r (r.id)}<option value={r.id}>@{r.name}</option>{/each}
				</select>
			</div>
		</div>
		<div class="row"><button class="secondary" formaction="?/test" formnovalidate>Envoyer un message de test</button></div>
	</fieldset>

	<fieldset>
		<legend>Départ d'un membre</legend>
		<p class="hint muted intro">
			Quand un membre quitte la guilde en jeu (vu par la synchronisation Battle.net) ou qu'un officier note son départ, il n'a plus accès au site et
			disparaît du roster. Les officiers sont prévenus dans le salon des annonces ; ils le retrouvent dans <a href="/admin/anciens">Anciens membres</a>.
		</p>
		<label class="check"><input type="checkbox" name="demoteFormer" checked={s.demoteFormer} /> Le bot retire ses rôles de membre sur Discord</label>
		<div class="grid">
			<div>
				<label for="formerRoleId">Rôle donné à la place (facultatif)</label>
				<select id="formerRoleId" name="formerRoleId" value={s.formerRoleId ?? ''}>
					<option value="">— Aucun —</option>
					{#each data.roles as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
				</select>
				<p class="hint muted">Par exemple le rôle des invités, pour qu'il reste sur le serveur. Le rôle du bot doit être placé au-dessus des rôles de membre sur Discord.</p>
			</div>
		</div>
	</fieldset>

	<fieldset>
		<legend>Candidatures</legend>
		<div>
			<label for="questions">Questions posées aux candidats (une par ligne)</label>
			<textarea id="questions" name="questions" rows="6">{s.questions.join('\n')}</textarea>
			<p class="hint muted">Modèle de départ : {data.defaultQuestions.join(' · ')}</p>
		</div>
		<div class="grid">
			<div>
				<label for="reapplyDays">Délai avant de repostuler après un refus (jours)</label>
				<input id="reapplyDays" name="reapplyDays" type="number" min="0" max="365" value={s.reapplyDays} />
			</div>
			<div>
				<label for="reviewDays">Revue de progression des nouveaux membres après (jours)</label>
				<input id="reviewDays" name="reviewDays" type="number" min="7" max="730" value={s.reviewDays} />
				<p class="hint muted">Voir <a href="/admin/progression">Progression</a>. 90 jours = environ 3 mois.</p>
			</div>
		</div>
	</fieldset>

	<div class="row"><button>Enregistrer</button></div>
</form>

<style>
	.intro {
		max-width: 65ch;
	}
	.form {
		display: grid;
		gap: 1rem;
	}
	fieldset:first-of-type {
		padding-top: 0.5rem;
		border-top: 0;
	}
	/* Sections séparées par un filet, sans cadre. */
	fieldset {
		padding-block: 1.5rem;
		border-top: 1px solid var(--border);
		display: grid;
		gap: 0.75rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 1rem;
	}
	.hint {
		margin: 0.3rem 0 0;
		font-size: 0.82rem;
	}
	.ok,
	.warn {
		border-color: var(--gold);
		margin-bottom: 1rem;
	}
	.warn {
		color: var(--gold);
	}
</style>
