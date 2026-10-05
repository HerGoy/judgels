import { stringify } from 'query-string';

import { APP_CONFIG } from '../../conf';
import { delete_, get, post, postMultipart, put } from './http';

export const ProblemType = {
  Programming: 'PROGRAMMING',
  Bundle: 'BUNDLE',
};

export function getProblemName(problem, language) {
  return (language && problem.titlesByLanguage[language]) || problem.titlesByLanguage[problem.defaultLanguage];
}

export function constructProblemName(title, alias) {
  return (alias ? alias + '. ' : '') + (title || '');
}

export const baseProblemsURL = `${APP_CONFIG.apiUrl}/problems`;

export const problemAPI = {
  getProblems: (token, tags, page) => {
    const params = stringify({ tags, page });
    return get(`${baseProblemsURL}?${params}`, token);
  },

  getProblemTags: () => {
    return get(`${baseProblemsURL}/tags`);
  },

  getManageableProblems: (token, page, term) => {
    const params = stringify({ page, term });
    return get(`/problems/api?${params}`, token);
  },

  createProblem: (token, data) => {
    return post('/problems/api', token, data);
  },

  deleteProblem: (token, problemId) => {
    return delete_(`/problems/api/${problemId}`, token);
  },

  getProblemDetail: (token, problemId, lang) => {
    const params = lang ? `?lang=${encodeURIComponent(lang)}` : '';
    return get(`/problems/api/${problemId}${params}`, token);
  },

  updateProblemGeneral: (token, problemId, data) => {
    return put(`/problems/api/${problemId}/general`, token, data);
  },

  getProblemStatement: (token, problemId, language) => {
    const params = language ? `?language=${encodeURIComponent(language)}` : '';
    return get(`/problems/api/${problemId}/statement${params}`, token);
  },

  updateProblemStatement: (token, problemId, data) => {
    return put(`/problems/api/${problemId}/statement`, token, data);
  },

  addProblemStatementLanguage: (token, problemId, data) => {
    return post(`/problems/api/${problemId}/statement/languages`, token, data);
  },

  updateProblemGrading: (token, problemId, data) => {
    return put(`/problems/api/${problemId}/grading`, token, data);
  },

  getProblemTestData: (token, problemId) => {
    return get(`/problems/api/${problemId}/testdata`, token);
  },

  uploadProblemTestData: (token, problemId, formData) => {
    return postMultipart(`/problems/api/${problemId}/testdata/upload`, token, formData);
  },

  deleteProblemTestData: (token, problemId, filename) => {
    return delete_(`/problems/api/${problemId}/testdata/${encodeURIComponent(filename)}`, token);
  },

  autoPopulateProblemTestData: (token, problemId) => {
    return post(`/problems/api/${problemId}/testdata/auto-populate`, token, {});
  },

  getProblemSubmissions: (token, problemId, page) => {
    const params = stringify({ page: page || 1 });
    return get(`/problems/api/${problemId}/submissions?${params}`, token);
  },

  submitProblemSolution: (token, problemId, data) => {
    return post(`/problems/api/${problemId}/submissions`, token, data);
  },

  getProblemSubmissionDetail: (token, problemId, submissionId) => {
    return get(`/problems/api/${problemId}/submissions/${submissionId}`, token);
  },

  commitProblemChanges: (token, problemId, data) => {
    return post(`/problems/api/${problemId}/versions/commit`, token, data);
  },

  discardProblemChanges: (token, problemId) => {
    return post(`/problems/api/${problemId}/versions/discard`, token, {});
  },

  getBundleItems: (token, problemId) => {
    return get(`/problems/api/${problemId}/bundle/items`, token);
  },

  createBundleItem: (token, problemId, data) => {
    return post(`/problems/api/${problemId}/bundle/items`, token, data);
  },

  updateBundleItem: (token, problemId, itemJid, data) => {
    return put(`/problems/api/${problemId}/bundle/items/${itemJid}`, token, data);
  },

  deleteBundleItem: (token, problemId, itemJid) => {
    return delete_(`/problems/api/${problemId}/bundle/items/${itemJid}`, token);
  },

  moveBundleItem: (token, problemId, itemJid, direction) => {
    return post(`/problems/api/${problemId}/bundle/items/${itemJid}/move-${direction}`, token, {});
  },

  getProblemPartners: (token, problemId) => {
    return get(`/problems/api/${problemId}/partners`, token);
  },

  addProblemPartner: (token, problemId, data) => {
    return post(`/problems/api/${problemId}/partners`, token, data);
  },

  deleteProblemPartner: (token, problemId, username) => {
    return delete_(`/problems/api/${problemId}/partners/${encodeURIComponent(username)}`, token);
  },

  getProblemHelpers: (token, problemId) => {
    return get(`/problems/api/${problemId}/helpers`, token);
  },

  uploadProblemHelper: (token, problemId, formData) => {
    return postMultipart(`/problems/api/${problemId}/helpers/upload`, token, formData);
  },

  deleteProblemHelper: (token, problemId, filename) => {
    return delete_(`/problems/api/${problemId}/helpers/${encodeURIComponent(filename)}`, token);
  },
};
