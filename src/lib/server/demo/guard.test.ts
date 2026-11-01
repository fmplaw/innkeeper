import { describe, expect, it } from 'vitest';
import { guildSchema, setGuild } from '../settings';
import { initDemo } from '.';

describe('mode démo sur une vraie base', () => {
	it('refuse de démarrer : il ouvrirait la base à n’importe qui', () => {
		setGuild(guildSchema.parse({ name: 'Une vraie guilde', faction: 'horde', accentColor: '#b3261e' }));
		const realFetch = globalThis.fetch;
		expect(() => initDemo()).toThrow(/pas une base de démo/);
		expect(globalThis.fetch).toBe(realFetch);
	});
});
