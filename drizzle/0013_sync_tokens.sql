CREATE TABLE `sync_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`token_hash` text NOT NULL,
	`hint` text NOT NULL,
	`last_used_at` integer,
	`last_file_hash` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_tokens_hash_idx` ON `sync_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sync_tokens_user_idx` ON `sync_tokens` (`user_id`);