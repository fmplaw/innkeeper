<script lang="ts">
	import { ADDON_IMPORTANCES, ADDON_USAGES, IMPORTANCE_INFO, USAGE_LABELS } from '$lib/addons';
	import { ROLES, ROLE_LABELS } from '$lib/roles';
	import type { PublicConfig } from '$lib/server/config';

	// Champs d'un addon conseillé (ajout et modification dans Admin → Addons).
	interface Values {
		name?: string;
		importance?: string;
		usage?: string;
		classes?: string[];
		roles?: string[];
		description?: string | null;
		curseforgeUrl?: string | null;
		wagoUrl?: string | null;
		otherUrl?: string | null;
	}
	let { id, values = {}, config }: { id: string; values?: Values; config: PublicConfig } = $props();
</script>

<div class="fields">
	<div>
		<label for="{id}-name">Nom *</label>
		<input id="{id}-name" name="name" required minlength="2" maxlength="60" value={values.name ?? ''} />
	</div>
	<div>
		<label for="{id}-importance">Importance *</label>
		<select id="{id}-importance" name="importance" value={values.importance ?? 'recommended'}>
			{#each ADDON_IMPORTANCES as i (i)}<option value={i}>{IMPORTANCE_INFO[i].label}</option>{/each}
		</select>
	</div>
	<div>
		<label for="{id}-usage">Usage *</label>
		<select id="{id}-usage" name="usage" value={values.usage ?? 'other'}>
			{#each ADDON_USAGES as u (u)}<option value={u}>{USAGE_LABELS[u]}</option>{/each}
		</select>
	</div>
	<div class="wide">
		<label for="{id}-description">Ce qu'il fait, pourquoi la guilde le conseille</label>
		<textarea id="{id}-description" name="description" rows="2" maxlength="500">{values.description ?? ''}</textarea>
	</div>
	<fieldset class="wide">
		<legend>Pour qui ? <span class="muted">(rien de coché : tout le monde)</span></legend>
		<div class="checks">
			{#each ROLES as r (r)}
				<label class="choice"><input type="checkbox" name="roles" value={r} checked={values.roles?.includes(r)} /> {ROLE_LABELS[r]}</label>
			{/each}
		</div>
		<div class="checks">
			{#each config.classes as c (c.id)}
				<label class="choice"><input type="checkbox" name="classes" value={c.id} checked={values.classes?.includes(c.id)} /> <span class="dot" style:--c={c.color}></span> {c.name}</label>
			{/each}
		</div>
	</fieldset>
	<div>
		<label for="{id}-cf">Lien CurseForge</label>
		<input id="{id}-cf" name="curseforgeUrl" type="url" placeholder="https://www.curseforge.com/wow/addons/…" value={values.curseforgeUrl ?? ''} />
	</div>
	<div>
		<label for="{id}-wago">Lien Wago</label>
		<input id="{id}-wago" name="wagoUrl" type="url" placeholder="https://addons.wago.io/addons/…" value={values.wagoUrl ?? ''} />
	</div>
	<div>
		<label for="{id}-other">Autre lien</label>
		<input id="{id}-other" name="otherUrl" placeholder="https://… (site, GitHub)" value={values.otherUrl ?? ''} />
	</div>
</div>

<style>
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
		gap: 0.75rem 1rem;
	}
	.wide {
		grid-column: 1 / -1;
	}
	fieldset {
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.6rem 0.8rem;
		display: grid;
		gap: 0.4rem;
	}
	legend {
		font-size: 0.9rem;
		color: var(--muted);
	}
	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1rem;
	}
	.choice {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.92rem;
	}
	.choice:not([style]) {
		color: var(--text);
	}
	.choice input {
		width: auto;
	}
	textarea {
		resize: vertical;
	}
</style>
