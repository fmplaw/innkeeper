import { describe, expect, it } from 'vitest';
import { checkSetupCode, consumeSetupCode, createLocalAdmin, hasLocalAdmin, hashPassword, login, setupCode } from './local-admin';

describe('admin local', () => {
	it('le code d’installation n’est valable qu’une fois', () => {
		const code = setupCode();
		expect(checkSetupCode('mauvais')).toBe(false);
		expect(checkSetupCode(` ${code} `)).toBe(true);
		consumeSetupCode();
		expect(setupCode()).not.toBe(code);
	});

	it('les mots de passe sont hachés avec un sel différent à chaque fois', () => {
		const a = hashPassword('motdepasse-solide');
		const b = hashPassword('motdepasse-solide');
		expect(a).toMatch(/^scrypt\$/);
		expect(a).not.toBe(b);
		expect(a).not.toContain('motdepasse-solide');
	});

	it('connexion : bon mot de passe accepté, mauvais refusé', () => {
		expect(hasLocalAdmin()).toBe(false);
		createLocalAdmin('aubergiste', 'motdepasse-solide');
		expect(hasLocalAdmin()).toBe(true);
		expect(login('aubergiste', 'motdepasse-solide', '10.0.0.1').admin?.username).toBe('aubergiste');
		expect(login('aubergiste', 'faux', '10.0.0.1').error).toBe('Identifiants incorrects.');
		expect(login('inconnu', 'motdepasse-solide', '10.0.0.1').error).toBe('Identifiants incorrects.');
	});

	it('bloque une adresse après 10 échecs, même avec le bon mot de passe ensuite', () => {
		for (let i = 0; i < 10; i++) login('aubergiste', 'faux', '10.0.0.2');
		expect(login('aubergiste', 'motdepasse-solide', '10.0.0.2').error).toMatch(/Trop de tentatives/);
		// Une autre adresse n'est pas concernée.
		expect(login('aubergiste', 'motdepasse-solide', '10.0.0.3').admin).toBeDefined();
	});
});
