import { Alert, Button, HTMLTable, Intent } from '@blueprintjs/core';
import { Edit, Trash } from '@blueprintjs/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { ActionButtons } from '../../../../components/ActionButtons/ActionButtons';
import { ContentCard } from '../../../../components/ContentCard/ContentCard';
import { LoadingContentCard } from '../../../../components/LoadingContentCard/LoadingContentCard';
import { archivesQueryOptions, deleteArchiveMutationOptions } from '../../../../modules/queries/archive';
import { ArchiveCreateDialog } from '../ArchiveCreateDialog/ArchiveCreateDialog';

import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';

export default function ArchivesPage() {
  const navigate = useNavigate();
  const [archiveToDelete, setArchiveToDelete] = useState(null);

  const { data: response } = useQuery(archivesQueryOptions());
  const deleteMutation = useMutation(deleteArchiveMutationOptions());

  const renderArchives = () => {
    if (!response) {
      return <LoadingContentCard />;
    }

    const { data: archives } = response;
    if (archives.length === 0) {
      return (
        <p>
          <small>No archives.</small>
        </p>
      );
    }

    const rows = archives.map(archive => (
      <tr key={archive.jid}>
        <td style={{ width: '60px', verticalAlign: 'middle' }}>{archive.id}</td>
        <td style={{ width: '200px', verticalAlign: 'middle' }}>
          <Link to={`/admin/archives/${archive.slug}`} style={{ fontWeight: 600 }}>
            {archive.slug}
          </Link>
        </td>
        <td style={{ verticalAlign: 'middle' }}>{archive.name}</td>
        <td style={{ verticalAlign: 'middle' }}>{archive.category}</td>
        <td style={{ width: '160px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
          <div className="action-button-group" style={{ justifyContent: 'center' }}>
            <Button
              small
              intent={Intent.PRIMARY}
              icon={<Edit />}
              text="Manage"
              onClick={() => navigate({ to: `/admin/archives/${archive.slug}` })}
            />
            <Button
              small
              minimal
              intent={Intent.DANGER}
              icon={<Trash />}
              onClick={() => setArchiveToDelete(archive)}
              title="Delete archive"
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
            <th>Category</th>
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
        <ArchiveCreateDialog />
      </ActionButtons>
    );
  };

  return (
    <ContentCard title="Archives">
      {renderAction()}
      {renderArchives()}

      <Alert
        isOpen={archiveToDelete !== null}
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        intent={Intent.DANGER}
        icon="trash"
        loading={deleteMutation.isPending}
        onCancel={() => setArchiveToDelete(null)}
        onConfirm={() => {
          if (archiveToDelete) {
            deleteMutation.mutate(archiveToDelete.jid, {
              onSuccess: () => {
                showSuccessToast(`Archive "${archiveToDelete.name}" deleted successfully.`);
                setArchiveToDelete(null);
              },
              onError: err => {
                showErrorToast(err?.response?.data?.message || err?.message || 'Failed to delete archive.');
              },
            });
          }
        }}
      >
        Are you sure you want to delete archive <strong>{archiveToDelete?.name}</strong>?
      </Alert>
    </ContentCard>
  );
}
