import {
  Button,
  Callout,
  Card,
  Intent,
  ProgressBar,
  Spinner,
  Tag,
} from '@blueprintjs/core';
import {
  CloudUpload,
  Download,
  Flash,
  Refresh,
  Trash,
} from '@blueprintjs/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  autoPopulateProblemTestDataMutationOptions,
  deleteProblemTestDataMutationOptions,
  problemTestDataQueryOptions,
  uploadProblemTestDataMutationOptions,
} from '../../../../modules/queries/problem';
import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';

export default function ProblemTestDataTab({ problem, problemId }) {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery(problemTestDataQueryOptions(problemId));
  const files = data?.files || [];

  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation(uploadProblemTestDataMutationOptions(problemId));
  const deleteMutation = useMutation(deleteProblemTestDataMutationOptions(problemId));
  const autoPopulateMutation = useMutation(autoPopulateProblemTestDataMutationOptions(problemId));

  const handleFileUpload = async (e, isZip = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    if (isZip || file.name.toLowerCase().endsWith('.zip')) {
      formData.append('fileZipped', file);
    } else {
      formData.append('file', file);
    }

    uploadMutation.mutate(formData, {
      onSuccess: () => {
        showSuccessToast('Test data uploaded successfully!');
        setIsUploading(false);
        refetch();
      },
      onError: err => {
        showErrorToast(err);
        setIsUploading(false);
      },
    });
    e.target.value = '';
  };

  const handleDelete = filename => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }
    deleteMutation.mutate(filename, {
      onSuccess: () => {
        showSuccessToast(`Deleted ${filename}`);
        refetch();
      },
      onError: err => {
        showErrorToast(err);
      },
    });
  };

  const handleAutoPopulate = () => {
    autoPopulateMutation.mutate(null, {
      onSuccess: res => {
        showSuccessToast(res?.message || 'Test cases auto-populated successfully!');
        queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
      },
      onError: err => {
        showErrorToast(err);
      },
    });
  };

  const inputFiles = files.filter(f => f.name.endsWith('.in'));
  const outputFiles = files.filter(f => f.name.endsWith('.out') || f.name.endsWith('.ans'));
  const sampleFiles = files.filter(f => f.name.toLowerCase().includes('sample'));

  return (
    <div style={{ marginTop: 16 }}>
      {/* Top action toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button
            small
            minimal
            icon={<Refresh />}
            text="Refresh"
            onClick={() => refetch()}
          />
          <Tag minimal round intent={files.length > 0 ? Intent.PRIMARY : Intent.NONE}>
            {files.length} Files ({inputFiles.length} Inputs, {outputFiles.length} Outputs)
          </Tag>
          {sampleFiles.length > 0 && (
            <Tag minimal round intent={Intent.SUCCESS}>
              {sampleFiles.length / 2} Sample Testcases
            </Tag>
          )}
        </div>

        {problem.canEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="bp5-button bp5-small bp5-intent-primary">
              <CloudUpload style={{ marginRight: 6 }} />
              Upload .in / .out File
              <input
                type="file"
                onChange={e => handleFileUpload(e, false)}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
            </label>

            <label className="bp5-button bp5-small bp5-intent-success">
              <CloudUpload style={{ marginRight: 6 }} />
              Upload .zip Archive
              <input
                type="file"
                accept=".zip"
                onChange={e => handleFileUpload(e, true)}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
            </label>

            <Button
              small
              intent={Intent.WARNING}
              icon={<Flash />}
              text="Auto-populate Testcases"
              loading={autoPopulateMutation.isPending}
              disabled={files.length === 0}
              onClick={handleAutoPopulate}
              title="Automatically pairs .in and .out files into test groups"
            />
          </div>
        )}
      </div>

      {isUploading && (
        <div style={{ marginBottom: 16 }}>
          <ProgressBar intent={Intent.PRIMARY} />
          <div style={{ fontSize: 12, color: '#5c7080', marginTop: 4 }}>Uploading and processing test cases...</div>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Spinner />
        </div>
      ) : files.length === 0 ? (
        <Callout intent={Intent.PRIMARY} icon={<CloudUpload />}>
          <h4 style={{ margin: 0, marginBottom: 6 }}>No Test Data Files</h4>
          <p style={{ margin: 0 }}>
            Upload testcase files like <code>1.in</code>, <code>1.out</code>, <code>sample_1.in</code>, <code>sample_1.out</code>,
            or upload a single <code>.zip</code> archive containing all testcases. Then click <strong>Auto-populate Testcases</strong>.
          </p>
        </Callout>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table className="bp5-html-table bp5-html-table-striped" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Filename</th>
                <th>Type</th>
                <th>Size</th>
                <th style={{ textAlign: 'right', width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, idx) => {
                const isInput = file.name.endsWith('.in');
                const isOutput = file.name.endsWith('.out') || file.name.endsWith('.ans');
                const isSample = file.name.toLowerCase().includes('sample');

                return (
                  <tr key={file.name}>
                    <td style={{ color: '#8a9ba8' }}>{idx + 1}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{file.name}</span>
                      {isSample && (
                        <Tag minimal round intent={Intent.SUCCESS} style={{ marginLeft: 8 }}>
                          Sample
                        </Tag>
                      )}
                    </td>
                    <td>
                      {isInput ? (
                        <Tag minimal intent={Intent.PRIMARY}>
                          Input (.in)
                        </Tag>
                      ) : isOutput ? (
                        <Tag minimal intent={Intent.WARNING}>
                          Output (.out/.ans)
                        </Tag>
                      ) : (
                        <Tag minimal>Other</Tag>
                      )}
                    </td>
                    <td>{file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`}</td>
                    <td style={{ textAlign: 'right' }}>
                      <a
                        href={`/problems/api/${problemId}/testdata/download/${encodeURIComponent(file.name)}`}
                        download={file.name}
                        className="bp5-button bp5-minimal bp5-small bp5-intent-primary"
                        style={{ marginRight: 6 }}
                        title="Download file"
                      >
                        <Download />
                      </a>

                      {problem.canEdit && (
                        <Button
                          minimal
                          small
                          intent={Intent.DANGER}
                          icon={<Trash />}
                          onClick={() => handleDelete(file.name)}
                          loading={deleteMutation.isPending}
                          title="Delete file"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
