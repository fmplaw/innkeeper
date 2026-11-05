import { eq } from 'drizzle-orm';
import { db, schema } from '../db';
import { PROFESSIONS } from '$lib/game/forever';
import { getDemoEvents, setDemoEvents } from '../settings';

// Mode démo : le site ne parle jamais au vrai Discord ni au vrai Raid-Helper. Cette simulation
// remplace `fetch` et répond comme eux, à partir de la base de démo ; tout autre appel vers
// l'extérieur est refusé.

export interface DemoSignUp {
	id: number;
	userId: string;
	name: string;
	className: string;
	specName?: string;
	status: string;
	position: number;
	entryTime: number;
}

export interface DemoEvent {
	id: string;
	serverId: string;
	title: string;
	description: string;
	leaderName: string;
	leaderId: string;
	channelId: string;
	channelName: string;
	startTime: number;
	endTime: number;
	advancedSettings: Record<string, unknown>;
	signUps: DemoSignUp[];
	activity: string | null;
	instance: string | null;
}

const json = (body: unknown, status = 200) => Response.json(body, { status });
const noContent = () => new Response(null, { status: 204 });
const notFound = (code = 10007) => json({ message: 'Unknown', code }, 404);

export function installDemoFetch(channels: { id: string; name: string }[], guild: { id: string; name: string }) {
	const realFetch = globalThis.fetch;
	globalThis.fetch = async (input, init = {}) => {
		const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
		if (url.hostname === 'oauth.battle.net') return json({ access_token: 'demo', expires_in: 86400 });
		if (url.hostname.endsWith('.api.blizzard.com')) return battlenet(decodeURIComponent(url.pathname));
		const method = (init.method ?? 'GET').toUpperCase();
		const body = typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
		if (url.hostname === 'discord.com') return discord(url.pathname.replace(/^\/api\/v10/, ''), method, body, channels, guild);
		if (url.hostname === 'raid-helper.dev') return raidHelper(url.pathname.replace(/^\/api\/v4/, ''), method, body);
		// Le site lui-même (en local) peut s'appeler ; rien d'autre ne sort.
		if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return realFetch(input, init);
		return json({ error: 'Mode démo : appel extérieur bloqué' }, 503);
	};
}

function member(id: string) {
	const user = db().select().from(schema.users).where(eq(schema.users.discordId, id)).get();
	if (!user?.inGuild) return null;
	return { user: { id: user.discordId, username: user.discordUsername, bot: false }, nick: user.displayName, roles: user.roles, joined_at: (user.joinedAt ?? user.createdAt)?.toISOString() };
}

function discord(path: string, method: string, body: Record<string, unknown>, channels: { id: string; name: string }[], guild: { id: string; name: string }) {
	let m: RegExpMatchArray | null;
	if ((m = path.match(/^\/guilds\/\d+\/members\/(\d+)\/roles\/(\d+)$/))) {
		const user = db().select().from(schema.users).where(eq(schema.users.discordId, m[1])).get();
		if (!user) return notFound();
		const roles = method === 'DELETE' ? user.roles.filter((r) => r !== m![2]) : [...new Set([...user.roles, m[2]])];
		db().update(schema.users).set({ roles }).where(eq(schema.users.discordId, m[1])).run();
		return noContent();
	}
	if ((m = path.match(/^\/guilds\/\d+\/members\/(\d+)$/))) {
		if (method === 'PUT') {
			// Entrée d'une recrue sur le serveur.
			db().update(schema.users).set({ inGuild: true, roles: (body.roles as string[]) ?? [] }).where(eq(schema.users.discordId, m[1])).run();
			return json(member(m[1]), 201);
		}
		return member(m[1]) ? json(member(m[1])) : notFound();
	}
	if (path.match(/^\/guilds\/\d+\/members$/)) {
		const users = db().select().from(schema.users).all().filter((u) => u.inGuild);
		return json(users.map((u) => member(u.discordId)));
	}
	if (path.match(/^\/guilds\/\d+\/roles$/)) {
		return json(db().select().from(schema.discordRoles).all().map((r) => ({ id: r.id, name: r.name, position: r.position ?? 0, managed: false })));
	}
	if (path.match(/^\/guilds\/\d+\/channels$/)) return json(channels.map((c, position) => ({ ...c, type: 0, position })));
	if (path.match(/^\/guilds\/\d+$/)) return json(guild);
	if (path.match(/^\/channels\/\d+\/invites$/)) return json({ code: 'demo' });
	if (path.match(/^\/channels\/\d+\/messages$/)) return method === 'POST' ? json({ id: String(Date.now()) }) : json([]);
	if (path === '/users/@me/channels') return json({ id: '900000000000000099' });
	return notFound();
}

const events = () => getDemoEvents<DemoEvent>();
const save = (list: DemoEvent[]) => setDemoEvents(list);
const leaderName = (id: string) => db().select().from(schema.users).where(eq(schema.users.discordId, id)).get()?.displayName ?? 'Inconnu';

function raidHelper(path: string, method: string, body: Record<string, unknown>) {
	let m: RegExpMatchArray | null;
	const list = events();
	if (path.match(/^\/servers\/\d+\/events$/)) return json({ postedEvents: list });
	if ((m = path.match(/^\/servers\/(\d+)\/channels\/(\d+)\/event$/)) && method === 'POST') {
		// La date en texte n'est pas lue : le site corrige ensuite avec l'heure exacte (PATCH).
		const channel = { id: m[2], name: m[2] };
		const event: DemoEvent = {
			id: String(920000000000000000n + BigInt(Date.now())),
			serverId: m[1],
			title: String(body.title ?? 'Sans titre'),
			description: String(body.description ?? ''),
			leaderId: String(body.leaderId ?? ''),
			leaderName: leaderName(String(body.leaderId ?? '')),
			channelId: channel.id,
			channelName: channel.name,
			startTime: 1,
			endTime: 1,
			advancedSettings: (body.advancedSettings as Record<string, unknown>) ?? {},
			signUps: [],
			activity: null,
			instance: null
		};
		save([...list, event]);
		return json({ status: 'Event created', event });
	}
	if ((m = path.match(/^\/events\/(\d+)\/signups(?:\/(\d+))?$/))) {
		const event = list.find((e) => e.id === m![1]);
		if (!event) return json({ error: 'not found' }, 404);
		if (method === 'POST') {
			const id = Math.max(0, ...event.signUps.map((s) => s.id)) + 1;
			event.signUps.push({ id, userId: String(body.userId), name: String(body.name), className: String(body.className), specName: body.specName as string | undefined, status: 'primary', position: id, entryTime: Math.floor(Date.now() / 1000) });
		} else if (method === 'PATCH') {
			const signUp = event.signUps.find((s) => s.id === Number(m![2]));
			if (signUp) Object.assign(signUp, body);
		} else if (method === 'DELETE') {
			event.signUps = event.signUps.filter((s) => s.id !== Number(m![2]));
		}
		save(list);
		return json({ status: 'Event was edited' });
	}
	if ((m = path.match(/^\/events\/(\d+)$/))) {
		const event = list.find((e) => e.id === m![1]);
		if (!event) return json({ error: 'not found' }, 404);
		if (method === 'DELETE') {
			save(list.filter((e) => e !== event));
			return json({ status: 'Event deleted' });
		}
		if (method === 'PATCH') {
			const { advancedSettings, ...rest } = body;
			Object.assign(event, rest);
			if (advancedSettings) event.advancedSettings = { ...event.advancedSettings, ...(advancedSettings as Record<string, unknown>) };
			if (rest.leaderId) event.leaderName = leaderName(String(rest.leaderId));
			if (rest.startTime) event.endTime = Number(rest.startTime) + 9000;
			save(list);
			return json({ status: 'Event edited', event });
		}
		return json(event);
	}
	return json({ error: 'not found' }, 404);
}

// Battle.net simulé : l'Armurerie connaît les persos de la démo (sauf les candidats), un peu
// plus avancés que leur fiche, comme s'ils avaient joué depuis.
const CLASS_IDS: Record<string, number> = { warrior: 1, paladin: 2, hunter: 3, rogue: 4, priest: 5, shaman: 7, mage: 8, warlock: 9, druid: 11 };
const RACE_NUMS: Record<string, number> = { human: 1, orc: 2, dwarf: 3, 'night-elf': 4, undead: 5, tauren: 6, gnome: 7, troll: 8 };
// Hors de la guilde : le perso d'Aelith (candidate) existe déjà en jeu ; celui de Gorvan, non.
const OUTSIDE = [{ id: -1, name: 'Aelith', surname: 'Chantorée', race: 'night-elf', class: 'priest', level: 23, professions: [{ id: 'first-aid', level: 90 }] }];
const slug = (c: { name: string; surname: string | null }) => [c.name, c.surname].filter(Boolean).join('-').toLocaleLowerCase('fr').replace(/\s+/g, '-');

function battlenet(path: string) {
	const chars = db()
		.select({ c: schema.characters })
		.from(schema.characters)
		.innerJoin(schema.users, eq(schema.users.discordId, schema.characters.userId))
		.where(eq(schema.users.inGuild, true))
		.all()
		.map((r) => r.c);
	if (/^\/data\/wow\/guild\/[^/]+\/roster$/.test(path))
		return json({
			members: chars.map((c, i) => ({
				character: { name: c.name, surname: c.surname, slug: slug(c), level: Math.min(c.level + (i % 3), 60), playable_class: { id: CLASS_IDS[c.class] ?? 1 } },
				rank: c.isMain ? i % 4 : 4
			}))
		});
	const m = path.match(/^\/profile\/wow\/character\/([^/]+)(\/professions)?$/);
	const inGuild = m && chars.find((x) => slug(x) === m[1]);
	const c = inGuild ?? (m && OUTSIDE.find((x) => slug(x) === m[1]));
	if (!c) return json({ code: 404 }, 404);
	if (!m![2])
		return json({
			name: c.name,
			surname: c.surname,
			level: c.level,
			character_class: { id: CLASS_IDS[c.class] ?? 1 },
			race: { id: RACE_NUMS[c.race ?? ''] ?? 1 },
			...(inGuild && { guild: { name: 'Les Gardiens de l’Aube' } }),
			last_login_timestamp: Date.now() - (Math.abs(c.id) % 5) * 7 * 3_600_000
		});
	const list = c.professions.map((p) => ({ profession: { id: PROFESSIONS.find((x) => x.id === p.id)?.skillLine ?? 0 }, tiers: [{ skill_points: (p.level ?? 1) + 3 }] }));
	return json({ primaries: list.filter((_, i) => !PROFESSIONS.find((x) => x.id === c.professions[i].id)?.secondary), secondaries: list.filter((_, i) => PROFESSIONS.find((x) => x.id === c.professions[i].id)?.secondary) });
}
