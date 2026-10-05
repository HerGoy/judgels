import { Button, Intent } from '@blueprintjs/core';
import { ChevronRight, Edit, Home } from '@blueprintjs/icons';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { LoadingState } from '../../../../../../../../components/LoadingState/LoadingState';
import { ChapterProblemProgressTag } from '../../../../../../../../components/VerdictProgressTag/ChapterProblemProgressTag';
import { sendGAEvent } from '../../../../../../../../ga';
import { VerdictCode } from '../../../../../../../../modules/api/gradingVerdict';
import { ProblemType } from '../../../../../../../../modules/api/problem';
import { chapterProblemWorksheetQueryOptions } from '../../../../../../../../modules/queries/chapterProblem';
import {
  courseBySlugQueryOptions,
  courseChapterQueryOptions,
  courseChaptersQueryOptions,
} from '../../../../../../../../modules/queries/course';
import { problemDetailQueryOptions } from '../../../../../../../../modules/queries/problem';
import { useSession } from '../../../../../../../../modules/session';
import { useWebPrefs } from '../../../../../../../../modules/webPrefs';
import { createDocumentTitle } from '../../../../../../../../utils/title';
import { ChapterNavigation } from '../../resources/ChapterNavigation/ChapterNavigation';
import BundleChapterProblemPage from './Bundle/ChapterProblemPage';
import ChapterProblemProgrammingLayout from './Programming/ChapterProblemLayout';

import './ChapterProblemLayout.scss';

export default function ChapterProblemLayout() {
  const { courseSlug, chapterAlias, problemAlias } = useParams({ strict: false });
  const navigate = useNavigate();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data: course } = useSuspenseQuery(courseBySlugQueryOptions(courseSlug));
  const { data: chapter } = useSuspenseQuery(courseChapterQueryOptions(course.jid, chapterAlias));
  const {
    data: { data: chapters },
  } = useSuspenseQuery(courseChaptersQueryOptions(course.jid));
  const { statementLanguage } = useWebPrefs();

  const { data: response } = useQuery(
    chapterProblemWorksheetQueryOptions(chapter.jid, problemAlias, { language: statementLanguage })
  );

  const problemJid = response?.problem?.problemJid;
  const { data: problemDetail } = useQuery({
    ...problemDetailQueryOptions(problemJid),
    enabled: !!user && !!problemJid,
    retry: false,
    staleTime: 60 * 1000,
  });

  const prevProgressRef = useRef(response?.progress);

  useEffect(() => {
    if (response) {
      document.title = createDocumentTitle(`${chapterAlias} / ${response.problem.alias}`);

      sendGAEvent({ category: 'Courses', action: 'View course problem', label: course.name });
      sendGAEvent({ category: 'Courses', action: 'View chapter problem', label: chapter.name });
      sendGAEvent({
        category: 'Courses',
        action: 'View problem',
        label: chapter.name + ': ' + problemAlias,
      });
    }
  }, [response?.problem?.alias]);

  useEffect(() => {
    if (response) {
      checkEditorial(prevProgressRef.current, response.progress);
      prevProgressRef.current = response.progress;
    }
  }, [response?.progress]);

  const reloadProblem = () => {
    queryClient.invalidateQueries(chapterProblemWorksheetQueryOptions(chapter.jid, problemAlias));
    queryClient.invalidateQueries(courseChaptersQueryOptions(course.jid));
  };

  const checkEditorial = (oldProgress, newProgress) => {
    if (
      oldProgress &&
      oldProgress.verdict !== VerdictCode.AC &&
      newProgress?.verdict == VerdictCode.AC &&
      response.editorial
    ) {
      const problemEditorialEl = document.querySelector('.chapter-problem-editorial');
      if (problemEditorialEl) {
        problemEditorialEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const renderHeader = () => {
    const problemTitle = response && response.worksheet.statement.title;

    return (
      <div className="chapter-problem-page__title">
        <h3>
          <Link className="chapter-problem-page__title--link" to={`/courses/${course.slug}`}>
            <Home />
          </Link>
          &nbsp;
          <ChevronRight className="chapter-problem-page__title--chevron" size={20} />
          &nbsp;
          <Link className="chapter-problem-page__title--link" to={`/courses/${course.slug}/chapters/${chapterAlias}`}>
            {chapterAlias}
          </Link>
          &nbsp;
          <ChevronRight className="chapter-problem-page__title--chevron" size={20} />
          &nbsp;
          {problemAlias}. {problemTitle}
        </h3>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {problemDetail && (
            <Button
              small
              style={{ whiteSpace: 'nowrap' }}
              intent={problemDetail.canEdit ? Intent.PRIMARY : Intent.NONE}
              icon={<Edit />}
              text={problemDetail.canEdit ? 'Edit problem' : 'View in manager'}
              onClick={() => navigate({ to: `/admin/problems/${problemDetail.id || problemJid}` })}
            />
          )}
          {renderProgress()}
          {renderNavigation()}
        </div>
      </div>
    );
  };

  const renderProgress = () => {
    if (!response) {
      return null;
    }

    const { progress } = response;
    if (!progress) {
      return null;
    }

    return <ChapterProblemProgressTag verdict={progress.verdict} />;
  };

  const renderNavigation = ({ hidePrev } = { hidePrev: false }) => {
    if (!response) {
      return null;
    }

    const { progress, previousResourcePath, nextResourcePath } = response;
    return (
      <ChapterNavigation
        courseSlug={course.slug}
        chapterAlias={chapterAlias}
        previousResourcePath={hidePrev ? null : previousResourcePath}
        nextResourcePath={nextResourcePath}
        chapters={chapters}
        disableNext={progress?.verdict !== VerdictCode.AC}
      />
    );
  };

  const renderContent = () => {
    if (!response) {
      return <LoadingState />;
    }

    const worksheet = response;
    const problemType = worksheet.problem?.type;

    if (problemType === ProblemType.Bundle) {
      return <BundleChapterProblemPage worksheet={worksheet} renderNavigation={renderNavigation} />;
    }

    return (
      <ChapterProblemProgrammingLayout
        worksheet={worksheet}
        renderNavigation={renderNavigation}
        reloadProblem={reloadProblem}
      />
    );
  };

  return (
    <div className="chapter-problem-page">
      {renderHeader()}
      {renderContent()}
    </div>
  );
}
