import { isActionFailure, isHttpError, isRedirect } from '@sveltejs/kit';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createCharacter, parseCharacterForm } from '$lib/server/characters';
import { raidHelperSchema, setDiscord, setRaidHelper } from '$lib/server/settings';
import { createUser, formData, horde, shaman } from './helpers';

// Matrice d'accès : chaque chargement de page et chaque action de formulaire du site, appelé avec
// chaque profil. SvelteKit ne protège pas une action par le chargement de sa page : chaque action
// porte sa propre garde, et un oubli ouvrirait une action d'admin à tout visiteur. Toute nouvelle
// page ou action doit être déclarée ici, sinon le test échoue.

type Profile = 'anonyme' | 'candidat' | 'membre' | 'officier' | 'adminDiscord' | 'adminLocal';
const PROFILES: Profile[] = ['anonyme', 'candidat', 'membre', 'officier', 'adminDiscord', 'adminLocal'];

// Le membre possède le perso visé (un neuf par appel : une action peut le supprimer).
// L'admin Discord est un joueur désigné admin de l'instance.
const MEMBER = '100000000000000001';
const OFFICER = '100000000000000002';
const DISCORD_ADMIN = '100000000000000003';
const CANDIDATE = '100000000000000004';

function localsFor(profile: Profile): App.Locals {
	const user = (id: string, permission: 'member' | 'officer', instanceAdmin = false) => ({ id, displayName: id, avatar: null, permission, instanceAdmin });
	const base = { user: null, candidate: null, admin: null };
	switch (profile) {
		case 'anonyme':
			return base as unknown as App.Locals;
		case 'candidat':
			return { ...base, candidate: { id: CANDIDATE, displayName: 'Candidat', avatar: null } } as unknown as App.Locals;
		case 'membre':
			return { ...base, user: user(MEMBER, 'member') } as unknown as App.Locals;
		case 'officier':
			return { ...base, user: user(OFFICER, 'officer') } as unknown as App.Locals;
		case 'adminDiscord':
			// Comme le hook de session : sitePermission donne « officier » à un admin de l'instance.
			return { ...base, user: user(DISCORD_ADMIN, 'officer', true) } as unknown as App.Locals;
		case 'adminLocal':
			return { ...base, admin: { id: 1, username: 'admin', mustChangePassword: false } } as unknown as App.Locals;
	}
}

// Niveaux d'accès et profils autorisés.
const LEVELS = {
	connecte: ['membre', 'officier', 'adminDiscord', 'adminLocal'], // requireViewer
	joueur: ['membre', 'officier', 'adminDiscord'], // requireUser, ou action qui exige un joueur Discord
	proprietaire: ['membre', 'officier', 'adminDiscord', 'adminLocal'], // canEdit : le membre possède le perso visé
	officier: ['officier', 'adminDiscord', 'adminLocal'], // requireOfficer ; aussi canManageOuting hors organisateur
	adminInstance: ['adminDiscord', 'adminLocal'], // requireInstanceAdmin
	adminLocal: ['adminLocal'] // requireLocalAdmin
} satisfies Record<string, Profile[]>;
type Level = keyof typeof LEVELS;
// Pages ouvertes par construction (accueil, connexion…) ou parcours propre au candidat, testé
// ailleurs (recruitment.test.ts) : déclarées, mais pas vérifiées ici. La raison est obligatoire.
type Exempt = { exempt: string };
type Rule = Level | Exempt;

const PAGES: Record<string, Record<string, Rule>> = {
	'/': { layout: { exempt: 'public, adapte son contenu au profil' }, load: { exempt: 'accueil public' } },
	'/addons': { load: { exempt: 'liste publique des addons' } },
	'/admin': { load: 'officier' },
	'/admin/addons': { load: 'officier', create: 'officier', innkeeperSync: 'officier', update: 'officier', move: 'officier', delete: 'officier' },
	'/admin/candidatures': { load: 'officier' },
	'/admin/candidatures/[id]': { load: 'officier', vote: 'officier', unvote: 'officier', accept: 'officier', refuse: 'officier', retry: 'officier' },
	'/admin/charte': { load: 'officier', default: 'officier' },
	'/admin/compte': { load: 'adminLocal', password: 'adminLocal', add: 'adminLocal', remove: 'adminLocal', discordAdmin: 'adminLocal' },
	'/admin/connexion': {
		load: { exempt: 'formulaire de connexion admin' },
		login: { exempt: 'connexion admin (mot de passe, limite de tentatives)' },
		logout: { exempt: 'déconnexion' }
	},
	'/admin/discord': { load: 'adminInstance', save: 'adminInstance' },
	'/admin/guilde': { load: 'officier', save: 'officier', classIcon: 'officier', wowhead: 'officier' },
	'/admin/import': { load: 'officier', preview: 'officier', apply: 'officier', battlenet: 'officier', battlenetSync: 'officier', battlenetOff: 'officier' },
	'/admin/journal': { load: 'adminInstance' },
	'/admin/progression': { load: 'officier', review: 'officier', joined: 'officier' },
	'/admin/anciens': { load: 'officier', leave: 'officier', comment: 'officier', seen: 'officier', reinstate: 'officier' },
	'/admin/recrutement': { load: 'officier', save: 'officier', test: 'officier' },
	'/admin/roles': { load: 'adminInstance', save: 'adminInstance', sync: 'adminInstance' },
	'/admin/rosters': { load: 'officier', create: 'officier', update: 'officier', delete: 'officier' },
	'/admin/commandes': { load: 'officier', save: 'officier', prices: 'officier' },
	'/admin/sorties': { load: 'officier', connection: 'officier', create: 'officier', update: 'officier', image: 'officier', delete: 'officier' },
	'/admin/statistiques': { load: 'officier' },
	'/artisans': { load: 'connecte' },
	'/commandes': { load: 'connecte', take: 'joueur', quote: 'joueur', accept: 'joueur', refuse: 'joueur', release: 'joueur', deliver: 'joueur', cancel: 'connecte', rate: 'joueur', alerts: 'joueur' },
	'/commandes/nouvelle': { load: 'joueur', default: 'joueur' },
	'/candidature': { load: { exempt: 'parcours candidat' }, withdraw: { exempt: 'parcours candidat' } },
	'/charte': { load: { exempt: 'charte publique' } },
	'/connexion': { load: { exempt: 'connexion Discord' }, default: { exempt: 'connexion Discord' } },
	'/deconnexion': { default: { exempt: 'déconnexion' } },
	'/installation': { load: { exempt: 'assistant, fermé une fois l’admin créé' }, default: { exempt: 'code d’installation à usage unique' } },
	// Après l'installation, les chargements renvoient vers /admin/discord et /admin/guilde, elles-mêmes gardées.
	'/installation/discord': { load: { exempt: 'renvoie vers /admin/discord' }, save: 'adminLocal', skip: 'adminLocal' },
	'/installation/guilde': { load: { exempt: 'renvoie vers /admin/guilde' }, default: 'adminLocal' },
	'/joueurs/[id]': { load: 'connecte' },
	'/persos': { load: 'joueur', setMain: 'proprietaire', delete: 'proprietaire' },
	'/persos/[id]': { load: 'proprietaire', save: 'proprietaire', delete: 'proprietaire' },
	'/persos/nouveau': { load: 'joueur', default: 'joueur' },
	'/persos/synchro': { load: 'joueur', create: 'joueur', connect: 'joueur', revoke: 'joueur' },
	'/postuler': { load: { exempt: 'parcours candidat' }, default: { exempt: 'parcours candidat' } },
	'/roster': { load: 'connecte', add: 'officier', remove: 'officier' },
	'/sorties': { load: 'connecte' },
	'/sorties/[id]': { load: 'connecte', edit: 'officier', delete: 'officier', signup: 'joueur', cancel: 'joueur' },
	'/sorties/nouvelle': { load: 'connecte', default: 'connecte' }
};

// Points d'accès hors pages : ouverts, ou protégés par une clé (testés dans leurs propres fichiers).
const ENDPOINTS: Record<string, string> = {
	'/addon/GuildSiteSync.zip': 'téléchargement public de l’addon',
	'/addon/InnkeeperSync.zip': 'téléchargement public de l’addon',
	'/api/sync': 'clé de synchronisation iks_ (sync.test.ts)',
	'/api/armurerie': 'personne connectée (joueur, candidat ou admin), 30 recherches par minute',
	'/banniere': 'image publique de la guilde',
	'/candidature/rejoindre': 'retour OAuth du candidat, contrôle du compte',
	'/healthz': 'sonde de santé',
	'/images/classes/[file]': 'images publiées seulement',
	'/images/sorties/[file]': 'images publiées seulement',
	'/logo': 'image publique de la guilde'
};

const pageModules = import.meta.glob('../routes/**/+{page,layout}.server.ts');
const endpointModules = import.meta.glob('../routes/**/+server.ts');
const routeOf = (file: string) => file.replace('../routes', '').replace(/\/\+(page|layout|server)(\.server)?\.ts$/, '') || '/';

// Ce que le site a réellement : chargements et actions, par route.
async function discover() {
	const found: Record<string, Record<string, (event: unknown) => unknown>> = {};
	for (const [file, importModule] of Object.entries(pageModules)) {
		const mod = (await importModule()) as { load?: (e: unknown) => unknown; actions?: Record<string, (e: unknown) => unknown> };
		const route = routeOf(file);
		const entry = (found[route] ??= {});
		if (mod.load) entry[file.includes('+layout') ? 'layout' : 'load'] = mod.load;
		for (const [name, action] of Object.entries(mod.actions ?? {})) entry[name] = action;
	}
	return found;
}

// Perso du membre, recréé pour chaque appel : `[id]` et le champ `id` du formulaire le visent.
const freshCharacter = () => String(createCharacter(MEMBER, parseCharacterForm(formData(shaman())).data!).id);

const paramsFor = (route: string, id: string) =>
	Object.fromEntries([...route.matchAll(/\[(\w+)\]/g)].map(([, name]) => [name, name === 'file' ? 'absente.png' : id]));

function eventFor(route: string, profile: Profile, method: 'GET' | 'POST') {
	const id = freshCharacter();
	const url = new URL(`https://guilde.test${route.replace(/\[(\w+)\]/g, id)}`);
	const jar = new Map<string, string>();
	return {
		locals: localsFor(profile),
		params: paramsFor(route, id),
		url,
		route: { id: route },
		request: new Request(url, method === 'POST' ? { method, body: formData({ id }) } : { method }),
		cookies: {
			get: (name: string) => jar.get(name),
			getAll: () => [...jar].map(([name, value]) => ({ name, value })),
			set: (name: string, value: string) => void jar.set(name, value),
			delete: (name: string) => void jar.delete(name),
			serialize: () => ''
		},
		getClientAddress: () => '127.0.0.1',
		parent: async () => ({}),
		depends: () => {},
		untrack: <T>(fn: () => T) => fn(),
		setHeaders: () => {},
		fetch,
		isDataRequest: false,
		isSubRequest: false,
		platform: undefined
	};
}

const REFUSALS = ['/connexion', '/admin/connexion', '/postuler'];

/** `true` si la garde a refusé : renvoi vers une connexion, 401/403, ou fail(403). */
async function refused(handler: (event: unknown) => unknown, event: unknown) {
	try {
		const result = await handler(event);
		return isActionFailure(result) && result.status === 403;
	} catch (e) {
		if (isRedirect(e)) return REFUSALS.includes(e.location.split('?')[0]);
		if (isHttpError(e)) return e.status === 401 || e.status === 403;
		return false; // Autre erreur (formulaire vide, service simulé absent) : la garde est passée.
	}
}

// Réglages remis avant chaque appel : une action d'admin appelée avec un formulaire vide
// (Admin → Sorties, Discord…) les écrase.
function resetSettings() {
	horde();
	setDiscord({ clientId: '111111111111111111', clientSecret: 'secret-secret-123', guildId: '222222222222222222', botToken: 'b' });
	setRaidHelper(raidHelperSchema.parse({ apiKey: 'cle-raid-helper-de-test', memberChannelId: '333333333333333333' }));
}

beforeAll(() => {
	for (const id of [MEMBER, OFFICER, DISCORD_ADMIN]) createUser(id, [], id === DISCORD_ADMIN ? { instanceAdmin: true } : {});
	createUser(CANDIDATE, [], { inGuild: false });
	// Aucun appel vers Discord ou Raid-Helper : tout répond « introuvable ».
	vi.stubGlobal('fetch', async () => new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } }));
});
afterAll(() => vi.unstubAllGlobals());

describe('matrice d’accès', () => {
	it('chaque chargement et chaque action du site est déclaré, et rien de plus', async () => {
		const found = await discover();
		const actual = Object.entries(found).flatMap(([route, handlers]) => Object.keys(handlers).map((h) => `${route} ${h}`)).sort();
		const declared = Object.entries(PAGES).flatMap(([route, rules]) => Object.keys(rules).map((h) => `${route} ${h}`)).sort();
		expect(actual).toEqual(declared);
	});

	// SvelteKit refuse une action « default » à côté d'actions nommées : erreur 500 à l'envoi du formulaire.
	it('aucune page ne mélange l’action par défaut et des actions nommées', () => {
		const mixed = Object.entries(PAGES)
			.filter(([, rules]) => 'default' in rules && Object.keys(rules).some((k) => !['default', 'load', 'layout'].includes(k)))
			.map(([route]) => route);
		expect(mixed).toEqual([]);
	});

	it('chaque point d’accès hors pages est déclaré', () => {
		expect(Object.keys(endpointModules).map(routeOf).sort()).toEqual(Object.keys(ENDPOINTS).sort());
	});

	it('chaque profil n’atteint que ce que son niveau autorise', async () => {
		const found = await discover();
		const mismatches: string[] = [];
		for (const [route, rules] of Object.entries(PAGES)) {
			for (const [name, rule] of Object.entries(rules)) {
				if (typeof rule !== 'string') continue;
				const handler = found[route]?.[name];
				if (!handler) continue; // signalé par le premier test
				for (const profile of PROFILES) {
					const expected = (LEVELS[rule] as Profile[]).includes(profile);
					resetSettings();
					const event = eventFor(route, profile, name === 'load' || name === 'layout' ? 'GET' : 'POST');
					const wasRefused = await refused(handler, event);
					if (wasRefused === expected) mismatches.push(`${route} ${name} (${rule}) : ${profile} ${expected ? 'refusé' : 'admis'}`);
				}
			}
		}
		expect(mismatches).toEqual([]);
	});
});
