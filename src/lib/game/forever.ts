// Données de jeu de WoW Forever, communes à toutes les instances.
// À mettre à jour ici quand Blizzard change le jeu (nouvelles combinaisons…).
// Sources : guides Overgear et LFCarry (octobre 2026).

import type { Role } from '$lib/roles';

export const FACTIONS = ['alliance', 'horde'] as const;
export type Faction = (typeof FACTIONS)[number];
/** Faction d'une guilde : une faction, ou les deux. */
export type GuildFaction = Faction | 'both';

export const FACTION_LABELS: Record<Faction, string> = { alliance: 'Alliance', horde: 'Horde' };
export const GUILD_FACTION_LABELS: Record<GuildFaction, string> = { ...FACTION_LABELS, both: 'Multi-faction' };

// Types de serveur (règles choisies par chaque joueur sur le méga-serveur de Forever).
// `upcoming` : annoncé, pas encore ouvert.
export const SERVER_TYPES = ['pvp', 'pve', 'rp', 'hardcore'] as const;
export type ServerType = (typeof SERVER_TYPES)[number];
export const SERVER_TYPE_INFO: Record<ServerType, { label: string; name: string; upcoming?: boolean }> = {
	pvp: { label: 'JcJ', name: 'Joueur contre joueur' },
	pve: { label: 'JcE', name: 'Joueur contre environnement' },
	rp: { label: 'JdR', name: 'Jeu de rôle' },
	hardcore: { label: 'Hardcore', name: 'Une seule vie', upcoming: true }
};

export interface Spec {
	id: string;
	name: string;
	roles: readonly Role[];
}

export interface GameClass {
	id: string;
	name: string;
	color: string;
	specs: readonly Spec[];
}

export interface Race {
	id: string;
	name: string;
	faction: Faction;
	classes: readonly string[];
}

export const MAX_LEVEL = 60;
export const DUAL_SPEC_LEVEL = 40;

export const CLASSES: readonly GameClass[] = [
	{
		id: 'warrior',
		name: 'Guerrier',
		color: '#C69B6D',
		specs: [
			{ id: 'arms', name: 'Armes', roles: ['melee'] },
			{ id: 'fury', name: 'Fureur', roles: ['melee'] },
			{ id: 'protection', name: 'Protection', roles: ['tank'] }
		]
	},
	{
		id: 'paladin',
		name: 'Paladin',
		color: '#F48CBA',
		specs: [
			{ id: 'holy', name: 'Sacré', roles: ['healer'] },
			{ id: 'protection', name: 'Protection', roles: ['tank'] },
			{ id: 'retribution', name: 'Vindicte', roles: ['melee'] }
		]
	},
	{
		id: 'hunter',
		name: 'Chasseur',
		color: '#AAD372',
		specs: [
			{ id: 'beast-mastery', name: 'Maîtrise des bêtes', roles: ['ranged'] },
			{ id: 'marksmanship', name: 'Précision', roles: ['ranged'] },
			{ id: 'survival', name: 'Survie', roles: ['ranged'] }
		]
	},
	{
		id: 'rogue',
		name: 'Voleur',
		color: '#FFF468',
		specs: [
			{ id: 'assassination', name: 'Assassinat', roles: ['melee'] },
			{ id: 'combat', name: 'Combat', roles: ['melee'] },
			{ id: 'subtlety', name: 'Finesse', roles: ['melee'] }
		]
	},
	{
		id: 'priest',
		name: 'Prêtre',
		color: '#FFFFFF',
		specs: [
			{ id: 'discipline', name: 'Discipline', roles: ['healer'] },
			{ id: 'holy', name: 'Sacré', roles: ['healer'] },
			{ id: 'shadow', name: 'Ombre', roles: ['ranged'] }
		]
	},
	{
		id: 'shaman',
		name: 'Chaman',
		color: '#0070DD',
		specs: [
			{ id: 'elemental', name: 'Élémentaire', roles: ['ranged'] },
			{ id: 'enhancement', name: 'Amélioration', roles: ['melee', 'tank'] },
			{ id: 'restoration', name: 'Restauration', roles: ['healer'] }
		]
	},
	{
		id: 'mage',
		name: 'Mage',
		color: '#3FC7EB',
		specs: [
			{ id: 'arcane', name: 'Arcanes', roles: ['ranged'] },
			{ id: 'fire', name: 'Feu', roles: ['ranged'] },
			{ id: 'frost', name: 'Givre', roles: ['ranged'] }
		]
	},
	{
		id: 'warlock',
		name: 'Démoniste',
		color: '#8788EE',
		specs: [
			{ id: 'affliction', name: 'Affliction', roles: ['ranged'] },
			{ id: 'demonology', name: 'Démonologie', roles: ['ranged'] },
			{ id: 'destruction', name: 'Destruction', roles: ['ranged'] }
		]
	},
	{
		id: 'druid',
		name: 'Druide',
		color: '#FF7C0A',
		specs: [
			{ id: 'balance', name: 'Équilibre', roles: ['ranged'] },
			{ id: 'feral', name: 'Combat farouche', roles: ['tank', 'melee'] },
			{ id: 'restoration', name: 'Restauration', roles: ['healer'] }
		]
	}
];

// Le Skyborne (Éolide) choisit sa faction à la création : une entrée par variante.
// Noms français officiels (API Battle.net, playable-race 95 et 96).
export const RACES: readonly Race[] = [
	{ id: 'human', name: 'Humain', faction: 'alliance', classes: ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'mage', 'warlock'] },
	{ id: 'dwarf', name: 'Nain', faction: 'alliance', classes: ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'shaman'] },
	{ id: 'gnome', name: 'Gnome', faction: 'alliance', classes: ['warrior', 'rogue', 'priest', 'mage', 'warlock'] },
	{ id: 'night-elf', name: 'Elfe de la nuit', faction: 'alliance', classes: ['warrior', 'hunter', 'rogue', 'priest', 'druid'] },
	{ id: 'skyborne-alliance', name: 'Éolide de l’Ordre suprême', faction: 'alliance', classes: ['warrior', 'hunter', 'rogue', 'druid', 'mage'] },
	{ id: 'orc', name: 'Orc', faction: 'horde', classes: ['warrior', 'hunter', 'rogue', 'shaman', 'warlock', 'mage'] },
	{ id: 'tauren', name: 'Tauren', faction: 'horde', classes: ['warrior', 'hunter', 'shaman', 'druid'] },
	{ id: 'troll', name: 'Troll', faction: 'horde', classes: ['warrior', 'hunter', 'rogue', 'priest', 'mage', 'shaman', 'warlock'] },
	{ id: 'undead', name: 'Mort-vivant', faction: 'horde', classes: ['warrior', 'rogue', 'priest', 'mage', 'warlock', 'paladin'] },
	{ id: 'skyborne-horde', name: 'Éolide sculpte-vents', faction: 'horde', classes: ['warrior', 'hunter', 'rogue', 'druid', 'shaman'] }
];

// Métiers principaux (2 au maximum par perso) et secondaires (sans limite).
// skillLine : identifiant de la compétence dans le jeu, indépendant de la langue (export de l'addon).
export const PROFESSIONS = [
	{ id: 'alchemy', skillLine: 171, name: 'Alchimie', secondary: false },
	{ id: 'blacksmithing', skillLine: 164, name: 'Forge', secondary: false },
	{ id: 'enchanting', skillLine: 333, name: 'Enchantement', secondary: false },
	{ id: 'engineering', skillLine: 202, name: 'Ingénierie', secondary: false },
	{ id: 'herbalism', skillLine: 182, name: 'Herboristerie', secondary: false },
	{ id: 'leatherworking', skillLine: 165, name: 'Travail du cuir', secondary: false },
	{ id: 'mining', skillLine: 186, name: 'Minage', secondary: false },
	{ id: 'skinning', skillLine: 393, name: 'Dépeçage', secondary: false },
	{ id: 'tailoring', skillLine: 197, name: 'Couture', secondary: false },
	{ id: 'cooking', skillLine: 185, name: 'Cuisine', secondary: true },
	{ id: 'first-aid', skillLine: 129, name: 'Secourisme', secondary: true },
	{ id: 'fishing', skillLine: 356, name: 'Pêche', secondary: true }
] as const;
export const MAX_PRIMARY_PROFESSIONS = 2;
export const MAX_PROFESSION_LEVEL = 300;

/** Races jouables pour une guilde de cette faction. */
export function racesFor(faction: GuildFaction) {
	return faction === 'both' ? RACES : RACES.filter((r) => r.faction === faction);
}

// Lecture des sorties Raid-Helper, modèle « wowforever » : les « classes »
// Raid-Helper sont des catégories de rôle, la classe WoW se déduit de la spé.
// Le suffixe 1 distingue les homonymes (Protection1, Holy1 = paladin ; Restoration1 = chaman).
export const RAID_HELPER = {
	roles: { Tank: 'tank', Melee: 'melee', Ranged: 'ranged', Healer: 'healer' } as Record<string, Role>,
	statuses: { Late: 'En retard', Bench: 'Remplaçant', Tentative: 'Peut-être', Absence: 'Absent' } as Record<string, string>,
	specs: {
		Protection: { class: 'warrior', spec: 'protection' },
		Arms: { class: 'warrior', spec: 'arms' },
		Fury: { class: 'warrior', spec: 'fury' },
		Protection1: { class: 'paladin', spec: 'protection' },
		Holy1: { class: 'paladin', spec: 'holy' },
		Retribution: { class: 'paladin', spec: 'retribution' },
		Beastmastery: { class: 'hunter', spec: 'beast-mastery' },
		Marksmanship: { class: 'hunter', spec: 'marksmanship' },
		Survival: { class: 'hunter', spec: 'survival' },
		Assassination: { class: 'rogue', spec: 'assassination' },
		Combat: { class: 'rogue', spec: 'combat' },
		Subtlety: { class: 'rogue', spec: 'subtlety' },
		Discipline: { class: 'priest', spec: 'discipline' },
		Holy: { class: 'priest', spec: 'holy' },
		Shadow: { class: 'priest', spec: 'shadow' },
		Smite: { class: 'priest' },
		Elemental: { class: 'shaman', spec: 'elemental' },
		Enhancement: { class: 'shaman', spec: 'enhancement' },
		Restoration1: { class: 'shaman', spec: 'restoration' },
		Arcane: { class: 'mage', spec: 'arcane' },
		Fire: { class: 'mage', spec: 'fire' },
		Frost: { class: 'mage', spec: 'frost' },
		Affliction: { class: 'warlock', spec: 'affliction' },
		Demonology: { class: 'warlock', spec: 'demonology' },
		Destruction: { class: 'warlock', spec: 'destruction' },
		Balance: { class: 'druid', spec: 'balance' },
		Feral: { class: 'druid', spec: 'feral' },
		Guardian: { class: 'druid', spec: 'feral' },
		Restoration: { class: 'druid', spec: 'restoration' }
	} as Record<string, { class: string; spec?: string }>
};

/**
 * Inscription Raid-Helper (modèle `wowforever`) d'un perso : catégorie de rôle et spé.
 * Sans spé connue, on prend la première spé de la classe qui tient ce rôle.
 */
export function toRaidHelper(classId: string, specId: string | null, role: Role) {
	const className = Object.entries(RAID_HELPER.roles).find(([, r]) => r === role)![0];
	const spec = specId ?? CLASSES.find((c) => c.id === classId)?.specs.find((s) => s.roles.includes(role))?.id;
	const matches = Object.entries(RAID_HELPER.specs).filter(([, m]) => m.class === classId && m.spec === spec);
	// Druide farouche : Guardian en tank, Feral sinon.
	const specName = (matches.length > 1 ? matches.find(([key]) => (key === 'Guardian') === (role === 'tank')) : matches[0])?.[0];
	return { className, specName: specName ?? null };
}

export interface Instance {
	id: string;
	name: string;
	kind: 'dungeon' | 'raid';
	/** Nombre de joueurs. */
	size: number;
	/** Tranche de niveau conseillée. */
	levels: readonly [number, number];
	/** Nouveauté de Forever (absente du Classic d'origine). */
	isNew?: boolean;
	/** Date d'ouverture (AAAA-MM-JJ) si l'instance n'est pas disponible au lancement. */
	opensOn?: string;
}

/**
 * Donjons et raids de Forever. Noms français officiels relevés en jeu le 9/11/2026 (hauts faits
 * « Spéléologue » et « Conquête ») et sur l'article de Blizzard sur les donjons. Les donjons du
 * Classic d'origine restent ; 9 donjons s'ajoutent. Seuls 3 raids sont annoncés (9 décembre
 * 2026) : Molten Core, BWL, ZG, AQ et Naxxramas ne le sont pas, d'autres raids sont promis
 * pour 2027. Les identifiants restent en anglais : ils servent aux images et aux sorties déjà
 * créées. Tranches de niveau d'après Blizzard pour les nouveautés.
 */
export const INSTANCES: readonly Instance[] = [
	{ id: 'ragefire', name: 'Gouffre de Ragefeu', kind: 'dungeon', size: 5, levels: [13, 18] },
	{ id: 'hall-of-thanes', name: 'La salle des Thanes', kind: 'dungeon', size: 5, levels: [13, 18], isNew: true },
	{ id: 'ruins-of-lordaeron', name: 'Ruines de Lordaeron', kind: 'dungeon', size: 5, levels: [15, 20], isNew: true },
	{ id: 'wailing-caverns', name: 'Cavernes des Lamentations', kind: 'dungeon', size: 5, levels: [17, 24] },
	{ id: 'deadmines', name: 'Les Mortemines', kind: 'dungeon', size: 5, levels: [17, 26] },
	{ id: 'shadowfang', name: "Donjon d'Ombrecroc", kind: 'dungeon', size: 5, levels: [22, 30] },
	{ id: 'blackfathom', name: 'Profondeurs de Brassenoire', kind: 'dungeon', size: 5, levels: [24, 32] },
	{ id: 'stockade', name: 'La Prison de Hurlevent', kind: 'dungeon', size: 5, levels: [24, 32] },
	{ id: 'excavation-site', name: 'Excavations : les Paluns', kind: 'dungeon', size: 5, levels: [24, 29], isNew: true },
	{ id: 'city-of-dalaran', name: 'Cité de Dalaran', kind: 'dungeon', size: 5, levels: [28, 33], isNew: true },
	{ id: 'gnomeregan', name: 'Gnomeregan', kind: 'dungeon', size: 5, levels: [29, 38] },
	{ id: 'razorfen-kraul', name: 'Kraal de Tranchebauge', kind: 'dungeon', size: 5, levels: [29, 38] },
	{ id: 'scarlet-monastery', name: 'Monastère Écarlate', kind: 'dungeon', size: 5, levels: [34, 45] },
	{ id: 'drowned-city', name: 'La cité Submergée', kind: 'dungeon', size: 5, levels: [35, 40], isNew: true },
	{ id: 'razorfen-downs', name: 'Souilles de Tranchebauge', kind: 'dungeon', size: 5, levels: [37, 46] },
	{ id: 'kroldok-stronghold', name: "Bastion Krol'dok", kind: 'dungeon', size: 5, levels: [40, 45], isNew: true },
	{ id: 'uldaman', name: 'Uldaman', kind: 'dungeon', size: 5, levels: [41, 51] },
	{ id: 'zulfarrak', name: "Zul'Farrak", kind: 'dungeon', size: 5, levels: [44, 54] },
	{ id: 'maraudon', name: 'Maraudon', kind: 'dungeon', size: 5, levels: [46, 55] },
	{ id: 'alcaz-island-prison', name: "Prison d'Alcaz", kind: 'dungeon', size: 5, levels: [48, 53], isNew: true },
	{ id: 'sunken-temple', name: "Le temple d'Atal'Hakkar", kind: 'dungeon', size: 5, levels: [50, 56] },
	{ id: 'blackrock-depths', name: 'Profondeurs de Rochenoire', kind: 'dungeon', size: 5, levels: [52, 60] },
	{ id: 'lower-blackrock', name: 'Bas du pic Rochenoire', kind: 'dungeon', size: 5, levels: [55, 60] },
	{ id: 'dire-maul', name: 'Haches-Tripes', kind: 'dungeon', size: 5, levels: [55, 60] },
	{ id: 'blackmaw-hold', name: 'Repaire des Noiregueules', kind: 'dungeon', size: 5, levels: [55, 60], isNew: true },
	{ id: 'stratholme', name: 'Stratholme', kind: 'dungeon', size: 5, levels: [58, 60] },
	{ id: 'scholomance', name: 'Scholomance', kind: 'dungeon', size: 5, levels: [58, 60] },
	{ id: 'shapers-terrace', name: 'La terrasse du Façonneur', kind: 'dungeon', size: 5, levels: [58, 60], isNew: true },
	// Donjon à 10 dans le Classic d'origine ; pas annoncé comme raid dans Forever.
	{ id: 'upper-blackrock', name: 'Sommet du pic Rochenoire', kind: 'dungeon', size: 10, levels: [58, 60] },
	{ id: 'barrow-deeps', name: 'Profondeurs des Saisons', kind: 'raid', size: 10, levels: [60, 60], isNew: true, opensOn: '2026-12-09' },
	{ id: 'hyjal-summit', name: "Sommet d'Hyjal", kind: 'raid', size: 20, levels: [60, 60], isNew: true, opensOn: '2026-12-09' },
	{ id: 'onyxia', name: "Repaire d'Onyxia", kind: 'raid', size: 40, levels: [60, 60], opensOn: '2026-12-09' }
];

/** Rôle tenu par une spé Raid-Helper (pour les inscrits sans catégorie de rôle, sur le banc). */
export function roleOfRaidHelperSpec(specName: string | null | undefined): Role | null {
	if (!specName) return null;
	if (specName === 'Guardian') return 'tank';
	const mapped = RAID_HELPER.specs[specName];
	const cls = CLASSES.find((c) => c.id === mapped?.class);
	return cls?.specs.find((s) => s.id === mapped?.spec)?.roles[0] ?? null;
}
