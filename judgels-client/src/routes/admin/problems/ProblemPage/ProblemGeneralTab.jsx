import { Button, FormGroup, InputGroup, Intent, TextArea } from '@blueprintjs/core';
import { FloppyDisk } from '@blueprintjs/icons';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { updateProblemGeneralMutationOptions } from '../../../../modules/queries/problem';

import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';

export default function ProblemGeneralTab({ problem, problemId }) {
  const [slug, setSlug] = useState(problem.slug || '');
  const [additionalNote, setAdditionalNote] = useState(problem.additionalNote || '');
  const [writers, setWriters] = useState(problem.setters?.writers || '');
  const [developers, setDevelopers] = useState(problem.setters?.developers || '');
  const [testers, setTesters] = useState(problem.setters?.testers || '');
  const [editorialists, setEditorialists] = useState(problem.setters?.editorialists || '');
  const [tags, setTags] = useState((problem.tags || []).join(', '));

  const updateMutation = useMutation(updateProblemGeneralMutationOptions(problemId));

  const handleSave = e => {
    e.preventDefault();
    const tagList = tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    updateMutation.mutate(
      {
        slug,
        additionalNote,
        writers,
        developers,
        testers,
        editorialists,
        tags: tagList,
      },
      {
        onSuccess: () => {
          showSuccessToast('General details updated successfully.');
        },
        onError: err => {
          showErrorToast(err);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 700, marginTop: 16 }}>
      <FormGroup label="Problem Slug" labelFor="slug" helperText="Unique identifier for URL and internal reference.">
        <InputGroup
          id="slug"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          disabled={!problem.canEdit}
          required
        />
      </FormGroup>

      <FormGroup
        label="Additional Note"
        labelFor="additionalNote"
        helperText="Private notes visible only to problem setters and admins."
      >
        <TextArea
          id="additionalNote"
          fill
          rows={3}
          value={additionalNote}
          onChange={e => setAdditionalNote(e.target.value)}
          disabled={!problem.canEdit}
        />
      </FormGroup>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormGroup label="Writers" helperText="Comma-separated usernames">
          <InputGroup
            value={writers}
            onChange={e => setWriters(e.target.value)}
            disabled={!problem.canEdit}
            placeholder="e.g. alice, bob"
          />
        </FormGroup>
        <FormGroup label="Developers" helperText="Comma-separated usernames">
          <InputGroup
            value={developers}
            onChange={e => setDevelopers(e.target.value)}
            disabled={!problem.canEdit}
            placeholder="e.g. charlie"
          />
        </FormGroup>
        <FormGroup label="Testers" helperText="Comma-separated usernames">
          <InputGroup
            value={testers}
            onChange={e => setTesters(e.target.value)}
            disabled={!problem.canEdit}
            placeholder="e.g. dave"
          />
        </FormGroup>
        <FormGroup label="Editorialists" helperText="Comma-separated usernames">
          <InputGroup
            value={editorialists}
            onChange={e => setEditorialists(e.target.value)}
            disabled={!problem.canEdit}
            placeholder="e.g. eve"
          />
        </FormGroup>
      </div>

      <FormGroup label="Tags" helperText="Comma-separated topic tags (e.g. dp, math, greedy)">
        <InputGroup
          value={tags}
          onChange={e => setTags(e.target.value)}
          disabled={!problem.canEdit}
          placeholder="e.g. greedy, math, strings"
        />
      </FormGroup>

      {problem.canEdit && (
        <Button
          type="submit"
          intent={Intent.PRIMARY}
          icon={<FloppyDisk />}
          text="Save Details"
          loading={updateMutation.isPending}
        />
      )}
    </form>
  );
}
