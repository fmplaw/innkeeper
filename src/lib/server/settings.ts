import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import { ROLES } from '$lib/roles';
import { CLASSES, SERVER_TYPES } from '$lib/game/forever';
import { AMBITIONS } from '$lib/guild';
import { db, schema } from './db';

// Réglages de l'instance stockés en base (table `settings`), modifiables depuis
// l'interface. Un seul processus Node : un cache mémoire invalidé à l'écriture suffit.

export { DEFAULT_ACCENTS } from '$lib/guild';

const isTimeZone = (tz: string) => {
	try {
		new Intl.DateTimeFormat('fr-FR', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
};

export const guildSchema = z.object({
	name: z.string().trim().min(2, 'Nom trop court').max(60),
	faction: z.enum(['alliance', 'horde', 'both'], 'Faction invalide'),
	// Type de serveur Forever (JcJ, JcE…). Null pour les profils enregistrés avant ce réglage ;
	// le formulaire l'exige à la prochaine modification.
	serverType: z.enum(SERVER_TYPES, 'Type de serveur invalide').nullable().default(null),
	tagline: z.string().trim().max(140).default(''),
	description: z.string().trim().max(5000).default(''),
	ambitions: z.array(z.enum(AMBITIONS)).default([]),
	schedule: z.string().trim().max(1000).default(''),
	recruitment: z
		.object({
			open: z.boolean(),
			classes: z.array(z.string().refine((c) => CLASSES.some((k) => k.id === c))),
			roles: z.array(z.enum(ROLES)),
			text: z.string().trim().max(2000)
		})
		.default({ open: false, classes: [], roles: [], text: '' }),
	accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format #rrggbb)'),
	timezone: z.string().refine(isTimeZone, 'Fuseau horaire inconnu').default('Europe/Paris'),
	// Lien d'invitation public vers le serveur Discord, affiché sur l'accueil.
	discordInvite: z
		.string()
		.trim()
		.refine((v) => v === '' || /^https:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/.test(v), 'Lien attendu : https://discord.gg/…')
		.default(''),
	// Répartition anonyme (joueurs, rôles, classes) visible sans connexion.
	publicStats: z.boolean().default(true),
	// Logo et nom affichés par-dessus la bannière (à désactiver si l'image les contient déjà).
	bannerTitle: z.boolean().default(true),
	// Noms des fichiers envoyés (dossier uploads), ou null.
	logo: z.string().nullable().default(null),
	banner: z.string().nullable().default(null)
});
export type GuildProfile = z.output<typeof guildSchema>;

export const discordSchema = z.object({
	clientId: z.string().trim().regex(/^\d{17,20}$/, 'Identifiant d’application invalide'),
	clientSecret: z.string().trim().min(16, 'Clé secrète invalide'),
	guildId: z.string().trim().regex(/^\d{17,20}$/, 'ID de serveur invalide'),
	botToken: z.string().trim().nullable().default(null)
});
export type DiscordSettings = z.output<typeof discordSchema>;

export const accessSchema = z.object({
	// all-members : tout membre du serveur Discord ; mapped-roles : seulement les rôles associés.
	mode: z.enum(['all-members', 'mapped-roles'])
});
export type AccessSettings = z.output<typeof accessSchema>;

export const DEFAULT_QUESTIONS = [
	'Quelle est ton expérience de World of Warcraft ?',
	'Quelles sont tes disponibilités pour jouer ?',
	"Qu'est-ce qui te motive à rejoindre la guilde ?",
	'Comment as-tu connu la guilde ?'
];

// Identifiant Discord facultatif : chaîne vide (formulaire) ou null (relu en base) = aucun.
const discordId = z.preprocess(
	(v) => (typeof v === 'string' ? v.trim() || null : (v ?? null)),
	z.string().regex(/^\d{17,20}$/, 'Identifiant Discord invalide').nullable()
);

export const recruitmentSchema = z.object({
	// Rôle donné par le bot à l'acceptation (le rôle des nouveaux membres).
	arrivalRoleId: discordId.default(null),
	// Salon des officiers où le bot annonce les candidatures, et rôle à mentionner.
	notifyChannelId: discordId.default(null),
	mentionRoleId: discordId.default(null),
	// Salon vers lequel pointent les invitations des candidats acceptés.
	inviteChannelId: discordId.default(null),
	reapplyDays: z.coerce.number().int().min(0).max(365).default(30),
	// Ancienneté dans le rôle d'arrivée au-delà de laquelle les officiers sont invités à revoir le membre.
	reviewDays: z.coerce.number().int().min(7).max(730).default(90),
	// Départ de la guilde : le bot retire les rôles de membre (si coché) et donne ce rôle (facultatif).
	demoteFormer: z.boolean().default(false),
	formerRoleId: discordId.default(null),
	questions: z.array(z.string().trim().min(3).max(200)).max(15).default(DEFAULT_QUESTIONS)
});
export type RecruitmentSettings = z.output<typeof recruitmentSchema>;

export const raidHelperSchema = z.object({
	// Clé API du serveur (commande /apikey de Raid-Helper, réservée aux admins Discord).
	apiKey: z.string().trim().min(10, 'Clé API invalide').nullable().default(null),
	// Salon des sorties officielles, quand le modèle n'en précise pas.
	defaultChannelId: discordId.default(null),
	// Salon des sorties proposées par les membres ; vide = les membres ne peuvent pas proposer.
	memberChannelId: discordId.default(null),
	// Événement Discord en plus (liste des événements du serveur) : sorties officielles
	// seulement, et Raid-Helper doit avoir la permission « Gérer les événements ».
	discordEvents: z.boolean().default(false)
});
export type RaidHelperSettings = z.output<typeof raidHelperSchema>;

// Commandes de craft : salon où le bot les annonce (aucun : elles restent sur le site).
export const craftSchema = z.object({
	channelId: discordId.default(null)
});
export type CraftSettings = z.output<typeof craftSchema>;

const cache = new Map<string, unknown>();

function read<T>(key: string): T | undefined {
	if (cache.has(key)) return cache.get(key) as T | undefined;
	const row = db().select().from(schema.settings).where(eq(schema.settings.key, key)).get();
	const value = row?.value as T | undefined;
	cache.set(key, value);
	return value;
}

function write(key: string, value: unknown) {
	db()
		.insert(schema.settings)
		.values({ key, value })
		.onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } })
		.run();
	cache.set(key, value);
}

// Les champs ajoutés après l'installation prennent leur valeur par défaut.
export function getGuild(): GuildProfile | null {
	const raw = read<GuildProfile>('guild');
	if (!raw) return null;
	const parsed = guildSchema.safeParse(raw);
	return parsed.success ? parsed.data : raw;
}
export const setGuild = (profile: GuildProfile) => write('guild', profile);

export const getDiscord = () => read<DiscordSettings>('discord') ?? null;
export const setDiscord = (settings: DiscordSettings) => write('discord', settings);

// Un réglage enregistré devenu invalide ne doit pas casser le site : valeurs par défaut.
export function getRecruitment(): RecruitmentSettings {
	const parsed = recruitmentSchema.safeParse(read('recruitment') ?? {});
	return parsed.success ? parsed.data : recruitmentSchema.parse({});
}
export const setRecruitment = (settings: RecruitmentSettings) => write('recruitment', settings);

export function getRaidHelper(): RaidHelperSettings {
	const parsed = raidHelperSchema.safeParse(read('raidhelper') ?? {});
	return parsed.success ? parsed.data : raidHelperSchema.parse({});
}
export const setRaidHelper = (settings: RaidHelperSettings) => write('raidhelper', settings);

export function getCrafts(): CraftSettings {
	const parsed = craftSchema.safeParse(read('crafts') ?? {});
	return parsed.success ? parsed.data : craftSchema.parse({});
}
export const setCrafts = (settings: CraftSettings) => write('crafts', settings);

// Charte et règlement de la guilde : page publique /charte, à accepter pour postuler.
export const charterSchema = z.object({
	text: z.string().trim().max(20_000, 'Charte trop longue (20 000 caractères au plus)'),
	// Dernière modification (millisecondes) et son auteur, affichés sous la charte.
	updatedAt: z.number().nullable().default(null),
	updatedBy: z.string().nullable().default(null)
});
export type Charter = z.output<typeof charterSchema>;
export function getCharter(): Charter | null {
	const parsed = charterSchema.safeParse(read('charter') ?? {});
	return parsed.success && parsed.data.text ? parsed.data : null;
}
export const setCharter = (charter: Charter) => write('charter', charter);

// Images des sorties envoyées par la guilde : clé (`instance:<id>` ou `activity:<id>`) → fichier.
export const getActivityImages = () => read<Record<string, string>>('activityImages') ?? {};
export const setActivityImages = (images: Record<string, string>) => write('activityImages', images);

// Icônes de classe envoyées par la guilde : identifiant de classe → fichier dans uploads/.
export const getClassIcons = () => read<Record<string, string>>('classIcons') ?? {};
export const setClassIcons = (icons: Record<string, string>) => write('classIcons', icons);

// Dernier import du registre de guilde (addon InnkeeperSync) : sert à dire si un perso
// a été vu en jeu. Dates en secondes Unix.
export interface GameImportInfo {
	appliedAt: number;
	exportedAt: number;
	rosterSize: number;
}
export const getGameImport = () => read<GameImportInfo>('gameImport') ?? null;
export const setGameImport = (info: GameImportInfo) => write('gameImport', info);

/** Dernier registre de guilde appliqué (application InnkeeperSync ou dépôt manuel), pour Admin → Import du jeu. */
export interface GameRosterInfo {
	appliedAt: number;
	exportedAt: number;
	by: string | null;
	via: 'sync' | 'manual' | 'battlenet';
	roster: { name: string; level: number; class: string | null; rank: string | null }[];
}
// Bulles Wowhead au survol des recettes : script de Wowhead chargé chez chaque visiteur, donc
// désactivé tant que la guilde ne le choisit pas (Admin → Guilde, mention dans Confidentialité).
export const getWowheadTooltips = () => read<boolean>('wowheadTooltips') ?? false;
export const setWowheadTooltips = (on: boolean) => write('wowheadTooltips', on);

export const getGameRoster = () => read<GameRosterInfo>('gameRoster') ?? null;
export const setGameRoster = (info: GameRosterInfo) => write('gameRoster', info);

// Noms des rangs de la guilde par numéro (0 = chef de guilde), appris des exports de l'addon :
// Battle.net ne donne que le numéro.
export const getGameRanks = () => read<Record<string, string>>('gameRanks') ?? {};
export const setGameRanks = (ranks: Record<string, string>) => write('gameRanks', ranks);

// API Battle.net : registre de guilde, niveaux, métiers et dernière connexion, sans addon.
// Client créé par la guilde sur develop.battle.net ; la clé secrète n'est jamais renvoyée au navigateur.
export const battlenetSchema = z.object({
	clientId: z.string().trim().min(20, 'Client ID invalide').max(64).nullable().default(null),
	clientSecret: z.string().trim().min(20, 'Clé secrète invalide').max(128).nullable().default(null),
	region: z.enum(['eu', 'us']).default('eu'),
	// Nom de la guilde dans l'adresse de l'Armurerie : « le-pacte-des-anciens ».
	guildSlug: z
		.string()
		.trim()
		.toLowerCase()
		.max(80)
		.regex(/^[\p{L}\p{N}-]*$/u, 'Nom de guilde attendu comme dans l’adresse de l’Armurerie : le-pacte-des-anciens')
		.default('')
});
export type BattlenetSettings = z.output<typeof battlenetSchema>;
export function getBattlenet(): BattlenetSettings {
	const parsed = battlenetSchema.safeParse(read('battlenet') ?? {});
	return parsed.success ? parsed.data : battlenetSchema.parse({});
}
export const setBattlenet = (settings: BattlenetSettings) => write('battlenet', settings);

/** Résultat de la dernière synchronisation Battle.net (dates en millisecondes). */
export interface BattlenetStatus {
	at: number;
	ok: boolean;
	message: string;
}
export const getBattlenetStatus = () => read<BattlenetStatus>('battlenetStatus') ?? null;
export const setBattlenetStatus = (status: BattlenetStatus) => write('battlenetStatus', status);

// Base créée par le mode démo (INNKEEPER_DEMO=1) : sans cette marque, le mode démo refuse de démarrer.
export const getDemoMarker = () => read<{ seededAt: number }>('demo') ?? null;
export const setDemoMarker = () => write('demo', { seededAt: Date.now() });
// Sorties Raid-Helper simulées du mode démo (créées, modifiées et supprimées depuis le site).
export const getDemoEvents = <T>() => read<T[]>('demoEvents') ?? [];
export const setDemoEvents = <T>(events: T[]) => write('demoEvents', events);

export const getAccess = (): AccessSettings => read<AccessSettings>('access') ?? { mode: 'all-members' };
export const setAccess = (access: AccessSettings) => write('access', access);

/** L'installation est terminée dès que le profil de guilde existe. */
export const isSetupComplete = () => getGuild() !== null;

/** Secret des sessions : AUTH_SECRET s'il est fourni, sinon généré une fois et conservé en base. */
export function getAuthSecret(): string {
	if (env.AUTH_SECRET) return env.AUTH_SECRET;
	let secret = read<string>('authSecret');
	if (!secret) {
		secret = randomBytes(32).toString('base64');
		write('authSecret', secret);
	}
	return secret;
}
