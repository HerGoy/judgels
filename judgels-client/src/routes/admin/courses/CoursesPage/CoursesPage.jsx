import { Alert, Button, HTMLTable, Intent } from '@blueprintjs/core';
import { Edit, Trash } from '@blueprintjs/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { ActionButtons } from '../../../../components/ActionButtons/ActionButtons';
import { ContentCard } from '../../../../components/ContentCard/ContentCard';
import { LoadingContentCard } from '../../../../components/LoadingContentCard/LoadingContentCard';
import { coursesQueryOptions, deleteCourseMutationOptions } from '../../../../modules/queries/course';
import { CourseCreateDialog } from '../CourseCreateDialog/CourseCreateDialog';

import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';

export default function CoursesPage() {
  const navigate = useNavigate();
  const [courseToDelete, setCourseToDelete] = useState(null);

  const { data: response } = useQuery(coursesQueryOptions());
  const deleteMutation = useMutation(deleteCourseMutationOptions());

  const renderCourses = () => {
    if (!response) {
      return <LoadingContentCard />;
    }

    const { data: courses } = response;
    if (courses.length === 0) {
      return (
        <p>
          <small>No courses.</small>
        </p>
      );
    }

    const rows = courses.map(course => (
      <tr key={course.jid}>
        <td style={{ width: '60px', verticalAlign: 'middle' }}>{course.id}</td>
        <td style={{ width: '200px', verticalAlign: 'middle' }}>
          <Link to={`/admin/courses/${course.slug}`} style={{ fontWeight: 600 }}>
            {course.slug}
          </Link>
        </td>
        <td style={{ verticalAlign: 'middle' }}>{course.name}</td>
        <td style={{ width: '160px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
          <div className="action-button-group" style={{ justifyContent: 'center' }}>
            <Button
              small
              intent={Intent.PRIMARY}
              icon={<Edit />}
              text="Manage"
              onClick={() => navigate({ to: `/admin/courses/${course.slug}` })}
            />
            <Button
              small
              minimal
              intent={Intent.DANGER}
              icon={<Trash />}
              onClick={() => setCourseToDelete(course)}
              title="Delete course"
            />
          </div>
        </td>
      </tr>
    ));

    return (
      <HTMLTable striped className="table-list-condensed">
        <thead>
          <tr>
            <th style={{ width: '60px' }}>ID</th>
            <th style={{ width: '200px' }}>Slug</th>
            <th>Name</th>
            <th style={{ width: '160px', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </HTMLTable>
    );
  };

  const renderAction = () => {
    return (
      <ActionButtons>
        <CourseCreateDialog />
      </ActionButtons>
    );
  };

  return (
    <ContentCard title="Courses">
      {renderAction()}
      {renderCourses()}

      <Alert
        isOpen={courseToDelete !== null}
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        intent={Intent.DANGER}
        icon="trash"
        loading={deleteMutation.isPending}
        onCancel={() => setCourseToDelete(null)}
        onConfirm={() => {
          if (courseToDelete) {
            deleteMutation.mutate(courseToDelete.jid, {
              onSuccess: () => {
                showSuccessToast(`Course "${courseToDelete.name}" deleted successfully.`);
                setCourseToDelete(null);
              },
              onError: err => {
                showErrorToast(err?.response?.data?.message || err?.message || 'Failed to delete course.');
              },
            });
          }
        }}
      >
        Are you sure you want to delete course <strong>{courseToDelete?.name}</strong>? This action will also detach its
        chapters.
      </Alert>
    </ContentCard>
  );
}
