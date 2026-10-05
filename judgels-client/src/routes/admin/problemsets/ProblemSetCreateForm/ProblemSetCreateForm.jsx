import { Button, Intent } from '@blueprintjs/core';
import { Field, Form } from 'react-final-form';

import { FormDateInput } from '../../../../components/forms/FormDateInput/FormDateInput';
import { FormRichTextArea } from '../../../../components/forms/FormRichTextArea/FormRichTextArea';
import { FormSelect2 } from '../../../../components/forms/FormSelect2/FormSelect2';
import { FormTextInput } from '../../../../components/forms/FormTextInput/FormTextInput';
import { Required, Slug, composeValidators } from '../../../../components/forms/validations';
import { withSubmissionError } from '../../../../modules/form/submissionError';

export default function ProblemSetCreateForm({ onSubmit, initialValues, renderFormComponents, archives }) {
  const hasArchives = archives && archives.length > 0;

  const slugField = {
    name: 'slug',
    label: 'Slug',
    helperText: 'Unique identifier using lowercase letters, numbers, and hyphens (e.g. latihan-dasar).',
    validate: composeValidators(Required, Slug),
    autoFocus: true,
  };

  const nameField = {
    name: 'name',
    label: 'Name',
    helperText: 'Display title of the problemset.',
    validate: Required,
  };

  const archiveSlugField = hasArchives
    ? {
        name: 'archiveSlug',
        label: 'Archive',
        helperText: 'The archive / category this problemset belongs to.',
        validate: Required,
        optionValues: archives.map(a => a.slug),
        optionNamesMap: Object.fromEntries(archives.map(a => [a.slug, `${a.name} (${a.slug})`])),
        fill: true,
      }
    : {
        name: 'archiveSlug',
        label: 'Archive slug',
        helperText: 'Slug of an existing archive from Admin > Archives.',
        validate: Required,
      };

  const contestTimeField = {
    name: 'contestTime',
    label: 'Contest time',
    helperText: 'Event date/time. Used for sorting problemsets chronologically in the archive list.',
    validate: Required,
  };

  const descriptionField = {
    name: 'description',
    label: 'Description',
    labelInfo: '(optional)',
    helperText: 'Summary shown on the public problemset card. Supports mentions like @username and rich text.',
    rows: 10,
  };

  const fields = (
    <>
      <Field component={FormTextInput} {...slugField} />
      <Field component={FormTextInput} {...nameField} />
      <Field component={hasArchives ? FormSelect2 : FormTextInput} {...archiveSlugField} />
      <Field component={FormDateInput} {...contestTimeField} />
      <Field component={FormRichTextArea} {...descriptionField} />
    </>
  );

  return (
    <Form onSubmit={withSubmissionError(onSubmit)} initialValues={initialValues}>
      {({ handleSubmit, submitting }) => {
        const submitButton = <Button type="submit" text="Create" intent={Intent.PRIMARY} loading={submitting} />;
        return <form onSubmit={handleSubmit}>{renderFormComponents(fields, submitButton)}</form>;
      }}
    </Form>
  );
}
