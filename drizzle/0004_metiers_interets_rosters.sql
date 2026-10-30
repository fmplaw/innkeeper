CREATE TABLE `roster_members` (
	`roster_id` integer NOT NULL,
	`character_id` integer NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`roster_id`, `character_id`),
	FOREIGN KEY (`roster_id`) REFERENCES `rosters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rosters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`visibility` text DEFAULT 'members' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `characters` ADD `recipes` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `pve` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `pvp` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `interests_updated_at` integer;--> statement-breakpoint
-- Métiers déjà saisis : ["alchemy", …] devient [{"id": "alchemy", "level": null}, …].
UPDATE `characters` SET `professions` = (
	SELECT json_group_array(json_object('id', value, 'level', NULL)) FROM json_each(`characters`.`professions`)
) WHERE json_array_length(`professions`) > 0 AND json_type(`professions`, '$[0]') = 'text';
