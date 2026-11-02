import { publishedClassIcon } from '$lib/server/class-icons';
import { serveUpload } from '$lib/server/guild-form';
import type { RequestHandler } from './$types';

// Public comme le logo : les icônes s'affichent aussi aux visiteurs (roster de l'accueil, candidatures).
export const GET: RequestHandler = ({ params }) => serveUpload(publishedClassIcon(params.file));
