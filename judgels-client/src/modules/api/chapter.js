import { APP_CONFIG } from '../../conf';
import { delete_, get, post } from './http';

export const baseChaptersURL = `${APP_CONFIG.apiUrl}/chapters`;

export function baseChapterURL(chapterJid) {
  return `${baseChaptersURL}/${chapterJid}`;
}

export const chapterAPI = {
  createChapter: (token, data) => {
    return post(baseChaptersURL, token, data);
  },

  updateChapter: (token, chapterJid, data) => {
    return post(`${baseChapterURL(chapterJid)}`, token, data);
  },

  deleteChapter: (token, chapterJid) => {
    return delete_(`${baseChapterURL(chapterJid)}`, token);
  },

  getChapters: token => {
    return get(baseChaptersURL, token);
  },
};
