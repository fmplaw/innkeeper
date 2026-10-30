# Journal des modifications

Toutes les évolutions notables d'Innkeeper sont notées ici. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et les numéros de version suivent [la gestion sémantique de version](https://semver.org/lang/fr/).

## [Non publié]

### Modifié

- README : adresse de l'image Docker publiée et procédure de publication d'une version.

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

[Non publié]: https://github.com/fmplaw/innkeeper/compare/v0.9.1...HEAD
[0.9.1]: https://github.com/fmplaw/innkeeper/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/fmplaw/innkeeper/releases/tag/v0.9.0
