import { ContentCardLink } from '../../../../components/ContentCardLink/ContentCardLink';
import { HtmlText } from '../../../../components/HtmlText/HtmlText';
import { ProgressBar } from '../../../../components/ProgressBar/ProgressBar';
import { ProgressTag } from '../../../../components/ProgressTag/ProgressTag';
import { cleanCourseDescription, extractCourseLogo } from '../../../../modules/courseUtils';

import './CourseCard.scss';

export function CourseCard({ course: { slug, name, description }, progress }) {
  const logoUrl = extractCourseLogo(description);
  const cleanDesc = cleanCourseDescription(description);

  const renderProgress = () => {
    if (!progress || progress.totalProblems === 0) {
      return null;
    }

    const { solvedProblems, totalProblems } = progress;

    return (
      <ProgressTag num={solvedProblems} denom={totalProblems}>
        {solvedProblems} / {totalProblems} problems completed
      </ProgressTag>
    );
  };

  const renderProgressBar = () => {
    if (!progress) {
      return null;
    }
    return <ProgressBar num={progress.solvedProblems} denom={progress.totalProblems} />;
  };

  return (
    <ContentCardLink to={`/courses/${slug}`} className="course-card">
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {logoUrl && (
          <div
            style={{
              width: 60,
              height: 60,
              flexShrink: 0,
              borderRadius: 8,
              overflow: 'hidden',
              background: '#f5f8fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e1e8ed',
              padding: 4,
            }}
          >
            <img src={logoUrl} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <h4 className="course-card__title" style={{ margin: 0 }}>
              {name}
            </h4>
            {renderProgress()}
          </div>
          {cleanDesc && (
            <small style={{ display: 'block', marginTop: 8, color: '#5c7080' }}>
              <HtmlText>{cleanDesc}</HtmlText>
            </small>
          )}
        </div>
      </div>
      {renderProgressBar()}
    </ContentCardLink>
  );
}
