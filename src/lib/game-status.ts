// Présence en jeu d'un perso, d'après le dernier import du registre de guilde.
// Partagé entre serveur et navigateur.

export type GameStatus = 'seen' | 'missing' | 'pending';

/**
 * - seen : reconnu lors du dernier import (dans le registre ou les métiers de la guilde) ;
 * - missing : la fiche existait déjà, mais aucun perso de ce nom n'était dans la guilde ;
 * - pending : fiche créée après le dernier import, pas encore vérifiable ;
 * - null : aucun import du registre pour l'instant.
 */
export function gameStatus(c: { gameSyncedAt: Date | null; createdAt: Date }, lastImportAt: Date | null): GameStatus | null {
	if (!lastImportAt) return null;
	if (c.gameSyncedAt && c.gameSyncedAt.getTime() >= lastImportAt.getTime()) return 'seen';
	if (c.createdAt.getTime() > lastImportAt.getTime()) return 'pending';
	return 'missing';
}
