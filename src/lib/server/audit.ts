import { lt } from 'drizzle-orm';
import type { AuditAction } from '$lib/audit';
import { db, schema } from './db';

const RETENTION_DAYS = 365;

interface Target {
	label: string;
	url?: string;
}

/** Enregistre une action dans le journal, attribuée à l'admin local ou au joueur Discord de la session. */
export function audit(locals: App.Locals, action: AuditAction, target?: Target, details?: Record<string, unknown>) {
	const actor = locals.admin
		? { actorType: 'local-admin' as const, actorId: String(locals.admin.id), actorName: locals.admin.username }
		: locals.user
			? { actorType: 'discord' as const, actorId: locals.user.id, actorName: locals.user.displayName }
			: { actorType: 'system' as const, actorId: null, actorName: 'Système' };
	write({ ...actor, action, target, details });
}

/** Variante sans session : connexions de l'admin local (avec l'adresse IP). */
export function auditLogin(action: 'admin.login' | 'admin.login-failed' | 'admin.create', username: string, ip: string) {
	write({ actorType: action === 'admin.login-failed' ? 'system' : 'local-admin', actorId: null, actorName: username, action, ip });
}

function write(entry: {
	actorType: 'discord' | 'local-admin' | 'system';
	actorId: string | null;
	actorName: string;
	action: AuditAction;
	target?: Target;
	details?: Record<string, unknown>;
	ip?: string;
}) {
	const details = entry.details && Object.fromEntries(Object.entries(entry.details).filter(([, v]) => v !== undefined));
	db()
		.insert(schema.auditLog)
		.values({
			actorType: entry.actorType,
			actorId: entry.actorId,
			actorName: entry.actorName,
			action: entry.action,
			targetLabel: entry.target?.label ?? null,
			targetUrl: entry.target?.url ?? null,
			details: details && Object.keys(details).length ? details : null,
			ip: entry.ip ?? null
		})
		.run();
}

/** Supprime les entrées de plus de 12 mois. */
export function purgeAuditLog() {
	const limit = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
	return db().delete(schema.auditLog).where(lt(schema.auditLog.at, limit)).run().changes;
}

/** Différences entre deux objets plats, pour les détails d'une modification. */
export function diff(before: Record<string, unknown> | null | undefined, after: Record<string, unknown>, keys: string[]) {
	const changes: Record<string, { avant: unknown; apres: unknown }> = {};
	for (const key of keys) {
		const a = before?.[key] ?? null;
		const b = after[key] ?? null;
		if (JSON.stringify(a) !== JSON.stringify(b)) changes[key] = { avant: a, apres: b };
	}
	return changes;
}
