CREATE TABLE `setup_codes` (
	`code_hash` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer
);
