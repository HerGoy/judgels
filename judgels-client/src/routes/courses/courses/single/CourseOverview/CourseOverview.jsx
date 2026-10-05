import { Intent } from '@blueprintjs/core';
import { SendMessage } from '@blueprintjs/icons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

import { ButtonLink } from '../../../../../components/ButtonLink/ButtonLink';
import { HtmlText } from '../../../../../components/HtmlText/HtmlText';
import { cleanCourseDescription, extractCourseLogo } from '../../../../../modules/courseUtils';
import { courseBySlugQueryOptions, courseChaptersQueryOptions } from '../../../../../modules/queries/course';

import './CourseOverview.scss';

export default function CourseOverview() {
  const { courseSlug } = useParams({ strict: false });
  const { data: course } = useSuspenseQuery(courseBySlugQueryOptions(courseSlug));
  const {
    data: { data: chapters },
  } = useSuspenseQuery(courseChaptersQueryOptions(course.jid));

  const logoUrl = extractCourseLogo(course.description);
  const cleanDesc = cleanCourseDescription(course.description);

  const renderStartButton = () => {
    if (!chapters || chapters.length === 0) {
      return null;
    }
    return (
      <div>
        <ButtonLink intent={Intent.WARNING} to={`/courses/${course.slug}/chapters/${chapters[0].alias}`}>
          Start first chapter&nbsp;&nbsp;
          <SendMessage />
        </ButtonLink>
      </div>
    );
  };

  return (
    <div className="course-overview">
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
        {logoUrl && (
          <img
            src={logoUrl}
            alt={course.name}
            style={{
              width: 80,
              height: 80,
              objectFit: 'contain',
              borderRadius: 8,
              background: '#f5f8fa',
              padding: 4,
              border: '1px solid #e1e8ed',
            }}
          />
        )}
        <h2 style={{ margin: 0 }}>{course.name}</h2>
      </div>
      <HtmlText>{cleanDesc}</HtmlText>
      <br />
      {renderStartButton()}
    </div>
  );
}
