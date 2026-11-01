import type { Whoami } from '../core/api';
import type { Config } from '../core/config';
import type { EngineState } from '../core/engine';
import type { Actions } from './app';

// Fenêtre d'InnkeeperSync, construite en DOM : rien de ce qui vient du site n'est inséré comme du HTML.

export interface View {
	connected: Config | null;
	pending: (Whoami & { siteUrl: string }) | null;
	error: string | null;
	engine: EngineState;
	autostart: boolean;
	canAutostart: boolean;
	version: string;
	updates: {
		/** Nouvelle version disponible, ou null. */
		version: string | null;
		checking: boolean;
		/** Vérification demandée à la main : rien de nouveau. */
		upToDate: boolean;
		/** Téléchargement ou installation en cours. */
		progress: string | null;
		error: string | null;
	};
}

type Child = Node | string | null | false | undefined | Child[];

function h(tag: string, props: Record<string, unknown> = {}, ...children: Child[]) {
	const el = document.createElement(tag);
	for (const [k, v] of Object.entries(props)) {
		if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
		else if (k === 'class') el.className = String(v);
		else if (k === 'checked') (el as HTMLInputElement).checked = Boolean(v);
		else if (v === true) el.setAttribute(k, '');
		else if (v !== false && v != null) el.setAttribute(k, String(v));
	}
	const add = (c: Child) => {
		if (Array.isArray(c)) c.forEach(add);
		else if (c != null && c !== false) el.append(c);
	};
	children.forEach(add);
	return el;
}

const host = (url: string) => new URL(url).host;
const time = (ms: number) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const day = (ms: number) =>
	new Date().toDateString() === new Date(ms).toDateString() ? `aujourd'hui à ${time(ms)}` : new Date(ms).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const scopeText = (scope: 'guild' | 'own') => (scope === 'guild' ? 'clé d’officier : toute la guilde' : 'clé de membre : tes persos');
const errorLine = (v: View) => (v.error ? h('p', { class: 'error' }, v.error) : null);

/** Pas encore relié : expliquer le bouton du site, avec la clé à coller en secours. */
function welcome(v: View, a: Actions) {
	const site = h('input', { type: 'text', name: 'site', placeholder: 'ma-guilde.fr', required: true }) as HTMLInputElement;
	const token = h('input', { type: 'password', name: 'token', placeholder: 'iks_…', required: true }) as HTMLInputElement;
	const form = h(
		'form',
		{
			onsubmit: (e: Event) => {
				e.preventDefault();
				void a.manual(site.value, token.value);
			}
		},
		h('label', {}, 'Adresse du site', site),
		h('label', {}, 'Clé de synchronisation', token),
		h('div', { class: 'row' }, h('button', {}, 'Connecter'))
	);
	return [
		h(
			'section',
			{ class: 'card' },
			h('h2', {}, 'Relie InnkeeperSync à ta guilde'),
			h(
				'ol',
				{},
				h('li', {}, 'Ouvre le site de ta guilde et connecte-toi.'),
				h('li', {}, 'Va dans ', h('strong', {}, 'Mes persos → Synchronisation automatique'), '.'),
				h('li', {}, 'Clique sur ', h('strong', {}, 'Connecter InnkeeperSync'), ' : cette fenêtre te demandera de confirmer.')
			)
		),
		errorLine(v),
		h('details', { class: 'card' }, h('summary', {}, 'J’ai une clé à coller'), form)
	];
}

/** Lien reçu du site : on montre exactement à quel site la synchronisation va s'envoyer. */
function confirm(v: View, a: Actions) {
	const p = v.pending!;
	return [
		h(
			'section',
			{ class: 'card confirm' },
			h('p', { class: 'muted' }, 'Connecter InnkeeperSync à :'),
			h('p', { class: 'site' }, p.guild ?? host(p.siteUrl)),
			h('p', {}, host(p.siteUrl), ' · ', p.player),
			h('p', { class: 'muted small' }, `${scopeText(p.scope)}. Ne connecte que le site de ta guilde.`),
			h('div', { class: 'row' }, h('button', { onclick: () => void a.confirm() }, 'Connecter'), h('button', { class: 'secondary', onclick: a.cancel }, 'Annuler'))
		)
	];
}

function statusCard(v: View, a: Actions) {
	const e = v.engine;
	const n = e.files.length;
	const [tone, title, text] = {
		'no-game': ['warn', 'Dossier du jeu introuvable', 'Indique le dossier de World of Warcraft pour que l’export de l’addon soit trouvé.'],
		waiting: [
			'',
			'En attente du jeu',
			n ? `En jeu : tape /innkeeper, puis /reload ou déconnecte-toi. ${n} compte${n > 1 ? 's' : ''} suivi${n > 1 ? 's' : ''}.` : 'Aucun export de l’addon pour l’instant : en jeu, tape /innkeeper puis /reload.'
		],
		synced: ['ok', 'Synchronisé', e.lastSyncAt ? `Dernier envoi ${day(e.lastSyncAt)}.` : ''],
		retrying: ['warn', 'Nouvel essai bientôt', e.detail ?? ''],
		refused: ['bad', 'Clé refusée', `${e.detail ?? ''} Reconnecte InnkeeperSync depuis le site.`]
	}[e.status];
	return h(
		'section',
		{ class: 'card status' },
		h('span', { class: `dot ${tone}` }),
		h('h2', {}, title),
		h('p', { class: 'muted small' }, text),
		e.status === 'no-game' && h('div', { class: 'actions' }, h('button', { onclick: () => void a.chooseFolder() }, 'Choisir le dossier')),
		e.status === 'refused' && h('div', { class: 'actions' }, h('button', { onclick: () => void a.disconnect() }, 'Se reconnecter'))
	);
}

function connected(v: View, a: Actions) {
	const c = v.connected!;
	const events = v.engine.events;
	return [
		statusCard(v, a),
		errorLine(v),
		events.length > 0 &&
			h(
				'section',
				{ class: 'card' },
				h('h2', {}, 'Derniers envois'),
				h('ul', { class: 'events' }, events.map((ev) => h('li', {}, h('time', {}, time(ev.at)), h('span', { class: ev.ok ? '' : 'bad' }, `${ev.account} : ${ev.message}`))))
			),
		h(
			'section',
			{ class: 'card' },
			h('h2', {}, 'Réglages'),
			h('div', {}, h('p', { class: 'muted small' }, 'Dossier de World of Warcraft'), h('p', { class: 'path' }, c.gameDir || 'non choisi')),
			h('div', { class: 'row' }, h('button', { class: 'secondary', onclick: () => void a.chooseFolder() }, 'Changer de dossier')),
			v.canAutostart &&
				h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: v.autostart, onchange: (e: Event) => void a.setAutostart((e.target as HTMLInputElement).checked) }), 'Démarrer avec Windows'),
			h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: c.notify, onchange: (e: Event) => void a.setNotify((e.target as HTMLInputElement).checked) }), 'Me prévenir quand des persos sont mis à jour')
		),
		h('div', { class: 'row' }, h('button', { class: 'secondary', onclick: () => void a.openSite() }, 'Ouvrir le site'), h('button', { class: 'link', onclick: () => void a.disconnect() }, 'Se déconnecter'))
	];
}

/** Nouvelle version : un encadré en haut de la fenêtre, avec le bouton. */
function updateBanner(v: View, a: Actions) {
	const u = v.updates;
	if (!u.version) return u.error ? h('p', { class: 'error' }, u.error) : null;
	return h(
		'section',
		{ class: 'card update' },
		h('div', {}, h('h2', {}, `Version ${u.version} disponible`), h('p', { class: 'muted small' }, u.progress ?? 'L’application redémarrera après la mise à jour.')),
		u.progress ? null : h('button', { onclick: () => void a.installUpdate() }, 'Mettre à jour'),
		u.error ? h('p', { class: 'error' }, u.error) : null
	);
}

function footer(v: View, a: Actions) {
	const u = v.updates;
	const check = u.checking
		? h('span', {}, ' · vérification…')
		: u.upToDate
			? h('span', {}, ' · à jour ✔')
			: u.version
				? null
				: h('span', {}, ' · ', h('button', { class: 'link', onclick: () => void a.checkUpdate() }, 'Rechercher une mise à jour'));
	return [h('span', {}, v.version ? `Version ${v.version}` : '', check), h('span', {}, 'Fermer la fenêtre ne coupe pas la synchronisation')];
}

export function render(v: View, a: Actions) {
	const c = v.connected;
	document.getElementById('who')!.textContent = c ? `${c.guild ?? host(c.siteUrl)} · ${c.player} · ${scopeText(c.scope)}` : 'Synchronisation avec le site de ta guilde';
	const parts = [updateBanner(v, a), ...(v.pending ? confirm(v, a) : c ? connected(v, a) : welcome(v, a))];
	document.getElementById('view')!.replaceChildren(...(parts.filter(Boolean) as Node[]));
	document.getElementById('foot')!.replaceChildren(...footer(v, a));
}
