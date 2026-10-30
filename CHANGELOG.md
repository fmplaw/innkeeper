# Journal des modifications

Toutes les évolutions notables d'Innkeeper sont notées ici. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et les numéros de version suivent [la gestion sémantique de version](https://semver.org/lang/fr/).

## [Non publié]

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

[Non publié]: https://github.com/fmplaw/innkeeper/compare/v0.10.1...HEAD
[0.10.1]: https://github.com/fmplaw/innkeeper/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/fmplaw/innkeeper/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/fmplaw/innkeeper/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/fmplaw/innkeeper/releases/tag/v0.9.0
