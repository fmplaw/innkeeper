# Innkeeper Sync

Exports your guild roster, professions and recipes from World of Warcraft: Forever for [Innkeeper](https://github.com/fmplaw/innkeeper), a self-hosted guild portal. Nothing is sent anywhere by the addon: the game writes the export to `WTF/Account/<ACCOUNT>/SavedVariables/InnkeeperSync.lua`, and the InnkeeperSync desktop app (or an officer) uploads it to the guild site.

Exporte le registre de guilde, les métiers et les recettes pour Innkeeper, le portail de la guilde. L'addon n'envoie rien : le jeu écrit l'export dans `SavedVariables/InnkeeperSync.lua`, que l'application InnkeeperSync (ou un officier) envoie au site de la guilde.

## 1.2.0

- Forever-specific TOC (`InnkeeperSync_Camelot.toc`), English description with a French translation, published on CurseForge and Wago.
- Fichier TOC propre à Forever, description anglaise avec traduction française, publication sur CurseForge et Wago.

## 1.1.0

- Renamed from GuildSiteSync to InnkeeperSync (`/innkeeper` or `/ik`).
- Renommé de GuildSiteSync en InnkeeperSync (`/innkeeper` ou `/ik`).

## 1.0.0

- Guild roster (level, class, rank, last online), guild professions, own professions and known recipes.
- Registre de guilde (niveau, classe, rang, dernière connexion), métiers de la guilde, métiers et recettes du perso.
