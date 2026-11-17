CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`branch_id` text NOT NULL,
	`user_id` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`reason` text,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_branch_at` ON `audit_log` (`branch_id`,`at`);--> statement-breakpoint
CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`country_code` text NOT NULL,
	`timezone` text NOT NULL,
	`week_start` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge` text NOT NULL,
	`user_id` text,
	`expires_at` integer NOT NULL,
	`used_at` integer
);
--> statement-breakpoint
CREATE TABLE `days` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`date` text NOT NULL,
	`gold_price_fils` integer,
	`note` text DEFAULT '' NOT NULL,
	`ledger_sales_fils` integer,
	`ledger_sales_cg` integer,
	`ledger_purchases_fils` integer,
	`ledger_purchases_cg` integer,
	`ledger_expenses_fils` integer,
	`ledger_wages_fils` integer,
	`status` text DEFAULT 'not_compared' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `days_branch_date` ON `days` (`branch_id`,`date`);--> statement-breakpoint
CREATE TABLE `lines` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`day_id` text NOT NULL,
	`kind` text NOT NULL,
	`position` integer NOT NULL,
	`description` text NOT NULL,
	`search_text` text NOT NULL,
	`pieces` integer DEFAULT 0 NOT NULL,
	`weight_cg` integer DEFAULT 0 NOT NULL,
	`amount_fils` integer NOT NULL,
	`wages_fils` integer DEFAULT 0 NOT NULL,
	`commission_fils` integer DEFAULT 0 NOT NULL,
	`extra_fils` integer DEFAULT 0 NOT NULL,
	`cancelled` integer DEFAULT false NOT NULL,
	`cancel_reason` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `lines_day` ON `lines` (`branch_id`,`day_id`);--> statement-breakpoint
CREATE INDEX `lines_kind` ON `lines` (`branch_id`,`kind`);--> statement-breakpoint
CREATE TABLE `passkeys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer NOT NULL,
	`transports` text,
	`label` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `passkeys_user` ON `passkeys` (`user_id`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`day_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`bytes` integer NOT NULL,
	`content_type` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `photos_day` ON `photos` (`branch_id`,`day_id`);--> statement-breakpoint
CREATE TABLE `recovery_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`used_at` integer
);
--> statement-breakpoint
CREATE INDEX `recovery_user` ON `recovery_codes` (`user_id`);--> statement-breakpoint
CREATE TABLE `security_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`branch_id` text,
	`user_id` text,
	`event` text NOT NULL,
	`ip` text,
	`user_agent` text,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`name` text NOT NULL,
	`username` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`password_hash` text,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username` ON `users` (`username`);