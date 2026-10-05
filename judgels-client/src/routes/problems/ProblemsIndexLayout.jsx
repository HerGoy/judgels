import { Button, ButtonGroup } from '@blueprintjs/core';
import { Edit, Manual, PanelStats, Plus } from '@blueprintjs/icons';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Outlet, useNavigate } from '@tanstack/react-router';

import ContentWithSidebar from '../../components/ContentWithSidebar/ContentWithSidebar';
import { FullWidthPageLayout } from '../../components/FullWidthPageLayout/FullWidthPageLayout';
import { userWebConfigQueryOptions } from '../../modules/queries/userWeb';
import { ProblemCreateDialog } from '../admin/problems/ProblemCreateDialog/ProblemCreateDialog';
import ProblemTagFilter from './problems/ProblemTagFilter/ProblemTagFilter';
import ProblemSetArchiveFilter from './problemsets/ProblemSetArchiveFilter/ProblemSetArchiveFilter';

export default function ProblemsIndexLayout() {
  const navigate = useNavigate();
  const {
    data: { role },
  } = useSuspenseQuery(userWebConfigQueryOptions());

  const canManageProblems =
    role?.problem === 'ADMIN' ||
    role?.problem === 'WRITER' ||
    role?.account === 'SUPERADMIN' ||
    role?.account === 'ADMIN';

  const action = canManageProblems ? (
    <ButtonGroup>
      <ProblemCreateDialog />
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
