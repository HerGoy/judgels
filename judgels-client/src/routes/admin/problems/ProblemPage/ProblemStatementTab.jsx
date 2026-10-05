import {
  Button,
  ButtonGroup,
  Callout,
  Card,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  HTMLSelect,
  HTMLTable,
  InputGroup,
  Intent,
  Tab,
  Tabs,
  Tag,
  TextArea,
} from '@blueprintjs/core';
import { CloudUpload, FloppyDisk, Media, Plus, Refresh } from '@blueprintjs/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import RichStatementText from '../../../../components/RichStatementText/RichStatementText';
import { problemAPI } from '../../../../modules/api/problem';
import {
  addProblemStatementLanguageMutationOptions,
  commitProblemChangesMutationOptions,
  updateProblemStatementMutationOptions,
} from '../../../../modules/queries/problem';
import { getToken } from '../../../../modules/session';
import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';
import { useWebPrefs } from '../../../../modules/webPrefs';

const COMMON_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'id-ID', name: 'Indonesian (Indonesia)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'vi-VN', name: 'Vietnamese' },
];

export default function ProblemStatementTab({ problem, problemId }) {
  const queryClient = useQueryClient();
  const { isDarkMode } = useWebPrefs();
  const availableLanguages = problem.statement?.availableLanguages || [];
  const defaultLang = problem.statement?.defaultLanguage || 'en-US';

  const [currentLang, setCurrentLang] = useState(problem.statement?.currentLanguage || defaultLang);
  const [title, setTitle] = useState(problem.statement?.title || '');
  const [text, setText] = useState(problem.statement?.text || '');
  const [viewMode, setViewMode] = useState('split'); // 'edit' | 'preview' | 'split'
  const [isAddLanguageOpen, setIsAddLanguageOpen] = useState(false);
  const [selectedNewLang, setSelectedNewLang] = useState('id-ID');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const updateMutation = useMutation(updateProblemStatementMutationOptions(problemId));
  const commitMutation = useMutation(commitProblemChangesMutationOptions(problemId));
  const addLangMutation = useMutation(addProblemStatementLanguageMutationOptions(problemId));

  // Load statement when language changes
  const loadStatement = async langCode => {
    try {
      const data = await problemAPI.getProblemStatement(getToken(), problemId, langCode);
      setTitle(data.title || '');
      setText(data.text || '');
      setCurrentLang(langCode);
    } catch (err) {
      showErrorToast(err);
    }
  };

  const handleLanguageChange = e => {
    const newLang = e.target.value;
    loadStatement(newLang);
  };

  const handleSave = async (andPublish = false) => {
    try {
      await updateMutation.mutateAsync({
        language: currentLang,
        title,
        text,
      });

      if (andPublish) {
        await commitMutation.mutateAsync({ message: `Update statement (${currentLang})` });
        showSuccessToast('Statement saved and published to production!');
      } else {
        showSuccessToast('Statement draft saved successfully.');
      }
      queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
    } catch (err) {
      showErrorToast(err);
    }
  };

  const handleAddLanguage = async () => {
    try {
      await addLangMutation.mutateAsync({ language: selectedNewLang });
      showSuccessToast(`Added language ${selectedNewLang}`);
      setIsAddLanguageOpen(false);
      await loadStatement(selectedNewLang);
    } catch (err) {
      showErrorToast(err);
    }
  };

  const fetchMedia = async () => {
    try {
      const res = await problemAPI.getProblemTestData(getToken(), problemId); // fallback or specific media API
      // fetch statement media
      const response = await fetch(`/problems/api/${problemId}/statement/media`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      setMediaFiles(data.files || []);
    } catch (err) {
      // ignore
    }
  };

  const handleUploadMedia = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/problems/api/${problemId}/statement/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast('Media uploaded!');
        fetchMedia();
      } else {
        showErrorToast(new Error(data.message || 'Upload failed'));
      }
    } catch (err) {
      showErrorToast(err);
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      {/* Top Controls Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>Language:</span>
          <HTMLSelect value={currentLang} onChange={handleLanguageChange}>
            {availableLanguages.map(l => (
              <option key={l.code} value={l.code}>
                {l.name} {l.code === defaultLang ? '(Default)' : ''}
              </option>
            ))}
          </HTMLSelect>

          {problem.canEdit && (
            <Button
              small
              icon={<Plus />}
              minimal
              intent={Intent.PRIMARY}
              text="Add Translation"
              onClick={() => setIsAddLanguageOpen(true)}
            />
          )}

          <Button
            small
            icon={<Media />}
            minimal
            text="Media Files"
            onClick={() => {
              setIsMediaModalOpen(true);
              fetchMedia();
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <ButtonGroup>
            <Button
              small
              active={viewMode === 'edit'}
              onClick={() => setViewMode('edit')}
              text="Edit"
            />
            <Button
              small
              active={viewMode === 'split'}
              onClick={() => setViewMode('split')}
              text="Side-by-side"
            />
            <Button
              small
              active={viewMode === 'preview'}
              onClick={() => setViewMode('preview')}
              text="Preview"
            />
          </ButtonGroup>

          {problem.canEdit && (
            <>
              <Button
                intent={Intent.NONE}
                icon={<FloppyDisk />}
                text="Save Draft"
                loading={updateMutation.isPending && !commitMutation.isPending}
                onClick={() => handleSave(false)}
              />
              <Button
                intent={Intent.PRIMARY}
                icon={<CloudUpload />}
                text="Save & Publish"
                loading={commitMutation.isPending}
                onClick={() => handleSave(true)}
              />
            </>
          )}
        </div>
      </div>

      {/* Statement Title Input */}
      <FormGroup label="Problem Title" labelFor="statement-title">
        <InputGroup
          id="statement-title"
          large
          placeholder="e.g. A Plus B"
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={!problem.canEdit}
        />
      </FormGroup>

      {/* Editor & Preview Area */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            viewMode === 'split' ? '1fr 1fr' : '1fr',
          gap: 16,
          minHeight: 520,
        }}
      >
        {/* Editor column */}
        {viewMode !== 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 6, fontWeight: 500, color: isDarkMode ? '#a7b6c2' : '#5c7080' }}>
              Statement HTML / Markdown with LaTeX ($...$)
            </div>
            <TextArea
              fill
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={!problem.canEdit}
              style={{
                flex: 1,
                minHeight: 480,
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: 13,
                lineHeight: 1.5,
                padding: 12,
              }}
              placeholder="<h3>Description</h3>&#10;&#10;<p>Write problem statement here. Supports HTML and LaTeX math formulas like $1 \le N \le 10^5$.</p>"
            />
          </div>
        )}

        {/* Live Preview column */}
        {viewMode !== 'edit' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 6, fontWeight: 500, color: isDarkMode ? '#a7b6c2' : '#5c7080' }}>
              Live Formatted Preview
            </div>
            <Card
              className="content-card"
              elevation={0}
              style={{
                flex: 1,
                minHeight: 480,
                overflowY: 'auto',
                padding: 24,
              }}
            >
              <h2 className="programming-problem-statement__name" style={{ marginTop: 0, marginBottom: 20 }}>
                {title || 'Untitled Problem'}
              </h2>
              <div className="programming-problem-statement__text">
                {text ? (
                  <RichStatementText>{text}</RichStatementText>
                ) : (
                  <p style={{ color: '#8a9ba8', fontStyle: 'italic', textAlign: 'center', marginTop: 40 }}>
                    No content written yet.
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Add Language Dialog */}
      <Dialog
        isOpen={isAddLanguageOpen}
        onClose={() => setIsAddLanguageOpen(false)}
        title="Add Statement Translation Language"
      >
        <DialogBody>
          <FormGroup label="Select Language">
            <HTMLSelect
              fill
              value={selectedNewLang}
              onChange={e => setSelectedNewLang(e.target.value)}
            >
              {COMMON_LANGUAGES.filter(
                cl => !availableLanguages.some(al => al.code === cl.code)
              ).map(cl => (
                <option key={cl.code} value={cl.code}>
                  {cl.name} ({cl.code})
                </option>
              ))}
            </HTMLSelect>
          </FormGroup>
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button onClick={() => setIsAddLanguageOpen(false)} text="Cancel" />
              <Button
                intent={Intent.PRIMARY}
                text="Add Language"
                loading={addLangMutation.isPending}
                onClick={handleAddLanguage}
              />
            </>
          }
        />
      </Dialog>

      {/* Media Files Dialog */}
      <Dialog
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        title="Statement Media Files (Images / Diagrams)"
        style={{ width: 680 }}
      >
        <DialogBody>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div style={{ margin: 0, color: isDarkMode ? '#abb3bf' : '#5c7080', fontSize: 13, lineHeight: '1.4' }}>
              Upload images to use in the statement. You can embed them with <code style={{ whiteSpace: 'nowrap' }}>&lt;img src="..." /&gt;</code>.
            </div>
            <label className="bp5-button bp5-intent-primary bp5-small" style={{ flexShrink: 0 }}>
              <CloudUpload style={{ marginRight: 6 }} />
              Upload Image
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadMedia}
                style={{ display: 'none' }}
                disabled={isUploadingMedia}
              />
            </label>
          </div>

          {mediaFiles.length === 0 ? (
            <Callout intent={Intent.NONE}>No media files uploaded yet.</Callout>
          ) : (
            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              <HTMLTable striped style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Size</th>
                    <th>Embed Tag</th>
                  </tr>
                </thead>
                <tbody>
                  {mediaFiles.map(file => {
                    const tag = `<img src="${file.url}" alt="${file.name}" />`;
                    return (
                      <tr key={file.name}>
                        <td style={{ verticalAlign: 'middle' }}>
                          <a href={file.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                            {file.name}
                          </a>
                        </td>
                        <td style={{ verticalAlign: 'middle' }}>{Math.round(file.size / 1024)} KB</td>
                        <td style={{ verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <code style={{ fontSize: 11, background: isDarkMode ? '#1e232a' : '#edf1f5', padding: '2px 6px', borderRadius: 3, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tag}
                            </code>
                            <Button
                              small
                              minimal
                              intent={Intent.PRIMARY}
                              text="Copy"
                              onClick={() => {
                                navigator.clipboard.writeText(tag);
                                showSuccessToast('Tag copied to clipboard!');
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </HTMLTable>
            </div>
          )}
        </DialogBody>
        <DialogFooter
          actions={<Button onClick={() => setIsMediaModalOpen(false)} text="Close" />}
        />
      </Dialog>
    </div>
  );
}
