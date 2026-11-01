import { describe, expect, it } from 'vitest';
import { actions } from '../../routes/admin/compte/+page.server';
import { formData } from '../../test/helpers';
import {
	addLocalAdmin,
	checkSetupCode,
	consumeSetupCode,
	createLocalAdmin,
	hasLocalAdmin,
	hashPassword,
	listLocalAdmins,
	login,
	mustChangePasswordFirst,
	removeLocalAdmin,
	setLocalAdminPassword,
	setupCode
} from './local-admin';
import { db, schema } from './db';

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

	it('un admin en ajoute un autre, avec un mot de passe provisoire à changer', () => {
		const first = login('aubergiste', 'motdepasse-solide', '10.0.0.4').admin!;
		expect(addLocalAdmin('x', 'aubergiste')).toEqual({ error: expect.stringMatching(/3 à 32/) });
		expect(addLocalAdmin('aubergiste', 'aubergiste')).toEqual({ error: 'Cet identifiant est déjà pris.' });

		const added = addLocalAdmin('tavernier', 'aubergiste');
		if ('error' in added) throw new Error(added.error);
		expect(added.password.length).toBeGreaterThanOrEqual(20);
		expect(listLocalAdmins().find((a) => a.username === 'tavernier')).toMatchObject({ createdBy: 'aubergiste', mustChangePassword: true });
		// Seul le haché est stocké.
		expect(JSON.stringify(db().select().from(schema.localAdmins).all())).not.toContain(added.password);

		const second = login('tavernier', added.password, '10.0.0.4').admin!;
		expect(second.mustChangePassword).toBe(true);
		// Tant que le mot de passe est provisoire, tout ramène à Compte admin.
		expect(mustChangePasswordFirst(second, '/admin/candidatures')).toBe(true);
		expect(mustChangePasswordFirst(second, '/roster')).toBe(true);
		expect(mustChangePasswordFirst(second, '/admin/compte')).toBe(false);
		expect(mustChangePasswordFirst(second, '/admin/connexion')).toBe(false);
		expect(mustChangePasswordFirst({ mustChangePassword: false }, '/admin/candidatures')).toBe(false);
		setLocalAdminPassword(second.id, 'nouveau-mot-de-passe');
		expect(login('tavernier', 'nouveau-mot-de-passe', '10.0.0.4').admin?.mustChangePassword).toBe(false);

		// Jamais soi-même, jamais le dernier.
		expect(removeLocalAdmin(first.id, first)).toEqual({ error: 'Tu ne peux pas retirer ton propre compte.' });
		expect(removeLocalAdmin(second.id, first)).toMatchObject({ removed: { username: 'tavernier' } });
		expect(login('tavernier', 'nouveau-mot-de-passe', '10.0.0.4').error).toBe('Identifiants incorrects.');
		expect(removeLocalAdmin(first.id, { id: 999 })).toEqual({ error: 'Il faut garder au moins un admin.' });
	});

	it('la page Compte admin ajoute et retire un admin, réservée à l’admin local', async () => {
		const me = login('aubergiste', 'motdepasse-solide', '10.0.0.5').admin!;
		const locals = { user: null, candidate: null, admin: { id: me.id, username: me.username, mustChangePassword: false } } as unknown as App.Locals;
		const post = (body: Record<string, string>) => new Request('http://localhost/admin/compte', { method: 'POST', body: formData(body) });

		const added = (await actions.add({ locals, request: post({ username: 'cuisinier' }) } as never)) as { added: { username: string; password: string } };
		expect(added.added.username).toBe('cuisinier');
		const id = listLocalAdmins().find((a) => a.username === 'cuisinier')!.id;
		expect(await actions.remove({ locals, request: post({ id: String(id) }) } as never)).toEqual({ removed: 'cuisinier' });

		const officer = { user: { id: 'o', displayName: 'O', avatar: null, permission: 'officer' }, candidate: null, admin: null } as unknown as App.Locals;
		await expect(actions.add({ locals: officer, request: post({ username: 'intrus' }) } as never)).rejects.toMatchObject({ status: 303 });
		expect(listLocalAdmins().map((a) => a.username)).toEqual(['aubergiste']);
	});
});
