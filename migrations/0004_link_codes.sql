-- رمز ربط جهاز جديد (D-30): 6 أرقام، 10 دقائق، مرة واحدة، 5 محاولات خاطئة تلغيه.
CREATE TABLE `link_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`used_at` integer
);
CREATE INDEX `link_codes_user` ON `link_codes` (`user_id`);
