import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBattlenetConnection, fetchGuildMember } from './discord';

describe('profil du joueur sur le serveur (connexion)', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('n’attend pas Discord indéfiniment : la requête a un délai maximal', async () => {
		const fetch = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({ nick: null, roles: [] }));
		vi.stubGlobal('fetch', fetch);
		await fetchGuildMember('jeton', '222222222222222222');
		expect(fetch.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
	});

	it('absent du serveur : null', async () => {
		vi.stubGlobal('fetch', async () => new Response('', { status: 404 }));
		expect(await fetchGuildMember('jeton', '222222222222222222')).toBeNull();
	});
});

describe('compte Battle.net relié à Discord (connexion)', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('BattleTag si relié, null sinon, undefined si Discord refuse (scope non accordé)', async () => {
		vi.stubGlobal('fetch', async () =>
			Response.json([
				{ type: 'steam', name: 'x' },
				{ type: 'battlenet', name: 'Vinshal#2481' }
			])
		);
		expect(await fetchBattlenetConnection('jeton')).toBe('Vinshal#2481');
		// Révoquée côté Discord (jeton expiré) : toujours affichée et relayée, donc reliée.
		vi.stubGlobal('fetch', async () => Response.json([{ type: 'battlenet', name: 'Ancien#1', revoked: true }]));
		expect(await fetchBattlenetConnection('jeton')).toBe('Ancien#1');
		vi.stubGlobal('fetch', async () => Response.json([{ type: 'battlenet', name: '' }]));
		expect(await fetchBattlenetConnection('jeton')).toBe('Battle.net');
		vi.stubGlobal('fetch', async () => Response.json([{ type: 'steam', name: 'x' }]));
		expect(await fetchBattlenetConnection('jeton')).toBeNull();
		vi.stubGlobal('fetch', async () => new Response('', { status: 403 }));
		expect(await fetchBattlenetConnection('jeton')).toBeUndefined();
		vi.stubGlobal('fetch', async () => {
			throw new Error('réseau');
		});
		expect(await fetchBattlenetConnection('jeton')).toBeUndefined();
	});
});
