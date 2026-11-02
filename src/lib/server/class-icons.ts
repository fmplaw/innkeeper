import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLASSES } from '$lib/game/forever';
import { IMAGE_TYPES, imageExtension, uploadsDir } from './guild-form';
import { getClassIcons, setClassIcons } from './settings';

// Icônes de classe : une image par classe, envoyée par la guilde (aucune image de Blizzard
// n'est fournie). Sans icône, le site garde le blason teinté par la couleur de la classe.

const MAX_BYTES = 512 * 1024;

export const isClassId = (id: string) => CLASSES.some((c) => c.id === id);

/** Enregistre l'icône d'une classe ; renvoie un message d'erreur ou null. */
export async function saveClassIcon(classId: string, file: File) {
	if (!isClassId(classId)) return 'Classe inconnue.';
	if (!IMAGE_TYPES[file.type]) return 'Format accepté : PNG, JPEG ou WebP';
	if (file.size > MAX_BYTES) return 'Image trop lourde (512 Ko maximum)';
	const data = Buffer.from(await file.arrayBuffer());
	const ext = imageExtension(file.type, data);
	if (!ext) return 'Format accepté : PNG, JPEG ou WebP (le fichier n’est pas une image de ce type)';
	const icons = getClassIcons();
	const dir = uploadsDir();
	mkdirSync(dir, { recursive: true });
	// Nom nouveau à chaque envoi : les navigateurs ne gardent pas l'ancienne en cache.
	const name = `classe-${classId}-${Date.now()}.${ext}`;
	writeFileSync(join(dir, name), data);
	if (icons[classId]) rmSync(join(dir, icons[classId]), { force: true });
	setClassIcons({ ...icons, [classId]: name });
	return null;
}

export function removeClassIcon(classId: string) {
	const icons = getClassIcons();
	if (!icons[classId]) return;
	rmSync(join(uploadsDir(), icons[classId]), { force: true });
	const { [classId]: _removed, ...rest } = icons;
	setClassIcons(rest);
}

/** Fichier d'icône publié, ou undefined (seuls les fichiers enregistrés sont servis). */
export const publishedClassIcon = (file: string) => (Object.values(getClassIcons()).includes(file) ? file : undefined);

/** Adresse de l'icône de chaque classe qui en a une. */
export const classIconUrls = () =>
	Object.fromEntries(Object.entries(getClassIcons()).map(([id, file]) => [id, `/images/classes/${file}`]));
