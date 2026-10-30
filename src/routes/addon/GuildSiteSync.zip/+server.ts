import { redirect } from '@sveltejs/kit';

// Ancien nom de l'addon (avant Innkeeper) : les anciens liens mènent au nouveau fichier.
export const GET = () => redirect(301, '/addon/InnkeeperSync.zip');
