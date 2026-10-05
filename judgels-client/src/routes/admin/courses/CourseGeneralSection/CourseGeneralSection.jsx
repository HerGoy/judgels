import { Button, Intent } from '@blueprintjs/core';
import { Edit } from '@blueprintjs/icons';
import { Flex } from '@blueprintjs/labs';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { FormTable } from '../../../../components/forms/FormTable/FormTable';
import {
  buildCourseDescriptionWithLogo,
  cleanCourseDescription,
  extractCourseLogo,
} from '../../../../modules/courseUtils';
import { updateCourseMutationOptions } from '../../../../modules/queries/course';
import CourseGeneralEditForm from '../CourseGeneralEditForm/CourseGeneralEditForm';

import * as toastActions from '../../../../modules/toast/toastActions';

export function CourseGeneralSection({ course }) {
  const updateCourseMutation = useMutation(updateCourseMutationOptions(course.jid));

  const [isEditing, setIsEditing] = useState(false);

  const keyStyles = { width: '250px' };

  const currentLogo = extractCourseLogo(course.description);
  const currentDesc = cleanCourseDescription(course.description);

  const rows = [
    { key: 'slug', title: 'Slug', value: course.slug },
    { key: 'name', title: 'Name', value: course.name },
    {
      key: 'logo',
      title: 'Course Logo',
      value: currentLogo ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={currentLogo}
            alt="Logo"
            style={{
              width: 44,
              height: 44,
              objectFit: 'contain',
              borderRadius: 6,
              background: '#f5f8fa',
              border: '1px solid #e1e8ed',
              padding: 2,
            }}
          />
          <code style={{ fontSize: 11 }}>{currentLogo}</code>
        </div>
      ) : (
        <em style={{ color: '#8a9ba8' }}>No logo set</em>
      ),
    },
    { key: 'description', title: 'Description', value: currentDesc || <em style={{ color: '#8a9ba8' }}>No description</em> },
  ];

  const updateCourse = async data => {
    const fullDesc = buildCourseDescriptionWithLogo(data.description, data.logoUrl);
    await updateCourseMutation.mutateAsync(
      { slug: data.slug, name: data.name, description: fullDesc },
      {
        onSuccess: () => toastActions.showSuccessToast('Course updated.'),
      }
    );
    setIsEditing(false);
  };

  const renderEditButton = () => {
    return (
      !isEditing && (
        <Button small intent={Intent.PRIMARY} icon={<Edit />} onClick={() => setIsEditing(true)}>
          Edit
        </Button>
      )
    );
  };

  const renderContent = () => {
    if (isEditing) {
      const initialValues = {
        slug: course.slug || '',
        name: course.name || '',
        logoUrl: currentLogo,
        description: currentDesc,
      };
      return (
        <CourseGeneralEditForm
          initialValues={initialValues}
          onSubmit={updateCourse}
          onCancel={() => setIsEditing(false)}
        />
      );
    }
    return <FormTable keyStyles={keyStyles} rows={rows} />;
  };

  return (
    <div>
      <Flex asChild justifyContent="space-between" alignItems="baseline">
        <h4>
          <span>General</span>
          {renderEditButton()}
        </h4>
      </Flex>
      {renderContent()}
    </div>
  );
}
