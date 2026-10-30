import { desc } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { asAdmin, asMember } from '../../test/helpers';
import { audit, auditLogin, diff, purgeAuditLog } from './audit';
import { db, schema } from './db';

const last = () => db().select().from(schema.auditLog).orderBy(desc(schema.auditLog.id)).get()!;

describe('journal d’audit', () => {
	it('attribue l’action à l’officier Discord ou à l’admin local', () => {
		audit(asMember('42', 'officer'), 'roster.add', { label: 'Thrall', url: '/persos/1' }, { roster: 'Raid' });
		expect(last()).toMatchObject({ actorType: 'discord', actorId: '42', action: 'roster.add', targetLabel: 'Thrall', details: { roster: 'Raid' } });
		audit(asAdmin(), 'guild.update');
		expect(last()).toMatchObject({ actorType: 'local-admin', actorName: 'admin', details: null });
	});

	it('n’enregistre pas les détails vides ou indéfinis', () => {
		audit(asAdmin(), 'discord.update', undefined, { application: undefined, bot: 'retiré' });
		expect(last().details).toEqual({ bot: 'retiré' });
		audit(asAdmin(), 'discord.update', undefined, { application: undefined });
		expect(last().details).toBeNull();
	});

	it('garde l’adresse IP pour les connexions admin', () => {
		auditLogin('admin.login-failed', 'pirate', '203.0.113.7');
		expect(last()).toMatchObject({ action: 'admin.login-failed', actorName: 'pirate', ip: '203.0.113.7' });
	});

	it('diff ne garde que les champs modifiés', () => {
		expect(diff({ role: 'tank', level: 60, pve: null }, { role: 'melee', level: 60, pve: 'casual' }, ['role', 'level', 'pve'])).toEqual({
			role: { avant: 'tank', apres: 'melee' },
			pve: { avant: null, apres: 'casual' }
		});
	});

	it('purge les entrées de plus de 12 mois', () => {
		const before = db().select().from(schema.auditLog).all().length;
		db().insert(schema.auditLog).values({ actorType: 'system', actorName: 'Système', action: 'guild.update', at: new Date(Date.now() - 400 * 86_400_000) }).run();
		expect(purgeAuditLog()).toBe(1);
		expect(db().select().from(schema.auditLog).all()).toHaveLength(before);
	});
});
