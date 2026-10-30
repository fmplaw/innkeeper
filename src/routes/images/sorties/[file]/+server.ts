import { publishedImage } from '$lib/server/activity-images';
import { serveUpload } from '$lib/server/guild-form';
import type { RequestHandler } from './$types';

// Public : Discord récupère ces images pour les événements Raid-Helper.
export const GET: RequestHandler = ({ params }) => serveUpload(publishedImage(params.file));
