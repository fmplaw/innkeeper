ALTER TABLE `local_admins` ADD `must_change_password` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `local_admins` ADD `created_by` text;