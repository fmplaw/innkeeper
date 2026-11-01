import type { Permission } from '$lib/server/permissions';

declare global {
	namespace App {
		interface Locals {
			// Joueur connecté via Discord.
			user: {
				id: string;
				displayName: string;
				avatar: string | null;
				permission: Permission;
			} | null;
			// Connecté avec Discord sans être membre de la guilde : candidat potentiel.
			candidate: { id: string; displayName: string; avatar: string | null } | null;
			// Admin local d'instance (hors Discord).
			admin: { id: number; username: string; mustChangePassword: boolean } | null;
		}
	}
}

export {};
