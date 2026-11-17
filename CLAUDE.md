# نظام الذهب — تعليمات العمل

- المستخدم مبتدئ على Windows. الكلام بالخليجي البسيط، جمل قصيرة، بدون مصطلحات.
- المرجع بالترتيب: `docs/decisions.md` ثم باقي `docs/`.
- مرحلة واحدة في كل مرة حسب `docs/07-roadmap.md`.
- قبل أي commit: `npm run check` (typecheck + lint + test) لازم ينجح.
- ممنوع: حذف أي بيانات، أسرار في الكود أو Git، تعديل أرقام التحقق في `shared/domain/verification.test.ts`.
- أي شيء غير واضح يُكتب في `docs/open-questions.md`. الأفكار الجديدة في «بعدين».
- الطبقات: routes ← services ← repo ← db. المنطق النقي في `shared/domain`. `branchId` من الجلسة في كل وصول للبيانات.
- آخر كل جلسة: سطر في `docs/progress.md`.
