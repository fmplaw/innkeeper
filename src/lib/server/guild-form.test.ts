import { describe, expect, it } from 'vitest';
import { formData } from '../../test/helpers';
import { parseGuildForm } from './guild-form';
import { guildSchema } from './settings';

const base = { name: 'Le Pacte de Test', faction: 'horde', accentColor: '#b3261e', timezone: 'Europe/Paris' };

describe('profil de guilde : type de serveur', () => {
	it('est demandé dans le formulaire', async () => {
		const parsed = await parseGuildForm(formData(base), null);
		expect(parsed.errors?.serverType).toMatch(/type de serveur/);
	});

	it('est enregistré quand il est choisi', async () => {
		const parsed = await parseGuildForm(formData({ ...base, serverType: 'pvp' }), null);
		expect(parsed.data?.serverType).toBe('pvp');
	});

	it('refuse un type inconnu', async () => {
		const parsed = await parseGuildForm(formData({ ...base, serverType: 'pvp-rp-ultra' }), null);
		expect(parsed.errors?.serverType).toBeDefined();
	});

	it('reste facultatif pour un profil enregistré avant ce réglage', () => {
		expect(guildSchema.parse(base).serverType).toBeNull();
	});
});
