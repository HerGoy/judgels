import { Button, Classes, Dialog, Intent } from '@blueprintjs/core';
import { Plus } from '@blueprintjs/icons';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { createProblemMutationOptions } from '../../../../modules/queries/problem';
import * as toastActions from '../../../../modules/toast/toastActions';
import ProblemCreateForm from '../ProblemCreateForm/ProblemCreateForm';

export function ProblemCreateDialog() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const createProblemMutation = useMutation(createProblemMutationOptions());

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

  const createProblem = async data => {
    try {
      const res = await createProblemMutation.mutateAsync(data);
      setIsDialogOpen(false);
      toastActions.showSuccessToast(`Problem '${data.slug}' created successfully.`);
      if (res && res.id) {
        navigate({ to: `/admin/problems/${res.id}` });
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to create problem.';
      toastActions.showErrorToast(message);
    }
  };

  return (
    <>
      <Button intent={Intent.PRIMARY} icon={<Plus />} onClick={toggleDialog} disabled={isDialogOpen}>
        New problem
      </Button>
      <Dialog
        isOpen={isDialogOpen}
        onClose={toggleDialog}
        title="Create new problem"
        canOutsideClickClose={false}
        style={{ width: 480 }}
      >
        <ProblemCreateForm renderFormComponents={renderDialogForm} onSubmit={createProblem} />
      </Dialog>
    </>
  );
}
