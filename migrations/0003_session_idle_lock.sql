-- قفل التطبيق بعد عدم الاستخدام: آخر نشاط للجلسة.
ALTER TABLE `sessions` ADD `last_active` integer;
