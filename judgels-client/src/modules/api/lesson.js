import { stringify } from 'query-string';
import { delete_, get, post, put } from './http';

export function getLessonName(lesson, language) {
  if (!lesson) return '';
  if (lesson.title) return lesson.title;
  if (!lesson.titlesByLanguage) return lesson.slug || '';
  return (language && lesson.titlesByLanguage[language]) || lesson.titlesByLanguage[lesson.defaultLanguage] || lesson.slug || '';
}

export function constructLessonName(title, alias) {
  return (alias && alias + '. ') + (title || '');
}

export const lessonAPI = {
  getLessons: (token, params) => {
    const query = stringify(params || {});
    return get(`/lessons/api?${query}`, token);
  },

  createLesson: (token, data) => {
    return post('/lessons/api', token, data);
  },

  getLessonDetail: (token, lessonId) => {
    return get(`/lessons/api/${lessonId}`, token);
  },

  updateLesson: (token, lessonId, data) => {
    return put(`/lessons/api/${lessonId}`, token, data);
  },

  deleteLesson: (token, lessonId) => {
    return delete_(`/lessons/api/${lessonId}`, token);
  },

  getLessonBySlug: (token, slug) => {
    return get(`/lessons/api/by-slug/${encodeURIComponent(slug)}`, token);
  },
};
