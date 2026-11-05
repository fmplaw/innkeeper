CREATE TABLE `recipe_names` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
