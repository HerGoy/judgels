import {
  Button,
  Card,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  HTMLSelect,
  HTMLTable,
  Intent,
  Spinner,
  Tag,
  TextArea,
} from '@blueprintjs/core';
import { EyeOpen, Play, Refresh } from '@blueprintjs/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-golang';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-pascal';
import 'ace-builds/src-noconflict/mode-plain_text';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-rust';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/theme-tomorrow_night';

import { problemAPI } from '../../../../modules/api/problem';
import {
  problemSubmissionsQueryOptions,
  submitProblemSolutionMutationOptions,
} from '../../../../modules/queries/problem';
import { getToken } from '../../../../modules/session';
import { useWebPrefs } from '../../../../modules/webPrefs';

import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';

const COMMON_SOL_LANGUAGES = [
  { id: 'Cpp17', label: 'C++17' },
  { id: 'Cpp20', label: 'C++20' },
  { id: 'Python3', label: 'Python 3' },
  { id: 'PyPy3', label: 'PyPy 3' },
  { id: 'Java', label: 'Java 17' },
  { id: 'Rust2021', label: 'Rust 2021' },
  { id: 'Go', label: 'Go' },
  { id: 'Pascal', label: 'Pascal' },
];

function getAceMode(lang) {
  if (lang.startsWith('Cpp') || lang === 'C') return 'c_cpp';
  if (lang === 'Java') return 'java';
  if (lang.startsWith('Python') || lang.startsWith('PyPy')) return 'python';
  if (lang === 'Go') return 'golang';
  if (lang === 'Pascal') return 'pascal';
  if (lang.startsWith('Rust')) return 'rust';
  return 'plain_text';
}

function getVerdictTag(verdict) {
  switch (verdict) {
    case 'ACCEPTED':
      return (
        <Tag intent={Intent.SUCCESS} round>
          Accepted (AC)
        </Tag>
      );
    case 'WRONG_ANSWER':
      return (
        <Tag intent={Intent.DANGER} round>
          Wrong Answer (WA)
        </Tag>
      );
    case 'TIME_LIMIT_EXCEEDED':
      return (
        <Tag intent={Intent.WARNING} round>
          Time Limit Exceeded (TLE)
        </Tag>
      );
    case 'MEMORY_LIMIT_EXCEEDED':
      return (
        <Tag intent={Intent.WARNING} round>
          Memory Limit Exceeded (MLE)
        </Tag>
      );
    case 'RUNTIME_ERROR':
      return (
        <Tag intent={Intent.DANGER} round>
          Runtime Error (RTE)
        </Tag>
      );
    case 'COMPILATION_ERROR':
      return (
        <Tag intent={Intent.DANGER} round>
          Compile Error (CE)
        </Tag>
      );
    case 'PENDING':
    default:
      return (
        <Tag intent={Intent.PRIMARY} round minimal>
          Grading / Pending
        </Tag>
      );
  }
}

export default function ProblemSubmissionsTab({ problem, problemId }) {
  const queryClient = useQueryClient();
  const { isDarkMode } = useWebPrefs();
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useQuery({
    ...problemSubmissionsQueryOptions(problemId, page),
    refetchInterval: query => {
      // Auto-refresh every 3s if any submission is PENDING
      const hasPending = query?.state?.data?.submissions?.some(s => s.verdict === 'PENDING');
      return hasPending ? 3000 : false;
    },
  });

  const submissions = data?.submissions || [];

  // Quick submit states
  const [selectedLang, setSelectedLang] = useState('Cpp17');
  const [sourceCode, setSourceCode] = useState('');
  const [isQuickSubmitOpen, setIsQuickSubmitOpen] = useState(false);

  // Detail dialog state
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const submitMutation = useMutation(submitProblemSolutionMutationOptions(problemId));

  const handleQuickSubmit = e => {
    e.preventDefault();
    if (!sourceCode.trim()) {
      showErrorToast(new Error('Source code cannot be empty.'));
      return;
    }

    submitMutation.mutate(
      {
        gradingLanguage: selectedLang,
        sourceCode,
      },
      {
        onSuccess: () => {
          showSuccessToast('Solution submitted for grading!');
          setSourceCode('');
          setIsQuickSubmitOpen(false);
          refetch();
        },
        onError: err => {
          showErrorToast(err);
        },
      }
    );
  };

  const openSubmissionDetail = async submissionId => {
    setIsLoadingDetail(true);
    setSelectedSubmission(null);
    try {
      const detail = await problemAPI.getProblemSubmissionDetail(getToken(), problemId, submissionId);
      setSelectedSubmission(detail);
    } catch (err) {
      showErrorToast(err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

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
          <Button small minimal icon={<Refresh />} text="Refresh" onClick={() => refetch()} />
          <Tag minimal round>
            {data?.totalCount || submissions.length} Submissions
          </Tag>
        </div>

        {problem.canSubmit && (
          <Button
            intent={Intent.PRIMARY}
            icon={<Play />}
            text={isQuickSubmitOpen ? 'Close Submit Form' : 'Test Submit Solution'}
            onClick={() => setIsQuickSubmitOpen(!isQuickSubmitOpen)}
          />
        )}
      </div>

      {/* Quick submit panel */}
      {isQuickSubmitOpen && (
        <Card
          style={{
            marginBottom: 20,
            backgroundColor: isDarkMode ? '#252a31' : '#f5f8fa',
            border: `1px solid ${isDarkMode ? '#383e47' : '#d3dce3'}`,
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>Test Solution</h4>
          <form onSubmit={handleQuickSubmit}>
            <FormGroup label="Programming Language" labelFor="sol-lang">
              <HTMLSelect id="sol-lang" value={selectedLang} onChange={e => setSelectedLang(e.target.value)}>
                {COMMON_SOL_LANGUAGES.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </HTMLSelect>
            </FormGroup>

            <FormGroup label="Source Code">
              <div
                style={{
                  border: `1px solid ${isDarkMode ? '#383e47' : '#d3dce3'}`,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <AceEditor
                  mode={getAceMode(selectedLang)}
                  theme={isDarkMode ? 'tomorrow_night' : 'tomorrow'}
                  width="100%"
                  height="260px"
                  fontSize={14}
                  showPrintMargin={false}
                  showGutter={true}
                  highlightActiveLine={true}
                  value={sourceCode}
                  onChange={value => setSourceCode(value)}
                  name="problem-test-author-solution-editor"
                  editorProps={{ $blockScrolling: true }}
                  setOptions={{
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true,
                    enableSnippets: true,
                    showLineNumbers: true,
                    tabSize: 4,
                  }}
                />
              </div>
            </FormGroup>

            <Button
              type="submit"
              intent={Intent.PRIMARY}
              icon={<Play />}
              text="Submit Solution"
              loading={submitMutation.isPending}
            />
          </form>
        </Card>
      )}

      {/* Submissions table */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Spinner />
        </div>
      ) : submissions.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: isDarkMode ? '#8a9ba8' : '#5c7080' }}>
          No submissions found for this problem yet. Click <strong>Test Submit Solution</strong> to verify the problem!
        </div>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <HTMLTable striped style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Language</th>
                <th>Verdict</th>
                <th>Score</th>
                <th>Date / Time</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(sub => (
                <tr key={sub.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>#{sub.id}</span>
                  </td>
                  <td>{sub.authorUsername}</td>
                  <td>
                    <Tag minimal>{sub.gradingLanguage}</Tag>
                  </td>
                  <td>{getVerdictTag(sub.verdict)}</td>
                  <td>
                    <strong style={{ color: sub.score === 100 ? '#0f9960' : undefined }}>{sub.score}</strong>
                  </td>
                  <td style={{ color: isDarkMode ? '#a7b6c2' : '#5c7080', fontSize: 12 }}>
                    {new Date(sub.submittedAt).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Button
                      small
                      minimal
                      intent={Intent.PRIMARY}
                      icon={<EyeOpen />}
                      text="View"
                      onClick={() => openSubmissionDetail(sub.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        </Card>
      )}

      {/* Submission Detail Modal */}
      <Dialog
        isOpen={Boolean(selectedSubmission) || isLoadingDetail}
        onClose={() => setSelectedSubmission(null)}
        title={selectedSubmission ? `Submission #${selectedSubmission.id}` : 'Loading...'}
        style={{ width: 720 }}
      >
        <DialogBody>
          {isLoadingDetail ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Spinner />
            </div>
          ) : selectedSubmission ? (
            <div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <strong>Verdict: </strong> {getVerdictTag(selectedSubmission.verdict)}
                </div>
                <div>
                  <strong>Score: </strong> {selectedSubmission.score}
                </div>
                <div>
                  <strong>Language: </strong> {selectedSubmission.gradingLanguage}
                </div>
                <div>
                  <strong>Author: </strong> {selectedSubmission.authorUsername}
                </div>
              </div>

              {selectedSubmission.errorMessage && (
                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ margin: 0, marginBottom: 4, color: '#d9822b' }}>Error Message:</h5>
                  <pre
                    style={{
                      backgroundColor: isDarkMode ? '#3a1e1e' : '#fff1f0',
                      border: `1px solid ${isDarkMode ? '#5c2525' : '#ffa39e'}`,
                      color: isDarkMode ? '#ff7875' : '#cf1322',
                      padding: 10,
                      borderRadius: 4,
                      whiteSpace: 'pre-wrap',
                      fontSize: 12,
                    }}
                  >
                    {selectedSubmission.errorMessage}
                  </pre>
                </div>
              )}

              {selectedSubmission.compilationOutputs &&
                Object.keys(selectedSubmission.compilationOutputs).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h5 style={{ margin: 0, marginBottom: 4, color: '#d9822b' }}>Compilation Output:</h5>
                    {Object.entries(selectedSubmission.compilationOutputs).map(([key, val]) => (
                      <pre
                        key={key}
                        style={{
                          backgroundColor: isDarkMode ? '#1e252b' : '#293742',
                          border: `1px solid ${isDarkMode ? '#383e47' : '#10161a'}`,
                          color: '#f5f8fa',
                          padding: 10,
                          borderRadius: 4,
                          whiteSpace: 'pre-wrap',
                          fontSize: 12,
                        }}
                      >
                        {val}
                      </pre>
                    ))}
                  </div>
                )}

              <h5 style={{ margin: 0, marginBottom: 4 }}>Source Code:</h5>
              <pre
                style={{
                  backgroundColor: isDarkMode ? '#1e252b' : '#f5f8fa',
                  border: `1px solid ${isDarkMode ? '#383e47' : '#d3dce3'}`,
                  color: isDarkMode ? '#f5f8fa' : '#182026',
                  padding: 12,
                  borderRadius: 4,
                  maxHeight: 350,
                  overflowY: 'auto',
                  fontSize: 12,
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                }}
              >
                {selectedSubmission.sourceCode || '(Empty source)'}
              </pre>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter actions={<Button onClick={() => setSelectedSubmission(null)} text="Close" />} />
      </Dialog>
    </div>
  );
}
