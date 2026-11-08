# Journal des modifications

Toutes les évolutions notables d'Innkeeper sont notées ici. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et les numéros de version suivent [la gestion sémantique de version](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- **Recettes rangées comme en jeu** : sur la page d'un joueur, les recettes de chaque métier sont rangées par sous-section, comme dans la fenêtre du métier (« Bandages », « Remèdes »…). La page Artisans s'allège : elle montre le nombre de recettes de chaque artisan, et un clic ouvre sa page joueur directement sur ce métier. Les recettes exportées avant la version 0.17 de l'addon restent dans « Autres » jusqu'au prochain export.

- **Anciens membres** (Admin → Anciens membres) : un membre qui quitte la guilde n'a plus accès au site et disparaît du roster, de la page Artisans, des rosters et des statistiques. Ses fiches sont gardées et « Réintégrer » les rend visibles. Avec Battle.net, le départ est repéré tout seul : aucun perso du joueur dans le registre de la guilde en jeu pendant au moins 5 heures, et l'Armurerie en montre un dans une autre guilde ou sans guilde. Le départ d'un officier, ou d'un joueur dont le perso est introuvable, reste à confirmer par un officier. Un officier peut aussi noter un départ lui-même. Les officiers sont prévenus dans leur salon Discord et par un compteur dans le menu, et peuvent noter la raison du départ. En option (Admin → Recrutement), le bot retire les rôles de membre de l'ancien membre sur Discord et lui donne un autre rôle, par exemple celui des invités. Un joueur qui revient dans la guilde en jeu est réintégré sur le site, mais ses rôles Discord ne lui sont pas rendus automatiquement.

- **Lien vers l'Armurerie** : une petite icône à côté du nom d'un perso ouvre sa page dans l'Armurerie de Blizzard (équipement, talents, métiers), dans un nouvel onglet. Elle apparaît dans Mes persos, sur les fiches des joueurs, dans le roster, sur la page Artisans et sur la page d'une candidature. Seulement pour les persos trouvés dans l'Armurerie, avec Battle.net connecté.

- **Vérification des persos dans l'Armurerie** (avec Battle.net) : à la saisie d'un perso (Mes persos, candidature), le site le cherche dès que le prénom et le nom de famille sont tapés, et propose de remplir race, classe, niveau et métiers. Il signale une saisie qui ne correspond pas au jeu. Pour un perso introuvable, le joueur peut indiquer qu'il n'est pas encore créé. Badges **✔ existe en jeu**, **nouveau perso, pas encore créé** et **⚠ autre classe en jeu** ; la vérification se refait à chaque synchronisation. La page d'une candidature montre le perso tel que l'Armurerie le connaît. Rien n'est bloquant.

- **Synchronisation Battle.net** (Admin → Import du jeu) : avec un client de l'API Battle.net, le site lit l'Armurerie de Forever toutes les 3 heures, et sur demande. Il récupère le registre de la guilde avec les noms complets, ainsi que le niveau, les métiers (avec leurs points) et la dernière connexion de chaque perso, sans addon. Les métiers de Battle.net sont complets : un métier abandonné quitte la fiche. Un export de l'addon fait depuis la dernière déconnexion reste prioritaire. Les noms des rangs sont appris du registre de l'addon. Les recettes restent l'affaire de l'addon. Battle.net est simulé en mode démo.

- **Page Artisans** (menu) : les persos de la guilde regroupés par métier, du plus haut niveau au plus bas, avec leurs recettes connues, et une recherche de recette (« qui connaît… ? », sans tenir compte des accents). **Recettes connues dans Mes persos**, repliées par métier. Chaque recette renvoie vers sa page Wowhead (base de Forever, en français, bulles comprises). **Bulles Wowhead** au survol, à activer dans Admin → Guilde (désactivées par défaut : le script vient de Wowhead, la page Confidentialité le mentionne quand elles sont activées).

### Modifié

- **Badges « en jeu », « existe en jeu »… : vraie infobulle** au survol, au clavier et au toucher (l'ancienne, celle du navigateur, ne s'affichait pas sur téléphone), avec des explications plus claires. « en jeu » : dans le registre de la guilde. « existe en jeu » : le perso existe, mais n'est pas dans la guilde (pas encore invité, ou parti).
- **Recettes en français**, même exportées d'un jeu en anglais (« Enchant Bracer - Minor Stamina » devient « Ench. de bracelets (Endurance mineure) ») : le site retient les noms des exports faits en français et demande les autres à Wowhead, en arrière-plan, en n'envoyant que le numéro de la recette. Les recettes déjà importées sont traduites au démarrage. La recherche de la page Artisans trouve donc aussi leurs recettes.
- **Longues listes de recettes** (Artisans, Mes persos, fiches des joueurs) : au-delà d'une douzaine, la liste défile dans un cadre au lieu de repousser la page ; à partir de 20, un champ permet de la filtrer.
- **Import du jeu : changement de métier.** Les métiers du perso qui exporte suivent ceux du jeu : un métier abandonné quitte sa fiche, avec ses recettes. Pour les autres membres (onglet des métiers de guilde, peut-être incomplet), l'import ajoute et met à jour sans rien retirer. Un export sans liste de métiers (pas encore chargée à la connexion) ne retire rien.

### Corrigé

- **Races Skyborne** : l'Armurerie (Battle.net) les reconnaît maintenant ; un druide Éolide n'apparaît plus avec la race déjà choisie sur la fiche. Elles prennent leurs noms français officiels : **Éolide de l’Ordre suprême** (Alliance) et **Éolide sculpte-vents** (Horde).
- Addon Innkeeper Sync 1.2.2 (zip du site) : le message « N recettes enregistrées » ne se répète plus à chaque fabrication, fenêtre de métier ouverte ; il n'apparaît que si le nombre de recettes connues change.

## [0.16.0] - 2026-11-05

### Publication

- InnkeeperSync reste en **0.14.0** (application inchangée) : la release reprend son installateur, pas de mise à jour à faire. L'addon **Innkeeper Sync 1.2.1** est publié sur CurseForge et Wago (registre sans les notes ni la zone).

### Sécurité

- **HSTS** : un site servi en HTTPS (`ORIGIN` en `https://`) demande au navigateur de n'utiliser que HTTPS pendant un an.
- **`docker-compose.yml` ne publie plus le port 3000 que sur la machine elle-même** (`127.0.0.1:3000`) : Docker passant outre le pare-feu, le site était aussi joignable en HTTP clair depuis le réseau. Avec un reverse proxy sur une autre machine, remettre `"3000:3000"` (voir le README).

### Ajouté

- **Admin → Import du jeu : dernière synchronisation.** Le registre de guilde envoyé par l'application InnkeeperSync (ou déposé à la main) est gardé : la page montre quand et par qui, le nombre de persos reconnus, les fiches introuvables et les membres de la guilde sans fiche, sans dépôt manuel. Les listes sont recalculées avec les fiches du moment : une fiche corrigée en sort aussitôt. La page présente la synchronisation automatique comme la voie normale, et précise que prénom et nom de famille doivent être ceux du jeu.

### Modifié

- Migrations : un test refuse deux migrations du même numéro (deux branches fusionnées l'une après l'autre) et un journal qui ne reprend pas exactement les fichiers ; la CI vérifie que `npm run db:generate` ne produit plus rien, donc que le schéma et les migrations concordent.
- Tests : matrice d'accès. Chaque chargement de page et chaque action de formulaire est appelé avec six profils (visiteur, candidat, membre, officier, admin Discord, admin local) et comparé au niveau déclaré ; une nouvelle page ou action non déclarée fait échouer les tests.
- CI de l'image : vérification des types et tests en parallèle de la construction ; une pull request n'écrit plus le cache Docker (elle relit celui de main). La publication (main et tags) attend les deux et réutilise le cache.

### Corrigé

- **Import du jeu : seule la fiche de celui qui exporte était mise à jour.** Dans Forever, le registre de guilde donne le nom complet (« Prénom Nom ») et le site comparait le prénom seul : aucun autre membre n'était reconnu. Les fiches sont maintenant reliées par prénom et nom de famille ; le perso qui exporte, dont le jeu ne donne que le prénom, est retrouvé dans le registre. Une fiche sans nom de famille se relie encore par le prénom, sauf si plusieurs persos du jeu portent ce prénom. Deux persos du même prénom avec des noms de famille différents ne sont plus signalés en double (badge « nom en double », seulement pour un même nom complet ou un nom de famille manquant).
- Roster : avec de vraies fiches, le tableau débordait de la page et la colonne Métiers sortait du cadre (cinq métiers dont les secondaires, badge « pas trouvé en jeu », pseudo comme « Artémis/christcosmik/néfélion », race « Skyborne (Windshaper) »). Le texte des cellules passe maintenant à la ligne, les pseudos se coupent après les barres obliques, et seuls les métiers principaux s'affichent en clair : les secondaires sont résumés (« + 3 secondaires », détail au survol).

## [0.15.0] - 2026-11-02

### Publication

- **InnkeeperSync n'est plus reconstruite à chaque version du site**, seulement quand son propre numéro change (`companion/package.json`). Sinon, la release reprend l'installateur de la version précédente : pas de mise à jour inutile chez les membres, et pas de nouvel exécutable à faire accepter par Windows Defender. Cette version garde InnkeeperSync **0.14.0**.

### Ajouté

- **Médaillon du type de sortie**, dans l'esprit de la légende de la carte du jeu : « ! » jaune pour les quêtes, vortex bleu pour un donjon, vortex vert pour un raid, épées croisées pour le PvP, pelle pour le farm, « … » pour le reste. Il s'affiche dans la liste des sorties, sur la page d'une sortie et dans la carte « prochaine sortie » de l'accueil, avec le type en toutes lettres (« Raid · Barrow Deeps »). Une sortie créée directement sur Discord ou dans Raid-Helper, sans type connu du site, est marquée « Événement Discord ». Dessins propres au projet, aucune image de Blizzard.
- **Icônes de classe** : Admin → Guilde accepte une image par classe, affichée en médaillon à côté de chaque perso (Mes persos, roster, fiches des joueurs, candidatures, filtres par classe), avec le rôle en pastille dans le coin. Sans icône, la classe garde un blason à sa couleur. Aucune image de Blizzard n'est fournie : chaque guilde envoie les siennes.

### Modifié

- **Couleurs des rôles comme dans le jeu** : tank bleu, soigneur vert (au lieu du doré), mêlée rouge, distance violet. Les badges PvE et PvP passent en neutre pour ne pas se confondre avec les soigneurs.
- **Prénom dans la couleur de la classe** dans Mes persos, le roster et les fiches.
- **Roster** : la colonne Classe disparaît (l'emblème la remplace) et les métiers s'affichent à la suite au lieu d'un par ligne : le tableau tient sans défilement sur un écran de 1140 px et les lignes ne s'allongent plus.
- **Nouvelle apparence « Braise »** : thème sombre et chaud, titres gravés, mise en page aérée, sans cadres partout. L'accueil met en avant la bannière et le logo de la guilde (une illustration teintée par la couleur d'accent les remplace s'ils manquent) ; un membre connecté y voit sa prochaine sortie. Sur téléphone, une barre d'onglets en bas remplace le menu replié. L'admin range ses quinze pages en quatre groupes dans une colonne. Les sorties se lisent en agenda, la composition par rôle avec l'inscription à côté ; le roster se filtre d'un clic par rôle et par classe, et chaque compteur ignore son propre filtre. Les couleurs de classe passent sur des pastilles : le texte reste lisible (le bleu du chaman l'était mal sur fond sombre). Icônes Lucide à la place des emojis, polices Cinzel, Fraunces et Instrument Sans embarquées. Admin → Guilde conseille désormais une bannière d'au moins 2400 × 1000 px (au lieu de 1600 × 400) et un logo d'au moins 600 px. Sur téléphone, le roster passe en cartes. Formulaires (perso, guilde, réglages) en sections sans cadre, rôles en pastilles avec leur icône. Statistiques avec la même barre de rôles que l'accueil et un accès direct aux sections. Candidature : fil d'étapes côté candidat (déposée, examen, décision, arrivée sur le Discord), avis Pour/Contre côté officiers. Contrastes vérifiés pour les trois palettes de faction (texte des boutons au moins 4,5:1).
- **Prénoms en double** : dans Forever, plusieurs persos peuvent porter le même prénom (seul le nom complet est unique). L'avertissement ne conseille plus de corriger l'orthographe : il explique que l'import du jeu ne sait pas encore distinguer ces fiches, et rassure quand ce sont toutes les persos du même joueur. Dans Admin → Joueurs, le badge devient « prénom en double » et n'apparaît plus quand les fiches sont toutes au même joueur.
- Journal : libellé pour l'attribution du rôle d'arrivée par le bot (« a donné le rôle d'arrivée à »).
- Image Docker : le site est compilé et testé une seule fois, sans émulation, puis réutilisé pour l'image arm64 (better-sqlite3 y charge son binaire précompilé arm64). La construction de l'image arm64 ne passe plus des minutes sous QEMU ; chaque image est essayée au démarrage (`/healthz`) avant publication.

## [0.14.0] - 2026-11-01

### Sécurité

- **Admin → Rôles Discord réservé aux admins de l'instance** : un officier pouvait donner la permission Officier à n'importe quel rôle (y compris le sien ou celui d'un ami) ou ouvrir le site à tout le serveur Discord. La page, comme la connexion Discord, n'est plus accessible qu'à l'admin local et aux admins Discord qu'il désigne.

### Ajouté

- **Mode démo** (`INNKEEPER_DEMO=1`) : une guilde fictive complète (joueurs, persos, candidatures, roster, charte, addons, sorties), Discord et Raid-Helper simulés, et une connexion par choix de profil (admin, officier, membre, nouvelle recrue, candidat), avec un bandeau sur chaque page. Pour essayer Innkeeper, prévisualiser une branche ou prendre des captures. Il refuse de démarrer sur une vraie base.
- **Admins Discord** : depuis Admin → Compte admin, le compte admin local nomme admin de l'instance un joueur déjà connecté au site. Il a alors les droits d'admin (connexion Discord, rôles, journal, clé Raid-Helper, et tout ce que fait un officier) avec sa connexion Discord habituelle, même sans être officier. Le compte local reste l'accès de secours, et lui seul nomme ou retire les admins Discord et gère les comptes locaux. Nominations et retraits sont notés dans le journal.
- **Plusieurs admins de l'instance** : Admin → Compte admin liste les comptes admin local et permet d'en ajouter un (mot de passe provisoire généré, affiché une seule fois, à changer avant d'accéder au reste de l'admin) ou d'en retirer un (jamais soi-même ni le dernier ; ses sessions sont fermées aussitôt). Ajouts et retraits sont notés dans le journal.
- **Fiches du même nom signalées** : quand deux fiches portent le même nom de perso, l'import du jeu n'en met à jour aucune. Un avertissement l'explique désormais dans Mes persos et sur la page de modification du perso, et un badge « nom en double » apparaît dans Admin → Joueurs.

### Corrigé

- InnkeeperSync : un message contenant un long chemin de fichier (erreur de lecture, par exemple) élargissait la fenêtre au-delà de son bord ; le contenu et le bouton « Mettre à jour » étaient coupés à droite. Le chemin revient maintenant à la ligne.

## [0.13.1] - 2026-11-01

### Sécurité

- **Accès des comptes extérieurs au serveur** : en mode « tout membre du serveur » (le mode par défaut), un compte Discord qui n'est pas sur le serveur de la guilde obtenait l'accès membre (roster, sorties, inscriptions, clés de synchronisation) au lieu de passer par la candidature. Le site enregistre désormais la présence sur le serveur à chaque connexion et à chaque relecture des nouveaux membres par le bot ; sans elle, aucun accès. Migration : les comptes qui avaient au moins un rôle sont considérés comme présents ; ceux qui n'en avaient aucun doivent se reconnecter une fois.
- **Rôles à jour sans reconnexion** : avec le bot, les rôles d'un joueur et sa présence sur le serveur sont relus sur Discord au plus toutes les 10 minutes, pour les pages du site comme pour les clés InnkeeperSync. Un rôle retiré ou une exclusion du serveur s'applique donc en quelques minutes, au lieu de durer tant que la session restait ouverte (30 jours, prolongés à chaque visite). Si Discord ne répond pas, le site garde les rôles connus.
- En-têtes de sécurité sur toutes les réponses du site : interdiction d'intégrer le site dans la page d'un autre (`X-Frame-Options`, `frame-ancestors`), ce qui empêche de piéger un officier par des clics détournés sur les actions d'admin ; pas de reniflage des types de fichiers (`nosniff`) pour les images envoyées ; adresse complète des pages non transmise aux sites externes (`Referrer-Policy`).
- Images envoyées (logo, bannière, images des sorties) : le contenu du fichier doit correspondre au format annoncé (signature PNG, JPEG ou WebP). Jusqu'ici, seul le type déclaré par le navigateur comptait : un fichier quelconque renommé en `.png` était accepté puis servi publiquement comme image.

### Modifié

- Addon InnkeeperSync 1.2.1 : les notes du registre de guilde (publiques et d'officier) et la zone des membres ne sont plus exportées. Le site ne s'en servait pas, mais InnkeeperSync les envoyait avec le reste du fichier.

### Corrigé

- Une candidature validée deux fois (double clic, deux officiers en même temps) créait deux persos à la recrue et deux annonces. La décision ne s'enregistre plus que si la candidature est encore en attente ; un refus ou un retrait arrivé après coup est sans effet.
- Sorties : une sortie commencée ou passée n'accepte plus d'inscription ni de désinscription depuis le site. Le formulaire était déjà masqué, mais l'envoi direct du formulaire passait encore et modifiait la liste dans Raid-Helper après coup.
- Connexion Discord : la lecture du profil du joueur sur le serveur abandonne au bout de 10 secondes, comme les autres appels à Discord, au lieu d'attendre indéfiniment une réponse quand Discord est lent.
- Mémoire du serveur : le cache des événements Raid-Helper (500 au plus), la liste des messages Discord écartés (5 000 au plus) et les tentatives de connexion admin (adresses expirées oubliées) ne grossissent plus sans limite. Il suffisait d'ouvrir `/sorties/<identifiant>` avec des identifiants inventés pour faire grossir le processus.
- Import du jeu : les caractères accentués écrits sous forme d'octets échappés (`\195\169`) dans le fichier de l'addon donnaient « Ã© » au lieu de « é » (noms de persos, de métiers, de recettes). Les octets échappés sont maintenant décodés ensemble en UTF-8.
- Bot Discord : quand Discord demande de ralentir (429) pour quelques secondes, le bot patiente puis réessaie au lieu d'échouer. Le repérage des sorties sans clé Raid-Helper lit les salons cinq par cinq au lieu de tous à la fois : sur un serveur aux nombreux salons, des sorties manquaient à la liste sans aucun message.
- InnkeeperSync : un envoi resté sans réponse (site muet, connexion coupée en plein envoi) bloquait l'application jusqu'à son redémarrage, sans plus rien synchroniser ni afficher d'erreur. Chaque requête abandonne maintenant au bout d'une minute, et l'application réessaie plus tard comme pour un site injoignable.
- InnkeeperSync : un fichier d'export illisible (encore tenu par le jeu, bloqué par un antivirus…) interrompait le relevé, et les fichiers des autres comptes WoW n'étaient plus envoyés tant qu'il restait illisible, sans aucun message. Il est maintenant relu plus tard, l'erreur s'affiche dans l'historique, et les autres comptes partent normalement.
- Addon InnkeeperSync 1.2.1 : l'export repart de zéro à chaque connexion d'un perso. Si Forever relit les SavedVariables (ce que la bêta ne faisait pas), les recettes d'un autre perso du même compte étaient attribuées au perso connecté, et un perso hors guilde renvoyait le registre de la guilde d'un autre.
- Import du jeu : un export plus ancien que les données d'une fiche ne les remplace plus (niveau qui redescend, métiers et dernière connexion d'avant). C'était le cas avec deux comptes WoW sur le même PC, dont InnkeeperSync renvoie les deux fichiers à chaque démarrage, ou quand l'export d'un officier arrivait après celui, plus récent, d'un membre. L'aperçu de l'import liste les fiches ignorées pour cette raison, et un registre plus ancien ne déplace plus la référence « vu en jeu ». Seules les recettes encore inconnues d'un tel export s'ajoutent : un registre de guilde plus récent n'en contient pas, et une recette apprise ne se perd pas.
- InnkeeperSync sous Linux (AppImage) : l'application ne pouvait lire aucun fichier de l'addon et n'envoyait donc jamais rien, en restant « En attente du jeu » sans message. Un des motifs de chemin autorisés, écrit avec des antislashs pour Windows, est invalide sur Linux et faisait échouer toute la permission de lecture. Ce motif est maintenant réservé à Windows.

## [0.13.0] - 2026-11-01

### Ajouté

- **Page Addons** : les addons conseillés par la guilde, gérés dans Admin → Addons (statut : indispensable, recommandé en raid, recommandé, utile, confort ; usage ; public visé par classe ou rôle ; « pourquoi » ; liens CurseForge, Wago ou autre ; ordre). Page en tableau, visible de tous, lien dans le menu dès qu'un addon est publié ; filtres par recherche, statut, usage et « Pour mon main ». Innkeeper Sync s'ajoute en un clic. Chaque changement est noté dans le journal.
- **Publication de l'addon** sur CurseForge, Wago Addons et WoWInterface : versions et tags propres (`InnkeeperSync-v1.2.0`), workflow `addon.yml` avec le BigWigs Packager. Addon 1.2.0 : fichier TOC propre à Forever (`InnkeeperSync_Camelot.toc`), description anglaise avec traduction française.

## [0.12.2] - 2026-11-01

### Ajouté

- Page d'erreur en français (page introuvable, accès réservé, erreur inattendue) avec « Réessayer » et « Retour à l'accueil », au lieu des messages bruts « Not Found » ou « Internal Error ».
- Lien « Charte » en pied de page quand la guilde en a publié une.

### Modifié

- InnkeeperSync : une nouvelle version s'annonce dans la fenêtre (« Version X disponible », bouton « Mettre à jour » avec la progression) ; lien « Rechercher une mise à jour » près du numéro de version. Lancée cachée avec Windows, l'application se met encore à jour seule.
- Candidature : l'acceptation de la charte s'affiche en pastille verte avec sa date (« ✔ Charte acceptée le … »), orange si la charte a été modifiée depuis.

## [0.12.1] - 2026-10-31

### Corrigé

- L'installateur Windows d'InnkeeperSync porte l'icône d'Innkeeper au lieu de l'icône générique.
- L'AppImage Linux d'InnkeeperSync se construit de nouveau : la bibliothèque `rust-ini` 0.21.3 cassait le module des liens `innkeeper://` sous Linux, elle est figée en 0.21.1.

## [0.12.0] - 2026-10-31

### Ajouté

- **Application InnkeeperSync pour PC** (`companion/`, Tauri, installateur d'environ 5 Mo) : surveille le fichier de l'addon et l'envoie au site dès que le jeu l'écrit (déconnexion, `/reload`), sans dépôt manuel. Vit près de l'horloge, démarre avec Windows, se met à jour toute seule, notification après un envoi (désactivable). Installateur Windows et AppImage Linux attachés à chaque release GitHub.
- **Synchronisation automatique** (Mes persos) : bouton « Connecter InnkeeperSync » (lien `innkeeper://`, confirmé dans l'application) et clés personnelles révocables ; une clé d'officier met à jour toute la guilde, une clé de membre seulement ses persos. Adresse `/api/sync`, envois notés dans le journal.

## [0.11.0] - 2026-10-31

### Ajouté

- **Charte et règlement** : rédigés dans Admin → Charte (aperçu en direct, modification notée dans le journal), publiés sur la page publique `/charte` avec un lien dans le menu. Quand une charte existe, le candidat la lit dans le formulaire et doit cocher « J'ai lu la charte et je m'engage à la respecter » ; la candidature indique aux officiers que la charte a été acceptée. Mise en page pensée pour un long texte : chaque partie (`#`) ouvre par un titre souligné, ses sous-parties (`##`) s'affichent en encadrés côte à côte (empilés sur téléphone), et une dernière ligne entièrement en gras (une devise) sort des parties pour former un bandeau en bas de page.

- **Type de serveur** de la guilde (JcJ, JcE, JdR, Hardcore à venir) dans le profil de guilde, demandé à l'installation et dans Admin → Guilde. Il s'affiche sur la bannière de l'accueil (« Horde · JcJ · World of Warcraft Forever ») et en pied de page. Un rappel s'affiche dans l'admin tant qu'il n'est pas renseigné.

### Modifié

- Les textes de la guilde (charte, présentation, horaires, recrutement) acceptent des titres (`# `, `## `) et des listes (`- `).

### Corrigé

- Le titre du formulaire de candidature affichait « Postuler au Le Pacte… » : il devient « Rejoindre <nom de la guilde> ».

## [0.10.1] - 2026-10-30

### Ajouté

- **Roster** : tri du tableau au clic sur l'en-tête des colonnes (perso, joueur, classe, spés, niveau, race, intérêts, métiers), dans les deux sens, conservé quand on change de filtre. Les cases vides restent en fin de liste.

### Corrigé

- **Admin → Progression** s'affiche beaucoup plus vite : les rôles des nouveaux membres sont relus sur Discord en une seule requête, au lieu d'une par membre (Discord freinait ces appels en rafale).

## [0.10.0] - 2026-10-30

### Ajouté

- **Admin → Statistiques** (officiers) : rôles des mains (avec spés secondaires et rerolls), tableau des classes par rôle, métiers avec meilleurs niveaux et artisans, niveaux et intérêts des mains, activité sur le site, fiches à compléter avec copie des mentions Discord. Les classes et rôles recherchés dans le recrutement sont mis en évidence.
- `scripts/version.mjs` : change le numéro de version partout (paquet, fichiers compose, CHANGELOG), avec un test qui vérifie que tout concorde.

### Modifié

- Les fichiers `docker-compose.yml` et `docker-compose.traefik.yml` utilisent l'image publiée de la version en cours (`ghcr.io/fmplaw/innkeeper:X.Y.Z`) au lieu de construire depuis les sources.
- README : installation sans cloner le dépôt, mise à jour d'une instance, publication d'une version.

## [0.9.1] - 2026-10-30

### Ajouté

- Icône du projet (enseigne d'auberge), utilisée aussi comme favicon par défaut.
- Captures d'écran dans le README, prises sur une guilde de démonstration.
- Ce journal des modifications.

### Corrigé

- Page d'une sortie : espaces manquants dans « organisé par », le nombre de places, la spé des inscrits et la liste du banc.
- Page d'une sortie : « Modifier mon inscription » reprend le perso et le statut de l'inscription actuelle, au lieu du main en « Présent ».

## [0.9.0] - 2026-10-30

Première version publique.

### Ajouté

- **Installation guidée** : assistant en deux étapes (application Discord, profil de guilde), compte admin local de secours, réglages modifiables ensuite dans l'admin. Conseils pour nommer l'application et configurer le bot.
- **Connexion Discord** : accès selon les rôles du serveur (officier, membre ou aucun), synchronisation des noms des rôles par le bot.
- **Persos** : main et rerolls, nom de famille, race, classe, spé, niveau, métiers et recettes, intérêts PvE et PvP. Données de World of Warcraft: Forever (races Skyborne, nouvelles instances).
- **Roster** : filtres par classe, rôle, métier et intérêts, répartition par rôle et par classe, rosters nommés par les officiers.
- **Candidatures** : formulaire de candidature, avis des officiers (+1 / −1 justifié), annonce dans le salon des officiers, décision envoyée en message privé, entrée directe sur le serveur Discord avec le rôle d'arrivée, sans repasser par le questionnaire.
- **Progression** des nouveaux membres : rappel aux officiers après un délai réglable, sans aucune promotion automatique.
- **Sorties Raid-Helper** : liste des sorties à venir, création depuis le site à partir de modèles, inscription et banc depuis le site, modification et suppression, composition du groupe par rôle et par classe, comparaison avec un roster. Images par type de sortie et par instance.
- **Sorties des membres** : chaque membre peut proposer des sorties (hors raids) dans un salon dédié, trois à venir au plus par joueur.
- **Addon InnkeeperSync** : export du registre de guilde et des métiers depuis le jeu, import dans le site avec aperçu, badge « en jeu ».
- **Admin** : membres Discord sans compte sur le site, journal d'audit réservé à l'admin de l'instance, page de confidentialité.
- **Apparence** : palettes Horde, Alliance et multi-faction, logo, bannière et couleur d'accent de la guilde, affichage adapté aux téléphones.
- **Exploitation** : image Docker multi-architecture publiée par la CI, sauvegardes de la base, point de contrôle `/healthz`.

[Non publié]: https://github.com/fmplaw/innkeeper/compare/v0.16.0...HEAD
[0.16.0]: https://github.com/fmplaw/innkeeper/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/fmplaw/innkeeper/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/fmplaw/innkeeper/compare/v0.13.1...v0.14.0
[0.13.1]: https://github.com/fmplaw/innkeeper/compare/v0.13.0...v0.13.1
[0.13.0]: https://github.com/fmplaw/innkeeper/compare/v0.12.2...v0.13.0
[0.12.2]: https://github.com/fmplaw/innkeeper/compare/v0.12.1...v0.12.2
[0.12.1]: https://github.com/fmplaw/innkeeper/compare/v0.12.0...v0.12.1
[0.12.0]: https://github.com/fmplaw/innkeeper/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/fmplaw/innkeeper/compare/v0.10.1...v0.11.0
[0.10.1]: https://github.com/fmplaw/innkeeper/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/fmplaw/innkeeper/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/fmplaw/innkeeper/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/fmplaw/innkeeper/releases/tag/v0.9.0
