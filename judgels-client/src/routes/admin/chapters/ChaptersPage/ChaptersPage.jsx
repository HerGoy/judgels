import { Alert, Button, HTMLTable, Intent } from '@blueprintjs/core';
import { Edit, Trash } from '@blueprintjs/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { ActionButtons } from '../../../../components/ActionButtons/ActionButtons';
import { ContentCard } from '../../../../components/ContentCard/ContentCard';
import { LoadingContentCard } from '../../../../components/LoadingContentCard/LoadingContentCard';
import { chaptersQueryOptions, deleteChapterMutationOptions } from '../../../../modules/queries/chapter';
import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';
import { ChapterCreateDialog } from '../ChapterCreateDialog/ChapterCreateDialog';

export default function ChaptersPage() {
  const navigate = useNavigate();
  const [chapterToDelete, setChapterToDelete] = useState(null);

  const { data: response } = useQuery(chaptersQueryOptions());
  const deleteMutation = useMutation(deleteChapterMutationOptions());

  const renderChapters = () => {
    if (!response) {
      return <LoadingContentCard />;
    }

    const { data: chapters } = response;
    if (chapters.length === 0) {
      return (
        <p>
          <small>No chapters.</small>
        </p>
      );
    }

    const rows = chapters.map(chapter => (
      <tr key={chapter.jid}>
        <td style={{ width: '60px', verticalAlign: 'middle' }}>{chapter.id}</td>
        <td style={{ width: '200px', verticalAlign: 'middle' }}>
          <Link to={`/admin/chapters/${chapter.jid}`} style={{ fontWeight: 600 }}>{chapter.jid}</Link>
        </td>
        <td style={{ verticalAlign: 'middle' }}>{chapter.name}</td>
        <td style={{ width: '120px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
          <Button
            small
            intent={Intent.PRIMARY}
            icon={<Edit />}
            text="Manage"
            style={{ marginRight: 6 }}
            onClick={() => navigate({ to: `/admin/chapters/${chapter.jid}` })}
          />
          <Button
            small
            minimal
            intent={Intent.DANGER}
            icon={<Trash />}
            onClick={() => setChapterToDelete(chapter)}
            title="Delete chapter"
          />
        </td>
      </tr>
    ));

    return (
      <HTMLTable striped className="table-list-condensed">
        <thead>
          <tr>
            <th style={{ width: '60px' }}>ID</th>
            <th style={{ width: '200px' }}>JID</th>
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
        <ChapterCreateDialog />
      </ActionButtons>
    );
  };

  return (
    <ContentCard title="Chapters">
      {renderAction()}
      {renderChapters()}

      <Alert
        isOpen={chapterToDelete !== null}
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        intent={Intent.DANGER}
        icon="trash"
        loading={deleteMutation.isPending}
        onCancel={() => setChapterToDelete(null)}
        onConfirm={() => {
          if (chapterToDelete) {
            deleteMutation.mutate(chapterToDelete.jid, {
              onSuccess: () => {
                showSuccessToast(`Chapter "${chapterToDelete.name}" deleted successfully.`);
                setChapterToDelete(null);
              },
              onError: err => {
                showErrorToast(err?.response?.data?.message || err?.message || 'Failed to delete chapter.');
              },
            });
          }
        }}
      >
        Are you sure you want to delete chapter <strong>{chapterToDelete?.name}</strong>?
      </Alert>
    </ContentCard>
  );
}
