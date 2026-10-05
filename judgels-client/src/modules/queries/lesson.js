import { queryOptions } from '@tanstack/react-query';

import { lessonAPI } from '../api/lesson';
import { queryClient } from '../queryClient';
import { getToken } from '../session';

export const lessonsQueryOptions = (page = 1, term = '') =>
  queryOptions({
    queryKey: ['manageable-lessons', page, term],
    queryFn: () => lessonAPI.getLessons(getToken(), { page, term }),
  });

export const lessonDetailQueryOptions = lessonId =>
  queryOptions({
    queryKey: ['lesson-detail', String(lessonId)],
    queryFn: () => lessonAPI.getLessonDetail(getToken(), lessonId),
  });

export const createLessonMutationOptions = () => ({
  mutationFn: data => lessonAPI.createLesson(getToken(), data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['manageable-lessons'] });
  },
});

export const updateLessonMutationOptions = lessonId => ({
  mutationFn: data => lessonAPI.updateLesson(getToken(), lessonId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['lesson-detail', String(lessonId)] });
    queryClient.invalidateQueries({ queryKey: ['manageable-lessons'] });
  },
});

export const deleteLessonMutationOptions = () => ({
  mutationFn: lessonId => lessonAPI.deleteLesson(getToken(), lessonId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['manageable-lessons'] });
  },
});
