import { Alert, Button, HTMLTable, Intent } from '@blueprintjs/core';
import { Edit, Trash } from '@blueprintjs/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { ActionButtons } from '../../../../components/ActionButtons/ActionButtons';
import { ContentCard } from '../../../../components/ContentCard/ContentCard';
import { LoadingContentCard } from '../../../../components/LoadingContentCard/LoadingContentCard';
import Pagination from '../../../../components/Pagination/Pagination';
import { contestsQueryOptions, deleteContestMutationOptions } from '../../../../modules/queries/contest';
import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';
import { ContestCreateDialog } from '../../../contests/contests/ContestCreateDialog/ContestCreateDialog';

const PAGE_SIZE = 20;

export default function ContestsPage() {
  const location = useLocation();
  const page = location.search.page;
  const navigate = useNavigate();
  const [contestToDelete, setContestToDelete] = useState(null);

  const { data: response } = useQuery(contestsQueryOptions({ page }));
  const deleteMutation = useMutation(deleteContestMutationOptions());

  const renderContests = () => {
    if (!response) {
      return <LoadingContentCard />;
    }

    const contests = response.data.page;
    if (contests.length === 0) {
      return (
        <p>
          <small>No contests.</small>
        </p>
      );
    }

    const rows = contests.map(contest => (
      <tr key={contest.jid}>
        <td style={{ width: '60px', verticalAlign: 'middle' }}>{contest.id}</td>
        <td style={{ width: '200px', verticalAlign: 'middle' }}>
          <Link to={`/contests/${contest.slug}`} style={{ fontWeight: 600 }}>{contest.slug}</Link>
        </td>
        <td style={{ verticalAlign: 'middle' }}>{contest.name}</td>
        <td style={{ width: '120px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
          <Button
            small
            intent={Intent.PRIMARY}
            icon={<Edit />}
            text="Manage"
            style={{ marginRight: 6 }}
            onClick={() => navigate({ to: `/contests/${contest.slug}` })}
          />
          <Button
            small
            minimal
            intent={Intent.DANGER}
            icon={<Trash />}
            onClick={() => setContestToDelete(contest)}
            title="Delete contest"
          />
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
            <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </HTMLTable>
    );
  };

  const renderAction = () => {
    return (
      <ActionButtons>
        <ContestCreateDialog />
      </ActionButtons>
    );
  };

  const renderPagination = () => {
    if (!response) {
      return null;
    }
    return <Pagination pageSize={PAGE_SIZE} totalCount={response.data.totalCount} />;
  };

  return (
    <ContentCard title="Contests">
      {renderAction()}
      {renderContests()}
      {renderPagination()}

      <Alert
        isOpen={contestToDelete !== null}
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        intent={Intent.DANGER}
        icon="trash"
        loading={deleteMutation.isPending}
        onCancel={() => setContestToDelete(null)}
        onConfirm={() => {
          if (contestToDelete) {
            deleteMutation.mutate(contestToDelete.jid, {
              onSuccess: () => {
                showSuccessToast(`Contest "${contestToDelete.name}" deleted successfully.`);
                setContestToDelete(null);
              },
              onError: err => {
                showErrorToast(err?.response?.data?.message || err?.message || 'Failed to delete contest.');
              },
            });
          }
        }}
      >
        Are you sure you want to delete contest <strong>{contestToDelete?.name}</strong>?
      </Alert>
    </ContentCard>
  );
}
