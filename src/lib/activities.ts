import { INSTANCES, type Instance } from '$lib/game/forever';

// Types de sortie proposés à la création, partagés entre serveur et navigateur.
// Chaque type fixe des réglages Raid-Helper par défaut (places, durée).

export interface Activity {
	id: string;
	name: string;
	/** Donjon ou raid : on choisit l'instance dans le catalogue. */
	instances?: Instance['kind'];
	/** Places (sinon : taille de l'instance, ou illimité). */
	limit?: number;
	/** Durée en minutes. */
	duration: number;
}

export const ACTIVITIES: readonly Activity[] = [
	{ id: 'dungeon', name: 'Donjon', instances: 'dungeon', duration: 120 },
	{ id: 'raid', name: 'Raid', instances: 'raid', duration: 180 },
	{ id: 'quests', name: 'Quêtes', limit: 5, duration: 120 },
	{ id: 'farm', name: 'Farm / métiers', duration: 120 },
	{ id: 'pvp', name: 'PvP', duration: 120 },
	{ id: 'other', name: 'Autre', duration: 120 }
];

export const getActivity = (id: string | null | undefined) => ACTIVITIES.find((a) => a.id === id);
export const getInstance = (id: string | null | undefined) => INSTANCES.find((i) => i.id === id);

/** Instances proposées pour une activité (donjons ou raids). */
export const instancesFor = (activity: Activity | undefined) => (activity?.instances ? INSTANCES.filter((i) => i.kind === activity.instances) : []);

const OPENS = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Libellé de liste : nom, niveaux, nouveauté de Forever et date d'ouverture. */
export const instanceLabel = (i: Instance) =>
	[
		i.name,
		`(${levelRange(i)}${i.size !== 5 ? `, ${i.size} joueurs` : ''})`,
		i.isNew ? '· nouveau' : '',
		i.opensOn ? `· dès le ${OPENS.format(new Date(`${i.opensOn}T00:00:00Z`))}` : ''
	]
		.filter(Boolean)
		.join(' ');

/** Tranche de niveau lisible : « niveau 60 » ou « niveaux 52 à 60 ». */
export const levelRange = (i: Instance) => (i.levels[0] === i.levels[1] ? `niveau ${i.levels[0]}` : `niveaux ${i.levels[0]} à ${i.levels[1]}`);

/** Clé d'image : celle de l'instance si elle en a une, sinon celle de l'activité. */
export const imageKeys = (activity: string | null, instance: string | null) => [instance && `instance:${instance}`, activity && `activity:${activity}`].filter(Boolean) as string[];
