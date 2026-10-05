import { Button, ButtonGroup } from '@blueprintjs/core';
import { Edit, Manual, PanelStats, Plus } from '@blueprintjs/icons';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Outlet, useNavigate } from '@tanstack/react-router';

import ContentWithSidebar from '../../components/ContentWithSidebar/ContentWithSidebar';
import { FullWidthPageLayout } from '../../components/FullWidthPageLayout/FullWidthPageLayout';
import { manageableProblemsQueryOptions } from '../../modules/queries/problem';
import { userWebConfigQueryOptions } from '../../modules/queries/userWeb';
import { useSession } from '../../modules/session';
import { ProblemCreateDialog } from '../admin/problems/ProblemCreateDialog/ProblemCreateDialog';
import ProblemTagFilter from './problems/ProblemTagFilter/ProblemTagFilter';
import ProblemSetArchiveFilter from './problemsets/ProblemSetArchiveFilter/ProblemSetArchiveFilter';

export default function ProblemsIndexLayout() {
  const navigate = useNavigate();
  const { user } = useSession();
  const {
    data: { role },
  } = useSuspenseQuery(userWebConfigQueryOptions());

  const isGlobalManager =
    role?.problem === 'ADMIN' ||
    role?.problem === 'WRITER' ||
    role?.account === 'SUPERADMIN' ||
    role?.account === 'ADMIN';

  const { data: manageableData } = useQuery({
    ...manageableProblemsQueryOptions({ page: 1 }),
    enabled: !!user && !isGlobalManager,
    staleTime: 30 * 1000,
  });

  const hasManageableProblems = isGlobalManager || (manageableData?.totalCount || 0) > 0;

  const action = hasManageableProblems ? (
    <ButtonGroup>
      {isGlobalManager && <ProblemCreateDialog />}
      <Button small icon={<Edit />} text="Manage" onClick={() => navigate({ to: '/admin/problems' })} />
    </ButtonGroup>
  ) : null;

  const sidebarItems = [
    {
      path: '',
      titleIcon: <Manual />,
      title: 'Browse problems',
      widgetComponent: ProblemTagFilter,
    },
    {
      path: 'problemsets',
      titleIcon: <PanelStats />,
      title: 'Browse problemsets',
      widgetComponent: ProblemSetArchiveFilter,
    },
  ];

  const contentWithSidebarProps = {
    title: 'Menu',
    items: sidebarItems,
    basePath: '/problems',
    action,
  };

  return (
    <FullWidthPageLayout>
      <ContentWithSidebar {...contentWithSidebarProps}>
        <Outlet />
      </ContentWithSidebar>
    </FullWidthPageLayout>
  );
}
