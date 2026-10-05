import { Button, Callout, Classes, Dialog, Intent } from '@blueprintjs/core';
import { Plus } from '@blueprintjs/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { archivesQueryOptions } from '../../../../modules/queries/archive';
import { createProblemSetMutationOptions } from '../../../../modules/queries/problemSet';
import ProblemSetCreateForm from '../ProblemSetCreateForm/ProblemSetCreateForm';

import * as toastActions from '../../../../modules/toast/toastActions';

export function ProblemSetCreateDialog() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const createProblemSetMutation = useMutation(createProblemSetMutationOptions);
  const { data: archivesResponse } = useQuery(archivesQueryOptions());
  const archives = archivesResponse?.data;

  const toggleDialog = () => {
    setIsDialogOpen(open => !open);
  };

  const renderDialogForm = (fields, submitButton) => (
    <>
      <div className={Classes.DIALOG_BODY}>{fields}</div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button text="Cancel" onClick={toggleDialog} />
          {submitButton}
        </div>
      </div>
    </>
  );

  const createProblemSet = async data => {
    await createProblemSetMutation.mutateAsync(
      {
        slug: data.slug,
        name: data.name,
        archiveSlug: data.archiveSlug,
        description: data.description,
        contestTime: new Date(data.contestTime).getTime(),
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          toastActions.showSuccessToast('Problemset created.');
        },
      }
    );
  };

  const hasNoArchives = archives && archives.length === 0;

  const initialValues = {
    archiveSlug: archives && archives.length > 0 ? archives[0].slug : undefined,
    contestTime: new Date().toISOString(),
  };

  return (
    <>
      <Button intent={Intent.PRIMARY} icon={<Plus />} onClick={toggleDialog} disabled={isDialogOpen}>
        New problemset
      </Button>
      <Dialog isOpen={isDialogOpen} onClose={toggleDialog} title="Create new problemset" canOutsideClickClose={false}>
        {hasNoArchives ? (
          <>
            <div className={Classes.DIALOG_BODY}>
              <Callout intent={Intent.WARNING} title="No Archives Found" icon="warning-sign">
                <p>A problemset must belong to an Archive. No archives currently exist in the system.</p>
                <p>
                  Please go to{' '}
                  <Link to="/admin/archives" onClick={toggleDialog}>
                    <strong>Admin &gt; Archives</strong>
                  </Link>{' '}
                  to create an archive first before creating a problemset.
                </p>
              </Callout>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
              <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                <Button text="Close" onClick={toggleDialog} />
              </div>
            </div>
          </>
        ) : (
          <ProblemSetCreateForm
            renderFormComponents={renderDialogForm}
            onSubmit={createProblemSet}
            initialValues={initialValues}
            archives={archives}
          />
        )}
      </Dialog>
    </>
  );
}
