import { defaultWindowIcon, getVersion } from '@tauri-apps/api/app';
import { Menu } from '@tauri-apps/api/menu';
import { homeDir } from '@tauri-apps/api/path';
import { TrayIcon } from '@tauri-apps/api/tray';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { disable as disableAutostart, enable as enableAutostart, isEnabled as autostartEnabled } from '@tauri-apps/plugin-autostart';
import { getCurrent as currentLinks, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { exists, readDir, readFile, stat } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { openUrl } from '@tauri-apps/plugin-opener';
import { exit, relaunch } from '@tauri-apps/plugin-process';
import { load } from '@tauri-apps/plugin-store';
import { check as checkUpdate } from '@tauri-apps/plugin-updater';
import { whoami, type Whoami } from '../core/api';
import { normalizeSiteUrl, parseConfig, parseConnectLink, type Config } from '../core/config';
import { describeResult, platformDeps, SyncEngine } from '../core/engine';
import { guessGameDirs, looksLikeGameDir } from '../core/files';
import { joinPath, type Platform } from '../core/platform';
import { render, type View } from './view';

// InnkeeperSync : vit près de l'horloge et envoie au site de la guilde le fichier de l'addon
// dès que le jeu l'écrit. La logique est dans ../core ; ici, le branchement sur Tauri.

const POLL_MS = 5_000;
const UPDATE_EVERY_MS = 6 * 3_600_000;
const os = navigator.userAgent.includes('Windows') ? 'windows' : navigator.userAgent.includes('Mac') ? 'macos' : 'linux';

const platform: Platform = {
	subdirs: async (path) => {
		try {
			return (await readDir(path)).filter((e) => e.isDirectory).map((e) => joinPath(path, e.name));
		} catch {
			return [];
		}
	},
	exists: async (path) => exists(path).catch(() => false),
	stat: async (path) => {
		try {
			const s = await stat(path);
			return { mtimeMs: s.mtime?.getTime() ?? 0, size: s.size };
		} catch {
			return null;
		}
	},
	readFile: (path) => readFile(path),
	fetch: (url, init) => tauriFetch(url, init),
	now: () => Date.now()
};

/** Connexion proposée par un lien du site, en attente de confirmation. */
interface Pending extends Whoami {
	siteUrl: string;
	token: string;
}

// Une erreur au démarrage s'affiche dans la fenêtre au lieu de la laisser vide.
function showFatal(e: unknown) {
	const p = document.createElement('p');
	p.className = 'error';
	p.textContent = `InnkeeperSync n'a pas pu démarrer : ${e instanceof Error ? e.message : String(e)}`;
	document.getElementById('view')?.replaceChildren(p);
}
window.addEventListener('error', (e) => showFatal(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showFatal(e.reason));

const win = getCurrentWindow();
const engine = new SyncEngine(platformDeps(platform));
const store = await load('config.json', { autoSave: false, defaults: {} });
let config = parseConfig(await store.get('config'));
let pending: Pending | null = null;
let error: string | null = null;
let autostart = await autostartEnabled().catch(() => false);
let tray: TrayIcon | null = null;
const version = await getVersion().catch(() => '');

function refresh() {
	const state: View = { connected: config, pending, error, engine: engine.state, autostart, canAutostart: os !== 'linux', version };
	render(state, actions);
	const label = !config ? 'à connecter' : engine.state.status === 'refused' ? 'clé refusée' : engine.state.status === 'synced' ? 'synchronisé' : 'en attente du jeu';
	void tray?.setTooltip(`InnkeeperSync : ${label}`);
}
engine.onState(refresh);
engine.onSynced(async (result, account) => {
	if (!config?.notify || !result.changed) return;
	if (!(await isPermissionGranted()) && (await requestPermission()) !== 'granted') return;
	sendNotification({ title: 'InnkeeperSync', body: `Compte ${account} : ${describeResult(result)}.` });
});

async function save(next: Config | null) {
	config = next;
	if (next) await store.set('config', next);
	else await store.delete('config');
	await store.save();
	engine.configure(next && { siteUrl: next.siteUrl, token: next.token, gameDir: next.gameDir });
	refresh();
	void engine.tick();
}

async function show() {
	await win.show();
	await win.unminimize();
	await win.setFocus();
}

/** Lien du site : on vérifie la clé, puis la fenêtre demande confirmation (le site affiché doit être le bon). */
async function handleLink(link: string | undefined) {
	if (!link) return;
	await show();
	const parsed = parseConnectLink(link);
	if (!parsed) {
		error = 'Lien de connexion invalide : recommence depuis le site de ta guilde.';
		return refresh();
	}
	try {
		pending = { ...parsed, ...(await whoami(platform, parsed.siteUrl, parsed.token)) };
		error = null;
	} catch (e) {
		pending = null;
		error = e instanceof Error ? e.message : String(e);
	}
	refresh();
}

async function connect(p: Pending) {
	const firstTime = !config;
	const gameDir = config?.gameDir || (await guessGameDirs(platform, os, await homeDir()))[0] || '';
	pending = null;
	error = null;
	await save({ siteUrl: p.siteUrl, token: p.token, gameDir, guild: p.guild, player: p.player, scope: p.scope, notify: config?.notify ?? true });
	if (firstTime && os !== 'linux') await actions.setAutostart(true);
}

const actions = {
	confirm: () => pending && connect(pending),
	cancel: () => {
		pending = null;
		refresh();
	},
	manual: async (site: string, token: string) => {
		try {
			const siteUrl = normalizeSiteUrl(site);
			await connect({ siteUrl, token: token.trim(), ...(await whoami(platform, siteUrl, token.trim())) });
		} catch (e) {
			error = e instanceof TypeError ? 'Adresse du site invalide, par exemple : https://ma-guilde.fr' : e instanceof Error ? e.message : String(e);
			refresh();
		}
	},
	chooseFolder: async () => {
		if (!config) return;
		const dir = await openDialog({ directory: true, title: 'Dossier de World of Warcraft', defaultPath: config.gameDir || undefined });
		if (typeof dir !== 'string') return;
		if (!(await looksLikeGameDir(platform, dir))) {
			error = 'Ce dossier ne contient pas WoW (aucun dossier WTF). Choisis le dossier « World of Warcraft ».';
			return refresh();
		}
		error = null;
		await save({ ...config, gameDir: dir });
	},
	setAutostart: async (on: boolean) => {
		await (on ? enableAutostart() : disableAutostart()).catch(() => undefined);
		autostart = await autostartEnabled().catch(() => false);
		refresh();
	},
	setNotify: async (on: boolean) => config && save({ ...config, notify: on }),
	openSite: () => config && openUrl(config.siteUrl),
	disconnect: () => save(null)
};
export type Actions = typeof actions;

// Fermer la fenêtre ne quitte pas : la synchronisation continue près de l'horloge.
await win.onCloseRequested(async (e) => {
	e.preventDefault();
	await win.hide();
});

// Première image tout de suite : l'icône près de l'horloge vient ensuite et n'est pas indispensable.
refresh();
try {
	tray = await TrayIcon.new({
		icon: (await defaultWindowIcon()) ?? undefined,
		tooltip: 'InnkeeperSync',
		showMenuOnLeftClick: false,
		menu: await Menu.new({
			items: [
				{ id: 'open', text: 'Ouvrir InnkeeperSync', action: () => void show() },
				{ id: 'site', text: 'Ouvrir le site de la guilde', action: () => void actions.openSite() },
				{ item: 'Separator' },
				{ id: 'quit', text: 'Quitter InnkeeperSync', action: () => void exit(0) }
			]
		}),
		action: (e) => {
			if (e.type === 'Click' && e.button === 'Left' && e.buttonState === 'Up') void show();
		}
	});
} catch (e) {
	console.error('Icône près de l’horloge indisponible', e);
}

// Dossier du jeu pas encore connu (première installation, jeu déplacé) : on le cherche.
if (config && !config.gameDir) {
	const guess = (await guessGameDirs(platform, os, await homeDir()))[0];
	if (guess) config = { ...config, gameDir: guess };
}
engine.configure(config && { siteUrl: config.siteUrl, token: config.token, gameDir: config.gameDir });
refresh();
// Lancée avec Windows, la fenêtre reste cachée ; sans réglages, elle s'affiche pour la mise en route.
if (!config) await show();

await onOpenUrl((urls) => void handleLink(urls[0]));
void handleLink((await currentLinks())?.[0]);
setInterval(() => void engine.tick().catch((e) => console.error(e)), POLL_MS);
void engine.tick();

// Mises à jour : vérifiées au démarrage puis toutes les 6 heures, installées sans rien demander.
async function updateIfAvailable() {
	try {
		const update = await checkUpdate();
		if (!update) return;
		await update.downloadAndInstall();
		await relaunch();
	} catch (e) {
		console.error('Mise à jour impossible', e);
	}
}
void updateIfAvailable();
setInterval(() => void updateIfAvailable(), UPDATE_EVERY_MS);
