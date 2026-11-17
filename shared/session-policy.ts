/** مدة الدخول وقفل عدم الاستخدام (D-26). */
export const SESSION_TTL = { owner: 30 * 24 * 60 * 60 * 1000, entry: 12 * 60 * 60 * 1000 } as const;
export const IDLE_LOCK = { owner: 5 * 60 * 1000, entry: 15 * 60 * 1000 } as const;
/** الواجهة ترسل «أنا موجود» كل دقيقة على الأكثر وقت الاستخدام. */
export const PING_EVERY = 60 * 1000;
