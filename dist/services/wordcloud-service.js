"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENGLISH_STOPWORDS = exports.SPANISH_STOPWORDS = void 0;
exports.generateWordCloud = generateWordCloud;
exports.SPANISH_STOPWORDS = new Set([
    'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
    'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o',
    'este', 'sí', 'porque', 'este', 'entre', 'porque', 'cuando', 'muy', 'sin', 'sobre',
    'todo', 'también', 'me', 'hasta', 'hay', 'donde', 'quien', 'qué', 'fue', 'era',
    'solo', 'vez', 'esta', 'son', 'ser', 'han', 'tiene', 'tenía', 'había', 'sea',
    'sido', 'gran', 'aún', 'cual', 'cómo', 'das', 'mais', 'ele', 'na', 'um', 'pra',
    'está', 'están', 'estaba', 'estado', 'he', 'has', 'hemos', 'haber', 'muy',
    'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'otros', 'otras', 'mismo',
    'misma', 'mismos', 'mismas', 'tan', 'tanto', 'ni', 'ello', 'ellos', 'ellas',
    'eso', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas',
    'estos', 'estas', 'este', 'esta', 'esto', 'la', 'lo', 'le', 'les', 'nos',
    'os', 'te', 'se', 'me', 'mi', 'tu', 'su', 'nuestro', 'vuestro',
]);
exports.ENGLISH_STOPWORDS = new Set([
    'the', 'and', 'a', 'an', 'in', 'on', 'to', 'for', 'of', 'with', 'is', 'was', 'are',
    'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our',
    'their', 'this', 'that', 'these', 'those', 'some', 'any', 'no', 'not', 'so', 'if',
    'but', 'or', 'because', 'as', 'until', 'while', 'at', 'up', 'down', 'by',
    'about', 'between', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'just', 'now', 'here', 'there', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'such', 'only', 'own', 'same', 'than', 'too',
    'very', 'just', 'also', 'well', 'back', 'still', 'then', 'than',
]);
function cleanWord(w) {
    return w.replace(/[^a-záéíóúàâãêôõçüñA-ZÁÉÍÓÚÀÂÃÊÔÕÇÜÑ']/g, '').toLowerCase().trim();
}
function generateWordCloud(data, limit = 100) {
    const messages = data.messages.filter(m => !m.isSystem);
    const wordCount = {};
    for (const m of messages) {
        const words = m.text.split(/\s+/);
        for (const w of words) {
            const cleaned = cleanWord(w);
            if (cleaned.length < 2)
                continue;
            if (exports.SPANISH_STOPWORDS.has(cleaned))
                continue;
            if (exports.ENGLISH_STOPWORDS.has(cleaned))
                continue;
            wordCount[cleaned] = (wordCount[cleaned] || 0) + 1;
        }
    }
    return Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([word, count]) => ({ word, count }));
}
