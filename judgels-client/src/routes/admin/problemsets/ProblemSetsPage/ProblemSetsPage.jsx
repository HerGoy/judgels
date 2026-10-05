import { Alert, Button, HTMLTable, Intent } from '@blueprintjs/core';
import { Edit, Trash } from '@blueprintjs/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { ActionButtons } from '../../../../components/ActionButtons/ActionButtons';
import { ContentCard } from '../../../../components/ContentCard/ContentCard';
import { LoadingContentCard } from '../../../../components/LoadingContentCard/LoadingContentCard';
import Pagination from '../../../../components/Pagination/Pagination';
import { deleteProblemSetMutationOptions, problemSetsQueryOptions } from '../../../../modules/queries/problemSet';
import { ProblemSetCreateDialog } from '../ProblemSetCreateDialog/ProblemSetCreateDialog';

import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';

const PAGE_SIZE = 20;

export default function ProblemSetsPage() {
  const location = useLocation();
  const page = location.search.page;
  const navigate = useNavigate();
  const [problemSetToDelete, setProblemSetToDelete] = useState(null);

  const { data: response } = useQuery(problemSetsQueryOptions({ page }));
  const deleteMutation = useMutation(deleteProblemSetMutationOptions());

  const renderProblemSets = () => {
    if (!response) {
      return <LoadingContentCard />;
    }

    const { data: problemSets, archiveSlugsMap } = response;
    if (problemSets.page.length === 0) {
      return (
        <p>
          <small>No problem sets.</small>
        </p>
      );
    }

    const rows = problemSets.page.map(problemSet => (
      <tr key={problemSet.jid}>
        <td style={{ width: '60px', verticalAlign: 'middle' }}>{problemSet.id}</td>
        <td style={{ width: '200px', verticalAlign: 'middle' }}>
          <Link to={`/admin/problemsets/${problemSet.slug}`} style={{ fontWeight: 600 }}>
            {problemSet.slug}
          </Link>
        </td>
        <td style={{ verticalAlign: 'middle' }}>{problemSet.name}</td>
        <td style={{ verticalAlign: 'middle' }}>{archiveSlugsMap[problemSet.archiveJid]}</td>
        <td style={{ width: '160px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
          <div className="action-button-group" style={{ justifyContent: 'center' }}>
            <Button
              small
              intent={Intent.PRIMARY}
              icon={<Edit />}
              text="Manage"
              onClick={() => navigate({ to: `/admin/problemsets/${problemSet.slug}` })}
            />
            <Button
              small
              minimal
              intent={Intent.DANGER}
              icon={<Trash />}
              onClick={() => setProblemSetToDelete(problemSet)}
              title="Delete problemset"
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
            <th>Archive</th>
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
        <ProblemSetCreateDialog />
      </ActionButtons>
    );
  };

  return (
    <ContentCard title="Problemsets">
      {renderAction()}
      {renderProblemSets()}
      {response && <Pagination pageSize={PAGE_SIZE} totalCount={response.data.totalCount} />}

      <Alert
        isOpen={problemSetToDelete !== null}
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        intent={Intent.DANGER}
        icon="trash"
        loading={deleteMutation.isPending}
        onCancel={() => setProblemSetToDelete(null)}
        onConfirm={() => {
          if (problemSetToDelete) {
            deleteMutation.mutate(problemSetToDelete.jid, {
              onSuccess: () => {
                showSuccessToast(`Problemset "${problemSetToDelete.name}" deleted successfully.`);
                setProblemSetToDelete(null);
              },
              onError: err => {
                showErrorToast(err?.response?.data?.message || err?.message || 'Failed to delete problemset.');
              },
            });
          }
        }}
      >
        Are you sure you want to delete problemset <strong>{problemSetToDelete?.name}</strong>?
      </Alert>
    </ContentCard>
  );
}
