# 02 — الشاشات

المرجع: النموذج المعتمد v16 في `prototype/` (افتح `prototype/index.html`). الواجهة في `web/src/` منقولة منه حرفيًا.

| الشاشة | الملف | من النموذج |
|---|---|---|
| الدخول وإعداد أول مرة | `views/login.ts` | viewLogin (+ بصمة واسترجاع حقيقي) |
| الإطار والقائمة والشريط السفلي | `ui.ts` | shell, navFor, tabsFor |
| اللوحة | `views/dash.ts`, `views/chart.ts` | viewDash, attnCard, dayBar, tilesRow, panel, chartBars |
| التقارير والطباعة | `views/reports.ts` | viewReports, detailT |
| الأيام | `views/days.ts` | viewDays |
| الإدخال (4 خطوات) | `views/entry.ts` | viewEntry, dayHead, stepNav, stepSales/Purch/Exp/Check |
| النوافذ | `views/dialogs.ts` | lineDialog, dayDataDialog, newDayDialog, pricesDialog |
| أثناء الكتابة | `views/live.ts` | liveUpdate, sug*, splitDot, showDup |
| صور الدفتر | `views/viewer.ts`, `views/photo-io.ts` | syncViewer, photosDialog, addFiles |
| البحث | `views/search.ts` | viewSearch, parseQuery, searchHits |
| الواتساب | `views/wa.ts` | waText, waDialog |
| السجل، المستخدمون، الإعدادات | `views/admin.ts` | viewLog, viewUsers, viewSettings |
| الأحداث | `events.ts` | ACTS والمستمعون |
