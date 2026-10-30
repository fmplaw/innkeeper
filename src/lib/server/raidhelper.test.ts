import { describe, expect, it } from 'vitest';
import { parseEventId } from './raidhelper';

describe('parseEventId', () => {
	it('accepte un identifiant brut', () => {
		expect(parseEventId('700000000000000001')).toBe('700000000000000001');
	});

	it('extrait l’identifiant d’un lien de message Discord (le dernier nombre)', () => {
		expect(parseEventId('https://discord.com/channels/800000000000000001/700000000000000002/700000000000000001')).toBe(
			'700000000000000001'
		);
	});

	it('extrait l’identifiant d’un lien raid-helper.dev', () => {
		expect(parseEventId('https://raid-helper.dev/event/700000000000000001')).toBe('700000000000000001');
	});

	it('renvoie null sans identifiant plausible', () => {
		expect(parseEventId('bonjour')).toBeNull();
		expect(parseEventId('12345')).toBeNull();
	});
});
