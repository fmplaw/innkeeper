-- Remise en ordre avant l'index : un seul main par joueur (le plus récent est
-- conservé), et un main désigné (le plus ancien perso) pour ceux qui n'en ont pas.
UPDATE `characters` SET `is_main` = 0
WHERE `is_main` = 1 AND `id` NOT IN (
	SELECT MAX(`id`) FROM `characters` WHERE `is_main` = 1 GROUP BY `user_id`
);--> statement-breakpoint
UPDATE `characters` SET `is_main` = 1
WHERE `id` IN (
	SELECT MIN(`id`) FROM `characters` GROUP BY `user_id`
	HAVING SUM(`is_main`) = 0
);--> statement-breakpoint
CREATE UNIQUE INDEX `characters_one_main_per_user` ON `characters` (`user_id`) WHERE is_main = 1;
