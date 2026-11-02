import { mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { latestBackup, recordFailure, resetHealth, serviceHealth, tracked } from './health';

const respond = (status: number) => async () => new Response('{}', { status });

beforeEach(() => resetHealth());

describe('état des services', () => {
	it('rien d’enregistré tant qu’aucun appel n’a eu lieu', () => {
		expect(serviceHealth().raidhelper).toEqual({ okAt: null, error: null, failures: 0 });
	});

	it('note la dernière réponse correcte', async () => {
		const res = await tracked('raidhelper', 'lecture d’une sortie', respond(200));
		expect(res.status).toBe(200);
		expect(serviceHealth().raidhelper.okAt).toBeTypeOf('number');
		expect(serviceHealth().raidhelper.failures).toBe(0);
	});

	it('note une erreur HTTP avec ce qui était demandé, sans lever d’exception', async () => {
		const res = await tracked('bot', 'lecture d’un membre', respond(503));
		expect(res.status).toBe(503);
		const { error, failures } = serviceHealth().bot;
		expect(error?.message).toBe('lecture d’un membre : réponse 503');
		expect(failures).toBe(1);
	});

	it('un statut attendu (404 : membre absent du serveur) n’est pas une panne', async () => {
		await tracked('discord', 'membre du serveur', respond(404), { expected: [404] });
		expect(serviceHealth().discord.error).toBeNull();
		expect(serviceHealth().discord.okAt).toBeTypeOf('number');
	});

	it('note une panne réseau ou un délai dépassé, et relance l’erreur', async () => {
		await expect(
			tracked('raidhelper', 'lecture d’une sortie', async () => {
				throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
			})
		).rejects.toThrow();
		expect(serviceHealth().raidhelper.error?.message).toBe('lecture d’une sortie : pas de réponse (délai dépassé)');
	});

	it('garde la dernière erreur et compte les pannes, même après un succès', async () => {
		await tracked('bot', 'a', respond(500));
		await tracked('bot', 'b', respond(429));
		await tracked('bot', 'c', respond(200));
		const bot = serviceHealth().bot;
		expect(bot.error?.message).toBe('b : réponse 429');
		expect(bot.failures).toBe(2);
		expect(bot.okAt! >= bot.error!.at).toBe(true);
	});

	it('enregistre une erreur signalée hors appel (connexion Discord via Auth.js)', () => {
		recordFailure('discord', 'connexion : OAuthCallbackError');
		expect(serviceHealth().discord.error?.message).toBe('connexion : OAuthCallbackError');
	});

	it('tronque un message trop long', () => {
		recordFailure('discord', 'x'.repeat(1000));
		expect(serviceHealth().discord.error!.message.length).toBeLessThanOrEqual(300);
	});
});

describe('dernière sauvegarde', () => {
	it('trouve la copie la plus récente du script de sauvegarde', () => {
		const dir = mkdtempSync(join(tmpdir(), 'sauvegardes-'));
		writeFileSync(join(dir, 'guilde-2026-11-01-03-00.db'), 'a');
		writeFileSync(join(dir, 'guilde-2026-11-02-03-00.db'), 'bb');
		writeFileSync(join(dir, 'autre.txt'), 'c');
		utimesSync(join(dir, 'guilde-2026-11-02-03-00.db'), new Date('2026-11-02T03:00:00Z'), new Date('2026-11-02T03:00:00Z'));
		expect(latestBackup(dir)).toEqual({ file: 'guilde-2026-11-02-03-00.db', at: Date.parse('2026-11-02T03:00:00Z'), bytes: 2 });
	});

	it('null sans dossier ou sans copie', () => {
		expect(latestBackup(join(tmpdir(), 'nexiste-pas-innkeeper'))).toBeNull();
		expect(latestBackup(mkdtempSync(join(tmpdir(), 'vide-')))).toBeNull();
	});
});
