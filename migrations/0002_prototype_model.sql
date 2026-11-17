-- نموذج v16: أيام وسطور وصور بشكل النموذج المعتمد. الجداول القديمة (days, lines, photos) تبقى بدون حذف.
CREATE TABLE `ledger_days` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`date` text NOT NULL,
	`buy_fils` integer NOT NULL,
	`sell_fils` integer,
	`comm_fils` integer,
	`x_label` text DEFAULT '' NOT NULL,
	`x_fils` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`l_sales` integer, `l_sw` integer, `l_mk` integer, `l_tot` integer, `l_purch` integer, `l_pw` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_days_branch_date` ON `ledger_days` (`branch_id`,`date`);
--> statement-breakpoint
CREATE TABLE `ledger_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`day_id` text NOT NULL,
	`sec` text NOT NULL,
	`position` integer NOT NULL,
	`d` text NOT NULL,
	`g` integer,
	`m` text DEFAULT '' NOT NULL,
	`k` text DEFAULT '' NOT NULL,
	`mk_fils` integer,
	`amount_fils` integer NOT NULL,
	`t` text DEFAULT '' NOT NULL,
	`c` text DEFAULT '' NOT NULL,
	`emp` text DEFAULT '' NOT NULL,
	`x_reason` text, `x_at` integer, `x_by` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ledger_lines_day` ON `ledger_lines` (`branch_id`,`day_id`,`sec`,`position`);
--> statement-breakpoint
CREATE TABLE `day_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`day_id` text NOT NULL,
	`label` text NOT NULL,
	`r2_key` text NOT NULL,
	`bytes` integer NOT NULL,
	`content_type` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`removed_at` integer,
	`removed_by` text
);
--> statement-breakpoint
CREATE INDEX `day_photos_day` ON `day_photos` (`branch_id`,`day_id`);
--> statement-breakpoint
ALTER TABLE `audit_log` ADD `kind` text;
--> statement-breakpoint
ALTER TABLE `audit_log` ADD `title` text;
--> statement-breakpoint
ALTER TABLE `audit_log` ADD `detail` text;
--> statement-breakpoint
ALTER TABLE `audit_log` ADD `day_date` text;
--> statement-breakpoint
ALTER TABLE `audit_log` ADD `who` text;
--> statement-breakpoint
ALTER TABLE `branches` ADD `cats_json` text;
--> statement-breakpoint
ALTER TABLE `branches` ADD `names_json` text;
--> statement-breakpoint
ALTER TABLE `branches` ADD `wa` text;
