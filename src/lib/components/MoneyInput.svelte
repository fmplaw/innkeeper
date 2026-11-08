<script lang="ts">
	// Trois petites cases po / pa / pc, lues côté serveur par readMoney(form, name).
	let { name, label, hint = '' }: { name: string; label: string; hint?: string } = $props();
</script>

<fieldset class="money">
	<legend>{label}</legend>
	<div class="coins">
		<label><input name="{name}Gold" type="number" min="0" max="100000" inputmode="numeric" aria-label="{label} : pièces d'or" /> <span class="gold">po</span></label>
		<label><input name="{name}Silver" type="number" min="0" max="99" inputmode="numeric" aria-label="{label} : pièces d'argent" /> <span class="silver">pa</span></label>
		<label><input name="{name}Copper" type="number" min="0" max="99" inputmode="numeric" aria-label="{label} : pièces de cuivre" /> <span class="copper">pc</span></label>
	</div>
	{#if hint}<p class="hint muted">{hint}</p>{/if}
</fieldset>

<style>
	.money {
		display: grid;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	legend {
		margin-bottom: 0.375rem;
		font-weight: 600;
	}
	.coins {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
	}
	.coins label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin: 0;
	}
	.coins input {
		width: 5.5rem;
	}
	.gold {
		color: #e6b422;
	}
	.silver {
		color: #b8c2cc;
	}
	.copper {
		color: #c8743c;
	}
	.hint {
		margin: 0;
	}
</style>
