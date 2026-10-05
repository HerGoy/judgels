import { Button, Intent } from '@blueprintjs/core';
import { ChevronLeft, ChevronRight, Document, Edit, Layers, ManuallyEnteredData } from '@blueprintjs/icons';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, Outlet, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect } from 'react';

import ContentWithSidebar from '../../../../../../components/ContentWithSidebar/ContentWithSidebar';
import { FullWidthPageLayout } from '../../../../../../components/FullWidthPageLayout/FullWidthPageLayout';
import { ProblemType } from '../../../../../../modules/api/problem';
import { problemDetailQueryOptions } from '../../../../../../modules/queries/problem';
import {
  problemSetBySlugQueryOptions,
  problemSetProblemQueryOptions,
} from '../../../../../../modules/queries/problemSet';
import { useSession } from '../../../../../../modules/session';
import { createDocumentTitle } from '../../../../../../utils/title';
import ProblemReportWidget from './ProblemReportWidget/ProblemReportWidget';

import './SingleProblemSetProblemLayout.scss';

export default function SingleProblemSetProblemLayout() {
  const { problemSetSlug, problemAlias } = useParams({ strict: false });
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: problemSet } = useSuspenseQuery(problemSetBySlugQueryOptions(problemSetSlug));
  const { data: problem } = useSuspenseQuery(problemSetProblemQueryOptions(problemSet.jid, problemAlias));

  const { data: problemDetail } = useQuery({
    ...problemDetailQueryOptions(problem.problemJid),
    enabled: !!user && !!problem.problemJid,
    retry: false,
    staleTime: 60 * 1000,
  });

  const managePath = `/admin/problems/${problemDetail?.id || problem.problemJid}`;

  useEffect(() => {
    document.title = createDocumentTitle(`${problemSet.name} / ${problemAlias}`);
  }, [problemSet.name, problemAlias]);

  const clickBack = () => {
    navigate({ to: `/problems/${problemSet.slug}` });
  };

  const isBundle = problem.type === ProblemType.Bundle || problem.problemJid?.startsWith('JIDBUND');
  const sidebarItems = [
    {
      path: '',
      titleIcon: <Document />,
      title: 'Statement',
    },
    ...(!isBundle
      ? [
          {
            path: 'submissions',
            titleIcon: <Layers />,
            title: 'Submissions',
          },
        ]
      : [
          {
            path: 'results',
            titleIcon: <ManuallyEnteredData />,
            title: 'Results',
          },
        ]),
  ];

  const contentWithSidebarProps = {
    title: 'Problem Menu',
    items: sidebarItems,
    basePath: `/problems/${problemSetSlug}/${problemAlias}`,
    action: (
      <Button small icon={<ChevronLeft />} onClick={clickBack}>
        Back
      </Button>
    ),
    contentHeader: (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          width: '100%',
          marginBottom: 20,
        }}
      >
        <h3 className="single-problemset-problem-routes__title" style={{ margin: 0 }}>
          <Link className="single-problemset-problem-routes__title--link" to={`/problems/${problemSet.slug}`}>
            {problemSet.name}
          </Link>
          &nbsp;
          <ChevronRight className="single-problemset-problem-routes__title--chevron" size={20} />
          &nbsp;
          {problem.alias}
        </h3>
        {problemDetail && (
          <Button
            small
            style={{ whiteSpace: 'nowrap' }}
            intent={problemDetail.canEdit ? Intent.PRIMARY : Intent.NONE}
            icon={<Edit />}
            text={problemDetail.canEdit ? 'Edit problem' : 'View in manager'}
            onClick={() => navigate({ to: managePath })}
          />
        )}
      </div>
    ),
    stickyWidget1: ProblemReportWidget,
  };

  return (
    <FullWidthPageLayout>
      <ContentWithSidebar {...contentWithSidebarProps}>
        <Outlet />
      </ContentWithSidebar>
    </FullWidthPageLayout>
  );
}
