import { Button, FormGroup, HTMLSelect, Intent } from '@blueprintjs/core';
import { Field, Form } from 'react-final-form';

import { FormTextArea } from '../../../../components/forms/FormTextArea/FormTextArea';
import { FormTextInput } from '../../../../components/forms/FormTextInput/FormTextInput';
import { Required, Slug, composeValidators } from '../../../../components/forms/validations';
import { withSubmissionError } from '../../../../modules/form/submissionError';

export default function ProblemCreateForm({ onSubmit, renderFormComponents }) {
  const slugField = {
    name: 'slug',
    label: 'Slug',
    placeholder: 'e.g. sum-of-two-numbers',
    validate: composeValidators(Required, Slug),
    autoFocus: true,
  };

  const additionalNoteField = {
    name: 'additionalNote',
    label: 'Additional Note',
    placeholder: 'Internal notes or problem setter notes...',
    rows: 3,
  };

  const initialValues = {
    gradingEngine: 'Batch',
    initialLanguage: 'en-US',
  };

  const fields = (
    <>
      <Field component={FormTextInput} {...slugField} />

      <Field name="gradingEngine">
        {({ input }) => (
          <FormGroup label="Grading Engine" labelFor="gradingEngine-select">
            <HTMLSelect
              id="gradingEngine-select"
              fill
              {...input}
              options={[
                { label: 'Batch (Standard input/output)', value: 'Batch' },
                { label: 'Interactive (Reactive communication)', value: 'Interactive' },
                { label: 'Output-Only', value: 'OutputOnly' },
                { label: 'Bundle (Multiple Choice / Short Answer)', value: 'Bundle' },
              ]}
            />
          </FormGroup>
        )}
      </Field>

      <Field name="initialLanguage">
        {({ input }) => (
          <FormGroup label="Initial Language" labelFor="initialLanguage-select">
            <HTMLSelect
              id="initialLanguage-select"
              fill
              {...input}
              options={[
                { label: 'English (en-US)', value: 'en-US' },
                { label: 'Bahasa Indonesia (id-ID)', value: 'id-ID' },
              ]}
            />
          </FormGroup>
        )}
      </Field>

      <Field component={FormTextArea} {...additionalNoteField} />
    </>
  );

  return (
    <Form initialValues={initialValues} onSubmit={withSubmissionError(onSubmit)}>
      {({ handleSubmit, submitting }) => {
        const submitButton = <Button type="submit" text="Create Problem" intent={Intent.PRIMARY} loading={submitting} />;
        return <form onSubmit={handleSubmit}>{renderFormComponents(fields, submitButton)}</form>;
      }}
    </Form>
  );
}
