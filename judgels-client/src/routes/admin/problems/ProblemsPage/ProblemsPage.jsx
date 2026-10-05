import { Alert, AnchorButton, Button, HTMLTable, InputGroup, Intent, Tag } from '@blueprintjs/core';
import { Document, Edit, Search, Share, Trash } from '@blueprintjs/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { ActionButtons } from '../../../../components/ActionButtons/ActionButtons';
import { ContentCard } from '../../../../components/ContentCard/ContentCard';
import { FormattedDate } from '../../../../components/FormattedDate/FormattedDate';
import { LoadingState } from '../../../../components/LoadingState/LoadingState';
import Pagination from '../../../../components/Pagination/Pagination';
import { deleteProblemMutationOptions, manageableProblemsQueryOptions } from '../../../../modules/queries/problem';
import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';
import { ProblemCreateDialog } from '../ProblemCreateDialog/ProblemCreateDialog';

const PAGE_SIZE = 50;

export default function ProblemsPage() {
  const location = useLocation();
  const page = +(location.search.page || 1);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [problemToDelete, setProblemToDelete] = useState(null);

  const { data: response } = useQuery(manageableProblemsQueryOptions({ page, term: searchTerm }));
  const deleteMutation = useMutation(deleteProblemMutationOptions());

  const renderAction = () => {
    return (
      <ActionButtons>
        <ProblemCreateDialog />
        <AnchorButton
          href="/problems/manage"
          target="_blank"
          minimal
          icon={<Share />}
          text="Open Legacy Manager"
        />
      </ActionButtons>
    );
  };

  const renderProblems = () => {
    if (!response) {
      return <LoadingState />;
    }

    const { problems, totalCount } = response;
    if (problems.length === 0) {
      return (
        <p>
          <small>No problems found.</small>
        </p>
      );
    }

    const rows = problems.map(problem => {
      const isBundle = problem.type === 'BUNDLE';
      const managePath = `/admin/problems/${problem.id}`;

      return (
        <tr key={problem.jid || problem.id}>
          <td style={{ width: '60px', color: '#888' }}>{problem.id}</td>
          <td>
            <Link to={managePath} style={{ fontWeight: 600 }}>
              {problem.slug}
            </Link>
            {problem.additionalNote && (
              <div>
                <small style={{ color: '#777' }}>{problem.additionalNote}</small>
              </div>
            )}
          </td>
          <td>
            <Tag intent={isBundle ? Intent.WARNING : Intent.PRIMARY} round minimal>
              {problem.type}
            </Tag>
          </td>
          <td>{problem.authorUsername || '-'}</td>
          <td>{problem.updatedAt ? <FormattedDate value={problem.updatedAt} /> : '-'}</td>
          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
            <Button
              intent={Intent.PRIMARY}
              icon={<Edit />}
              text="Manage"
              small
              style={{ marginRight: 6 }}
              onClick={() => navigate({ to: managePath })}
            />
            <Button
              icon={<Document />}
              text="Statements"
              small
              minimal
              style={{ marginRight: 4 }}
              onClick={() => navigate({ to: `${managePath}?tab=statement` })}
            />
            {!isBundle && (
              <Button
                text="Tests"
                small
                minimal
                style={{ marginRight: 4 }}
                onClick={() => navigate({ to: `${managePath}?tab=testdata` })}
              />
            )}
            <Button
              intent={Intent.DANGER}
              icon={<Trash />}
              small
              minimal
              onClick={() => setProblemToDelete(problem)}
              title="Delete problem"
            />
          </td>
        </tr>
      );
    });

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ width: 280, maxWidth: '100%' }}>
            <InputGroup
              leftIcon="search"
              placeholder="Filter by problem slug..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              small
            />
          </div>
          <div style={{ color: '#777', fontSize: 13 }}>
            Total: <strong>{totalCount}</strong> problems
          </div>
        </div>
        <div className="table-responsive">
          <HTMLTable striped className="table-list" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Slug</th>
                <th>Type</th>
                <th>Author</th>
                <th>Last Updated</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </HTMLTable>
        </div>
      </>
    );
  };

  return (
    <ContentCard title="Problems">
      {renderAction()}
      {renderProblems()}
      {response && <Pagination pageSize={PAGE_SIZE} totalCount={response.totalCount} />}

      <Alert
        isOpen={problemToDelete !== null}
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        intent={Intent.DANGER}
        icon="trash"
        loading={deleteMutation.isPending}
        onCancel={() => setProblemToDelete(null)}
        onConfirm={() => {
          if (problemToDelete) {
            deleteMutation.mutate(problemToDelete.id, {
              onSuccess: () => {
                showSuccessToast(`Problem "${problemToDelete.slug}" deleted successfully.`);
                setProblemToDelete(null);
              },
              onError: err => {
                showErrorToast(err?.response?.data?.message || err?.message || 'Failed to delete problem.');
              },
            });
          }
        }}
      >
        Are you sure you want to delete problem <strong>{problemToDelete?.slug}</strong>? This action cannot be undone.
      </Alert>
    </ContentCard>
  );
}
