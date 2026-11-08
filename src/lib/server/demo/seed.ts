import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db';
import type { KnownRecipes, ProfessionEntry } from '../db/schema';
import { createLocalAdmin } from '../local-admin';
import {
	guildSchema,
	recruitmentSchema,
	setAccess,
	setBattlenet,
	setCharter,
	setDemoMarker,
	setDiscord,
	setGameImport,
	setGameRoster,
	setGuild,
	setRaidHelper,
	setRecruitment
} from '../settings';
import type { DemoEvent } from './mock';

// Guilde fictive du mode démo : « Les Gardiens de l'Aube », Alliance. Toutes les dates sont
// relatives au moment du remplissage, pour que les sorties restent à venir.

export const DEMO_GUILD_ID = '900000000000000001';
export const DEMO_CHANNELS = {
	official: { id: '900000000000000010', name: 'sorties-officielles' },
	members: { id: '900000000000000011', name: 'sorties-membres' },
	officers: { id: '900000000000000012', name: 'officiers' },
	welcome: { id: '900000000000000013', name: 'bienvenue' }
};
export const DEMO_ROLES = { officer: '700000000000000001', member: '700000000000000002', newcomer: '700000000000000003' };

const DAY = 86_400_000;
const QUESTIONS = [
	'Quelle est ton expérience de World of Warcraft ?',
	'Quelles sont tes disponibilités pour jouer ?',
	'Qu’est-ce qui te motive à rejoindre la guilde ?',
	'Comment as-tu connu la guilde ?'
];

type Char = [name: string, surname: string, race: string, cls: string, spec: string, role: 'tank' | 'healer' | 'melee' | 'ranged', level: number, professions: [string, number][]];
const { officer: R_OFF, member: R_MEM, newcomer: R_NEW } = DEMO_ROLES;

// Recettes exportées par l'addon (identifiants de sorts du Classic), pour la page Artisans.
const R = (id: number, name: string, category?: string) => ({ id, name, ...(category && { category }) });
const DEMO_RECIPES: Record<string, KnownRecipes[]> = {
	Aldren: [{ profession: 'blacksmithing', skill: 182, recipes: [R(2660, 'Pierre à aiguiser brute'), R(2663, 'Brassards en cuivre')] }],
	Ysolde: [{ profession: 'alchemy', skill: 168, recipes: [R(2330, 'Potion de soins mineure'), R(2329, 'Élixir de force du lion')] }],
	Lysandre: [
		{ profession: 'tailoring', skill: 170, recipes: [R(2963, 'Rouleau d’étoffe de lin'), R(2387, 'Cape en lin')] },
		// Liste longue : montre le cadre qui défile et le filtre.
		{
			profession: 'enchanting',
			skill: 158,
			recipes: [
			R(7418, 'Enchantement de brassards (Endurance médiocre)'), R(7420, 'Enchantement de plastron (Endurance médiocre)'), R(7421, 'Bâtonnet runique en cuivre'), R(7426, 'Ench. de plastron (Absorption mineure)'), R(7428, 'Ench. de bracelets (Déviation mineure)'), R(7443, 'Enchantement de plastron (Intelligence mineure)'), R(7454, 'Ench. de cape (Résistance mineure)'), R(7457, 'Ench. de bracelets (Endurance mineure)'), R(7745, 'Ench. d’arme 2M (impact mineur)'), R(7748, 'Enchantement de plastron (Endurance inférieure)'),
			R(7766, 'Ench. de bracelets (Esprit mineur)'), R(7771, 'Ench. de cape (Protection mineure)'), R(7776, 'Enchantement de plastron (Intelligence inférieure)'), R(7779, 'Ench. de bracelets (Agilité mineure)'), R(7782, 'Ench. de bracelets (Force mineure)'), R(7786, 'Ench. d’arme (Tueur de bête mineur)'), R(7788, 'Ench. d’arme (Frappe mineure)'), R(7793, 'Ench. d’arme 2M (Intelligence inférieure)'), R(13378, 'Ench. de bouclier (Endurance mineure)'), R(13380, 'Ench. d’arme 2M (Esprit inférieur)'),
			R(13419, 'Ench. de cape (Agilité mineure)'), R(13421, 'Ench. de cape (Protection inférieure)'), R(13464, 'Ench. de bouclier (Protection inférieure)'), R(13485, 'Ench. de bouclier (Esprit inférieur)'), R(13501, 'Ench. de bracelets (Endurance inférieure)'), R(13503, 'Ench. d’arme (Frappe inférieure)'), R(13522, 'Ench. de cape (Résistance à l’Ombre inf.)'), R(13536, 'Ench. de bracelets (Force inférieure)'), R(13538, 'Ench. de plastron (Absorption inférieure)'), R(13607, 'Enchantement de plastron (Intelligence)'),
			R(13612, 'Ench. de gants (Minage)'), R(13617, 'Ench. de gants (Herboristerie)'), R(13620, 'Ench. de gants (Pêche)'), R(13622, 'Ench. de bracelets (Intelligence inférieure)'), R(13626, 'Ench. de plastron (Caract. mineures)'), R(13628, 'Bâtonnet runique en or')
			]
		}
	],
	Eodric: [{ profession: 'leatherworking', skill: 171, recipes: [R(2881, 'Cuir léger'), R(2149, 'Bottes en cuir cousues main')] }],
	Brunhild: [
		// Exportées par l'addon 0.17 : rangées par sous-section, comme dans la fenêtre du métier.
		{ profession: 'first-aid', skill: 150, recipes: [R(3275, 'Bandage en lin', 'Bandages'), R(3276, 'Bandage épais en lin', 'Bandages'), R(3277, 'Bandage en laine', 'Bandages'), R(7934, 'Anti-venin', 'Remèdes')] },
		{ profession: 'cooking', skill: 120, recipes: [R(2538, 'Viande de loup grillée', 'Plats courants'), R(8604, 'Œufs aux herbes', 'Nourriture modifiant l’Endurance'), R(2540, 'Viande de sanglier rôtie', 'Nourriture modifiant la Force')] }
	]
};

// [pseudo, rôles Discord, persos (le premier est le main)]
const PLAYERS: [string, string[], Char[]][] = [
	['Aldren', [R_OFF, R_MEM], [['Aldren', 'Bouclier-d’Aube', 'human', 'paladin', 'protection', 'tank', 34, [['blacksmithing', 182], ['mining', 190]]], ['Mirabel', 'Bouclier-d’Aube', 'gnome', 'mage', 'frost', 'ranged', 17, [['tailoring', 95]]]]],
	['Ysolde', [R_OFF, R_MEM], [['Ysolde', 'Clairval', 'night-elf', 'priest', 'holy', 'healer', 33, [['herbalism', 175], ['alchemy', 168]]]]],
	['Thorgrim', [R_MEM], [['Thorgrim', 'Barbe-de-Fer', 'dwarf', 'warrior', 'fury', 'melee', 31, [['mining', 160], ['engineering', 152]]]]],
	['Lysandre', [R_MEM], [['Lysandre', 'Valombre', 'human', 'mage', 'frost', 'ranged', 32, [['tailoring', 170], ['enchanting', 158]]]]],
	['Pipwick', [R_MEM], [['Pipwick', 'Rouage', 'gnome', 'warlock', 'affliction', 'ranged', 29, [['tailoring', 140], ['enchanting', 131]]]]],
	['Veyra', [R_MEM], [['Veyra', 'Feuillelune', 'night-elf', 'druid', 'restoration', 'healer', 30, [['herbalism', 165], ['alchemy', 150]]]]],
	['Eodric', [R_MEM], [['Eodric', 'Mainfine', 'human', 'rogue', 'combat', 'melee', 33, [['leatherworking', 171], ['skinning', 180]]]]],
	['Dorna', [R_MEM], [['Dorna', 'Pierrefeu', 'dwarf', 'hunter', 'marksmanship', 'ranged', 28, [['skinning', 150], ['leatherworking', 138]]]]],
	['Halvard', [R_MEM], [['Halvard', 'Cendrelame', 'human', 'warrior', 'protection', 'tank', 30, [['blacksmithing', 145], ['mining', 155]]]]],
	['Brunhild', [R_MEM], [['Brunhild', 'Marteau-Clair', 'dwarf', 'priest', 'discipline', 'healer', 27, [['first-aid', 150], ['cooking', 120]]]]],
	['Fennick', [R_MEM], [['Fennick', 'Étincelle', 'gnome', 'mage', 'fire', 'ranged', 26, [['engineering', 130], ['mining', 140]]]]],
	['Kerrin', [R_MEM], [['Kerrin', 'Sentebois', 'night-elf', 'hunter', 'survival', 'ranged', 25, [['herbalism', 120]]]]],
	['Tamsin', [R_NEW], [['Tamsin', 'Noirsceau', 'human', 'warlock', 'demonology', 'ranged', 19, [['tailoring', 80]]]]],
	['Quillon', [R_NEW], [['Quillon', 'Furtif', 'gnome', 'rogue', 'subtlety', 'melee', 16, []]]],
	// Départs : Corwen a rejoint une autre guilde (Admin → Anciens membres), Maelis n'est plus dans le registre.
	['Corwen', [R_MEM], [['Corwen', 'Brisevent', 'human', 'hunter', 'beast-mastery', 'ranged', 30, [['skinning', 160], ['leatherworking', 150]]]]],
	['Maelis', [R_MEM], [['Maelis', 'Ombrelune', 'night-elf', 'rogue', 'assassination', 'melee', 24, [['herbalism', 110]]]]]
];

// Candidats (pas encore sur le serveur) : [pseudo, perso visé, réponses, avis des officiers]
const APPLICANTS: [string, Char, string[], [string, 1 | -1][]][] = [
	[
		'Aelith',
		['Aelith', 'Chantorée', 'night-elf', 'priest', 'holy', 'healer', 22, []],
		["Joueuse depuis Vanilla, j'ai soigné en raid jusqu'à Wrath.", 'Tous les soirs sauf le jeudi, et le dimanche après-midi.', 'Une guilde posée pour découvrir Forever sans pression.', 'Par le Discord francophone de Forever.'],
		[['Ysolde', 1], ['Aldren', 1]]
	],
	[
		'Gorvan',
		['Gorvan', 'Fendroc', 'dwarf', 'warrior', 'protection', 'tank', 18, []],
		['Je reprends WoW après plusieurs années, surtout en tank.', 'Mercredi et dimanche soir, parfois en semaine.', "J'aime l'ambiance des raids organisés.", 'Un ami de Thorgrim.'],
		[['Aldren', 1]]
	]
];

/** Identifiant Discord fictif d'un joueur de la démo, d'après sa place dans la liste. */
export const demoUserId = (pseudo: string) => {
	const i = PLAYERS.findIndex(([p]) => p === pseudo);
	if (i >= 0) return String(800000000000000001n + BigInt(i));
	const j = APPLICANTS.findIndex(([p]) => p === pseudo);
	if (j >= 0) return String(800000000000000101n + BigInt(j));
	throw new Error(`Joueur de démo inconnu : ${pseudo}`);
};

const SPECS: Record<string, string> = {
	'paladin:protection': 'Protection1',
	'priest:holy': 'Holy',
	'warrior:fury': 'Fury',
	'mage:frost': 'Frost',
	'warlock:affliction': 'Affliction',
	'druid:restoration': 'Restoration',
	'rogue:combat': 'Combat',
	'hunter:marksmanship': 'Marksmanship',
	'warrior:protection': 'Protection',
	'priest:discipline': 'Discipline',
	'mage:fire': 'Fire',
	'hunter:survival': 'Survival',
	'warlock:demonology': 'Demonology',
	'rogue:subtlety': 'Subtlety',
	'hunter:beast-mastery': 'Beastmastery',
	'rogue:assassination': 'Assassination'
};
const RH_ROLE = { tank: 'Tank', melee: 'Melee', ranged: 'Ranged', healer: 'Healer' };

/** Remplit une base vide avec la guilde fictive ; renvoie les sorties simulées de Raid-Helper. */
export function seedDemo(now = Date.now()): DemoEvent[] {
	setGuild(
		guildSchema.parse({
			name: 'Les Gardiens de l’Aube',
			faction: 'alliance',
			serverType: 'pve',
			tagline: 'Guilde PvE détendue, raids le mercredi et le dimanche',
			description:
				"Nous sommes une guilde francophone d'adultes qui jouent pour le plaisir de jouer ensemble : donjons en soirée, quêtes de groupe, et un roster de raid qui se prépare pour l'ouverture de Barrow Deeps.\n\nOn privilégie la bonne humeur et la ponctualité aux performances.",
			ambitions: ['pve', 'casual'],
			schedule: 'Raids : mercredi et dimanche, 21 h – 23 h 30\nDonjons et quêtes : tous les soirs, à la demande',
			recruitment: { open: true, classes: ['priest', 'shaman', 'warrior'], roles: ['healer', 'tank'], text: 'On cherche surtout des soigneurs pour compléter le roster de raid.' },
			accentColor: '#4f8fd6',
			timezone: 'Europe/Paris',
			publicStats: true
		})
	);
	// Valeurs fictives : la simulation répond à la place de Discord et de Raid-Helper.
	setDiscord({ clientId: '900000000000000100', clientSecret: 'demo-client-secret', guildId: DEMO_GUILD_ID, botToken: 'demo-bot-token' });
	setAccess({ mode: 'mapped-roles' });
	setRaidHelper({ apiKey: 'demo-raidhelper-key', defaultChannelId: DEMO_CHANNELS.official.id, memberChannelId: DEMO_CHANNELS.members.id, discordEvents: true });
	setRecruitment(
		recruitmentSchema.parse({
			arrivalRoleId: R_NEW,
			notifyChannelId: DEMO_CHANNELS.officers.id,
			mentionRoleId: R_OFF,
			inviteChannelId: DEMO_CHANNELS.welcome.id,
			reapplyDays: 30,
			reviewDays: 90,
			questions: QUESTIONS
		})
	);
	// Registre du dernier envoi d'InnkeeperSync : tous les persos sauf Quillon (pas encore dans la
	// guilde en jeu), plus deux membres sans fiche sur le site.
	const gameRoster = [
		...PLAYERS.flatMap(([, roles, chars]) =>
			chars
				.filter(([name]) => name !== 'Quillon')
				.map(([name, surname, , cls, , , level]) => ({ name: `${name} ${surname}`, level, class: cls.toUpperCase(), rank: roles.includes(R_OFF) ? 'Officier' : roles.includes(R_NEW) ? 'Recrue' : 'Membre' }))
		),
		{ name: 'Rowena Brisevent', level: 22, class: 'MAGE', rank: 'Recrue' },
		{ name: 'Garrick Tonnelier', level: 18, class: 'WARRIOR', rank: 'Recrue' }
	];
	const synced = { appliedAt: Math.floor((now - 2 * 3_600_000) / 1000), exportedAt: Math.floor((now - 3 * 3_600_000) / 1000) };
	setGameImport({ ...synced, rosterSize: gameRoster.length });
	setGameRoster({ ...synced, by: 'Aldren', via: 'sync', roster: gameRoster });
	// Battle.net simulé (voir mock.ts) : la vérification des persos dans l'Armurerie marche en démo.
	setBattlenet({ clientId: 'demo'.repeat(8), clientSecret: 'demo'.repeat(8), region: 'eu', guildSlug: 'les-gardiens-de-laube' });
	setCharter({ text: CHARTER, updatedAt: now, updatedBy: 'Aldren' });

	for (const [id, name, permission, position] of [
		[R_OFF, 'Officier', 'officer', 3],
		[R_MEM, 'Membre', 'member', 2],
		[R_NEW, 'Nouvelle recrue', 'member', 1]
	] as const)
		db().insert(schema.discordRoles).values({ id, name, permission, position }).onConflictDoNothing().run();

	// Admin local : on y entre par le choix de profil, son mot de passe ne sert jamais.
	createLocalAdmin('admin-demo', randomBytes(24).toString('base64url'));

	const professions = (list: [string, number][]): ProfessionEntry[] => list.map(([id, level]) => ({ id, level }));
	PLAYERS.forEach(([pseudo, roles, chars], i) => {
		const userId = demoUserId(pseudo);
		db()
			.insert(schema.users)
			.values({
				discordId: userId,
				discordUsername: pseudo.toLowerCase(),
				displayName: pseudo,
				roles,
				inGuild: true,
				rolesCheckedAt: new Date(now),
				createdAt: new Date(now - (40 - i) * DAY),
				lastLogin: new Date(now - (i % 5) * DAY),
				joinedAt: new Date(now - (40 - i) * DAY)
			})
			.run();
		chars.forEach(([name, surname, race, cls, spec, role, level, profs], k) => {
			db()
				.insert(schema.characters)
				.values({
					userId,
					name,
					surname,
					race,
					class: cls,
					spec,
					role,
					isMain: k === 0,
					level,
					professions: professions(profs),
					pve: role === 'healer' || role === 'tank' ? 'competitive' : 'casual',
					pvp: i % 3 === 0 ? 'casual' : null,
					knownRecipes: DEMO_RECIPES[name] ?? null,
					lastOnlineAt: new Date(now - (i % 4) * DAY - 3_600_000),
					gameSyncedAt: new Date(now - 2 * 3_600_000)
				})
				.run();
		});
	});

	db()
		.update(schema.users)
		.set({
			roles: [],
			leftAt: new Date(now - 2 * DAY),
			leftBy: 'Battle.net',
			leftForGuild: 'Les Lames du Nord',
			leftDiscord: 'Rôles retirés par le bot : Membre.'
		})
		.where(eq(schema.users.discordId, demoUserId('Corwen')))
		.run();
	db().update(schema.users).set({ absentSince: new Date(now - 3 * 3_600_000) }).where(eq(schema.users.discordId, demoUserId('Maelis'))).run();

	// Commandes de craft : une ouverte (Brunhild connaît la recette), une prise, une livrée.
	const order = (requester: string, recipeId: number, recipeName: string, profession: string, extra: Partial<typeof schema.craftOrders.$inferInsert>) =>
		db()
			.insert(schema.craftOrders)
			.values({ requesterId: demoUserId(requester), recipeId, recipeName, profession, ...extra })
			.run();
	order('Thorgrim', 3277, 'Bandage en laine', 'first-aid', { quantity: 20, materials: true, comment: 'Pour le raid de jeudi, je t’envoie l’étoffe.', createdAt: new Date(now - 5 * 3_600_000) });
	order('Pipwick', 2330, 'Potion de soins mineure', 'alchemy', { quantity: 10, materials: false, comment: 'Je paie 50 pa.', status: 'taken', takenBy: demoUserId('Ysolde'), createdAt: new Date(now - DAY) });
	order('Lysandre', 2663, 'Brassards en cuivre', 'blacksmithing', { quantity: 1, materials: true, status: 'delivered', takenBy: demoUserId('Aldren'), createdAt: new Date(now - 3 * DAY), closedAt: new Date(now - 2 * DAY) });

	APPLICANTS.forEach(([pseudo, [name, surname, race, cls, spec, role, level], answers, votes], i) => {
		const userId = demoUserId(pseudo);
		db().insert(schema.users).values({ discordId: userId, discordUsername: pseudo.toLowerCase(), displayName: pseudo, roles: [], inGuild: false }).run();
		const app = db()
			.insert(schema.applications)
			.values({
				userId,
				character: { name, surname, race, class: cls, spec, role, level, professions: [], pve: 'competitive', pvp: null },
				answers: QUESTIONS.map((question, k) => ({ question, answer: answers[k] })),
				charterAcceptedAt: new Date(now - (i + 1) * DAY),
				createdAt: new Date(now - (i + 1) * DAY)
			})
			.returning()
			.get();
		for (const [voter, value] of votes) db().insert(schema.applicationVotes).values({ applicationId: app.id, voterId: demoUserId(voter), voterName: voter, value }).run();
	});

	const roster = db().insert(schema.rosters).values({ name: 'Roster Barrow Deeps', description: 'Groupe de 10 pour l’ouverture du raid', visibility: 'members' }).returning().get();
	const mains = db().select().from(schema.characters).all().filter((c) => c.isMain);
	for (const c of [...mains].sort((a, b) => b.level - a.level).slice(0, 10)) db().insert(schema.rosterMembers).values({ rosterId: roster.id, characterId: c.id }).run();

	for (const [name, importance, usage, description, curseforgeUrl, otherUrl, roles] of ADDONS)
		db().insert(schema.addons).values({ name, importance, usage, description, curseforgeUrl, otherUrl, roles }).run();

	const events = demoEvents(now, mains);
	for (const e of events)
		db()
			.insert(schema.outings)
			.values({ eventId: e.id, kind: e.channelId === DEMO_CHANNELS.official.id ? 'official' : 'member', createdBy: e.leaderId, title: e.title, activity: e.activity, instanceId: e.instance, startTime: new Date(e.startTime * 1000) })
			.run();

	setDemoMarker();
	return events;
}

// Sorties Raid-Helper simulées : dans 1, 2, 3 et 41 jours, à heure fixe.
function demoEvents(now: number, mains: { userId: string; name: string; class: string; spec: string | null; role: keyof typeof RH_ROLE }[]): DemoEvent[] {
	const at = (days: number, hour: number) => {
		const d = new Date(now + days * DAY);
		d.setUTCHours(hour - 1, 0, 0, 0);
		return Math.floor(d.getTime() / 1000);
	};
	const signUps = (list: [string, string?][]) =>
		list.map(([pseudo, status], k) => {
			const c = mains.find((m) => m.userId === demoUserId(pseudo))!;
			return {
				id: k + 1,
				userId: c.userId,
				name: c.name,
				className: status ?? RH_ROLE[c.role],
				specName: status && status !== 'Bench' ? undefined : SPECS[`${c.class}:${c.spec}`],
				status: 'primary',
				position: k + 1,
				entryTime: Math.floor(now / 1000) - (20 - k) * 3600
			};
		});
	const event = (id: string, title: string, official: boolean, leader: string, startTime: number, description: string, activity: string, instance: string | null, limit: number, list: [string, string?][]): DemoEvent => {
		const channel = official ? DEMO_CHANNELS.official : DEMO_CHANNELS.members;
		return {
			id,
			serverId: DEMO_GUILD_ID,
			title,
			description,
			leaderName: leader,
			leaderId: demoUserId(leader),
			channelId: channel.id,
			channelName: channel.name,
			startTime,
			endTime: startTime + 9000,
			advancedSettings: { limit, duration: 150 },
			signUps: signUps(list),
			activity,
			instance
		};
	};
	return [
		event('910000000000000001', 'Soirée donjon : Les Mortemines', true, 'Aldren', at(1, 21), 'Run complet avec la quête des Défias. Prévoyez potions et nourriture.', 'dungeon', 'deadmines', 5, [
			['Aldren'],
			['Ysolde'],
			['Thorgrim'],
			['Lysandre'],
			['Eodric'],
			['Dorna', 'Bench'],
			['Pipwick', 'Tentative']
		]),
		event('910000000000000002', 'Raid : Barrow Deeps (ouverture)', true, 'Ysolde', at(41, 21), 'Première soirée sur le nouveau raid. Composition indicative, on ajuste selon les présents.', 'raid', 'barrow-deeps', 10, [
			['Aldren'],
			['Halvard'],
			['Ysolde'],
			['Veyra'],
			['Brunhild'],
			['Thorgrim'],
			['Eodric'],
			['Lysandre'],
			['Pipwick'],
			['Dorna'],
			['Fennick', 'Bench'],
			['Kerrin', 'Late'],
			['Tamsin', 'Absence']
		]),
		event('910000000000000003', 'Quêtes de groupe aux Carmines', false, 'Pipwick', at(2, 20), 'Les quêtes élites de la région, tranquille.', 'quests', null, 5, [['Pipwick'], ['Fennick'], ['Tamsin'], ['Quillon']]),
		event('910000000000000004', 'Farm cuir et herbes', false, 'Veyra', at(3, 18), 'Une heure de récolte en duo ou trio.', 'farm', null, 0, [['Veyra'], ['Kerrin']])
	];
}

const ADDONS: [string, 'essential' | 'raid' | 'recommended' | 'useful', 'guild' | 'dungeons' | 'quests' | 'professions' | 'pvp' | 'interface', string, string | null, string | null, ('tank' | 'healer')[]][] = [
	['Innkeeper Sync', 'essential', 'guild', 'Exporte ton registre de guilde, tes métiers et tes recettes pour le site de la guilde.', 'https://www.curseforge.com/projects/1777916', '/addon/InnkeeperSync.zip', []],
	['Deadly Boss Mods', 'raid', 'dungeons', 'Alertes de boss : toute la guilde utilise le même, pour entendre les mêmes annonces.', 'https://www.curseforge.com/wow/addons/deadly-boss-mods', null, []],
	['Questie', 'recommended', 'quests', 'Toutes les quêtes disponibles sur la carte, avec les maîtres de métier et les boîtes aux lettres.', 'https://www.curseforge.com/wow/addons/questie', null, []],
	['Auctionator', 'recommended', 'professions', 'Hôtel des ventes plus simple : prix dans les infobulles, mise en vente en un clic.', 'https://www.curseforge.com/wow/addons/auctionator', null, []],
	['EasyMarks', 'recommended', 'dungeons', 'Marquer les cibles en un clic.', null, null, ['tank']],
	['Details!', 'useful', 'interface', 'Le compteur de dégâts est intégré au jeu ; Details! l’habille autrement.', 'https://www.curseforge.com/wow/addons/details', null, []]
];

const CHARTER = `Bienvenue chez les Gardiens de l'Aube ! Quelques règles simples pour que chacun s'y sente bien, en jeu comme sur Discord.

# Nos valeurs

## Respect
Pour chacun, en jeu comme sur Discord. Pas d'insultes, pas de moqueries sur le niveau ou l'équipement.

## Aucune obligation
Chacun joue à son rythme, selon ses disponibilités. La vie réelle passe avant le jeu.

## Entraide
On se soutient, on partage, on apprend ensemble.

# Les salons Discord

- **#annonces** : lecture seule.
- **#sorties-officielles** : raids et événements organisés par les officiers.
- **#sorties-membres** : donjons, quêtes et farm proposés par les membres.

**Que la Lumière guide nos pas !**`;
