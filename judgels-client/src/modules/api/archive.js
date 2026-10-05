import { APP_CONFIG } from '../../conf';
import { delete_, get, post } from './http';

export const ArchiveErrors = {
  SlugAlreadyExists: 'ArchiveSlugAlreadyExists',
};

export const baseArchivesURL = `${APP_CONFIG.apiUrl}/archives`;

export function baseArchiveURL(archiveJid) {
  return `${baseArchivesURL}/${archiveJid}`;
}

export const archiveAPI = {
  createArchive: (token, data) => {
    return post(baseArchivesURL, token, data);
  },

  updateArchive: (token, archiveJid, data) => {
    return post(`${baseArchiveURL(archiveJid)}`, token, data);
  },

  deleteArchive: (token, archiveJid) => {
    return delete_(`${baseArchiveURL(archiveJid)}`, token);
  },

  getArchives: token => {
    return get(baseArchivesURL, token);
  },
};
