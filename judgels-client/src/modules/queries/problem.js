import { queryOptions } from '@tanstack/react-query';

import { problemAPI } from '../api/problem';
import { queryClient } from '../queryClient';
import { getToken } from '../session';

export const problemsQueryOptions = params => {
  const { tags, page } = params || {};
  return queryOptions({
    queryKey: ['problems', ...(params ? [params] : [])],
    queryFn: () => problemAPI.getProblems(getToken(), tags, page),
  });
};

export const problemTagsQueryOptions = () =>
  queryOptions({
    queryKey: ['problem-tags'],
    queryFn: () => problemAPI.getProblemTags(),
  });

export const manageableProblemsQueryOptions = params => {
  const { page, term } = params || {};
  return queryOptions({
    queryKey: ['manageable-problems', ...(params ? [params] : [])],
    queryFn: () => problemAPI.getManageableProblems(getToken(), page, term),
  });
};

export const createProblemMutationOptions = () => ({
  mutationFn: data => problemAPI.createProblem(getToken(), data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['manageable-problems'] });
  },
});

export const deleteProblemMutationOptions = () => ({
  mutationFn: problemId => problemAPI.deleteProblem(getToken(), problemId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['manageable-problems'] });
  },
});

export const problemDetailQueryOptions = (problemId, lang) =>
  queryOptions({
    queryKey: ['problem-detail', String(problemId), lang || 'default'],
    queryFn: () => problemAPI.getProblemDetail(getToken(), problemId, lang),
  });

export const updateProblemGeneralMutationOptions = problemId => ({
  mutationFn: data => problemAPI.updateProblemGeneral(getToken(), problemId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
    queryClient.invalidateQueries({ queryKey: ['manageable-problems'] });
  },
});

export const updateProblemStatementMutationOptions = problemId => ({
  mutationFn: data => problemAPI.updateProblemStatement(getToken(), problemId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
  },
});

export const addProblemStatementLanguageMutationOptions = problemId => ({
  mutationFn: data => problemAPI.addProblemStatementLanguage(getToken(), problemId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
  },
});

export const updateProblemGradingMutationOptions = problemId => ({
  mutationFn: data => problemAPI.updateProblemGrading(getToken(), problemId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
  },
});

export const problemTestDataQueryOptions = problemId =>
  queryOptions({
    queryKey: ['problem-testdata', String(problemId)],
    queryFn: () => problemAPI.getProblemTestData(getToken(), problemId),
  });

export const uploadProblemTestDataMutationOptions = problemId => ({
  mutationFn: formData => problemAPI.uploadProblemTestData(getToken(), problemId, formData),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
    queryClient.invalidateQueries({ queryKey: ['problem-testdata', String(problemId)] });
  },
});

export const deleteProblemTestDataMutationOptions = problemId => ({
  mutationFn: filename => problemAPI.deleteProblemTestData(getToken(), problemId, filename),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
    queryClient.invalidateQueries({ queryKey: ['problem-testdata', String(problemId)] });
  },
});

export const autoPopulateProblemTestDataMutationOptions = problemId => ({
  mutationFn: () => problemAPI.autoPopulateProblemTestData(getToken(), problemId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
    queryClient.invalidateQueries({ queryKey: ['problem-testdata', String(problemId)] });
  },
});

export const problemSubmissionsQueryOptions = (problemId, page) =>
  queryOptions({
    queryKey: ['problem-submissions', String(problemId), page || 1],
    queryFn: () => problemAPI.getProblemSubmissions(getToken(), problemId, page),
  });

export const submitProblemSolutionMutationOptions = problemId => ({
  mutationFn: data => problemAPI.submitProblemSolution(getToken(), problemId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-submissions', String(problemId)] });
  },
});

export const commitProblemChangesMutationOptions = problemId => ({
  mutationFn: data => problemAPI.commitProblemChanges(getToken(), problemId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
    queryClient.invalidateQueries({ queryKey: ['manageable-problems'] });
  },
});

export const discardProblemChangesMutationOptions = problemId => ({
  mutationFn: () => problemAPI.discardProblemChanges(getToken(), problemId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
    queryClient.invalidateQueries({ queryKey: ['problem-testdata', String(problemId)] });
  },
});

export const problemPartnersQueryOptions = problemId =>
  queryOptions({
    queryKey: ['problem-partners', String(problemId)],
    queryFn: () => problemAPI.getProblemPartners(getToken(), problemId),
  });

export const addProblemPartnerMutationOptions = problemId => ({
  mutationFn: data => problemAPI.addProblemPartner(getToken(), problemId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-partners', String(problemId)] });
  },
});

export const deleteProblemPartnerMutationOptions = problemId => ({
  mutationFn: username => problemAPI.deleteProblemPartner(getToken(), problemId, username),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-partners', String(problemId)] });
  },
});

export const problemHelpersQueryOptions = problemId =>
  queryOptions({
    queryKey: ['problem-helpers', String(problemId)],
    queryFn: () => problemAPI.getProblemHelpers(getToken(), problemId),
  });

export const uploadProblemHelperMutationOptions = problemId => ({
  mutationFn: formData => problemAPI.uploadProblemHelper(getToken(), problemId, formData),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-helpers', String(problemId)] });
    queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
  },
});

export const deleteProblemHelperMutationOptions = problemId => ({
  mutationFn: filename => problemAPI.deleteProblemHelper(getToken(), problemId, filename),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['problem-helpers', String(problemId)] });
    queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
  },
});
