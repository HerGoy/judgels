import { FormGroup } from '@blueprintjs/core';
import { Suspense, lazy } from 'react';

import { lazyRetry } from '../../../lazy';
import { FormInputValidation } from '../FormInputValidation/FormInputValidation';
import { getIntent } from '../meta';

export function FormRichTextArea({ rows, input, label, labelInfo, helperText, meta }) {
  const LazyTinyMCETextArea = lazy(() => lazyRetry(() => import('./TinyMCETextArea')));

  return (
    <FormGroup
      labelFor={input.name}
      label={label}
      labelInfo={labelInfo}
      helperText={helperText}
      intent={getIntent(meta)}
    >
      <Suspense fallback={null}>
        <LazyTinyMCETextArea onChange={input.onChange} id={input.name} />
      </Suspense>
      <textarea id={input.name} rows={rows} {...input} className="tinymce" />
      <FormInputValidation meta={meta} />
    </FormGroup>
  );
}
