import { Button, Callout, Card, FormGroup, InputGroup, Intent, Tab, Tabs, Tag, TextArea } from '@blueprintjs/core';
import { Book, ChevronLeft, EyeOpen, FloppyDisk, InfoSign, Plus } from '@blueprintjs/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { ActionButtons } from '../../../components/ActionButtons/ActionButtons';
import { ContentCard } from '../../../components/ContentCard/ContentCard';
import { LoadingState } from '../../../components/LoadingState/LoadingState';
import RichStatementText from '../../../components/RichStatementText/RichStatementText';
import { lessonDetailQueryOptions, updateLessonMutationOptions } from '../../../modules/queries/lesson';
import { useWebPrefs } from '../../../modules/webPrefs';

import { showErrorToast, showSuccessToast } from '../../../modules/toast/toastActions';

export default function LessonEditPage() {
  const { lessonId } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDarkMode } = useWebPrefs();

  const { data: lesson, isLoading, error } = useQuery(lessonDetailQueryOptions(lessonId));

  const [slug, setSlug] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState('edit');

  useEffect(() => {
    if (lesson) {
      setSlug(lesson.slug || '');
      setAdditionalNote(lesson.additionalNote || '');
      setTitle(lesson.title || '');
      setText(lesson.text || '');
    }
  }, [lesson]);

  const updateMutation = useMutation(updateLessonMutationOptions(lessonId));

  const handleSave = e => {
    e.preventDefault();
    if (!slug.trim()) return;

    updateMutation.mutate(
      {
        slug: slug.trim(),
        additionalNote: additionalNote.trim(),
        title: title.trim(),
        text,
      },
      {
        onSuccess: () => {
          showSuccessToast('Lesson details and statement saved successfully.');
          queryClient.invalidateQueries({ queryKey: ['lesson-detail', String(lessonId)] });
        },
        onError: err => {
          showErrorToast(err?.response?.data?.message || err);
        },
      }
    );
  };

  const renderHeaderActions = () => (
    <ActionButtons>
      <Button
        minimal
        icon={<ChevronLeft />}
        text="Kembali ke Daftar Lesson"
        onClick={() => navigate({ to: '/admin/lessons' })}
      />
      {lesson?.canEdit && (
        <Button
          intent={Intent.PRIMARY}
          icon={<FloppyDisk />}
          text="Simpan Materi"
          loading={updateMutation.isPending}
          onClick={handleSave}
        />
      )}
    </ActionButtons>
  );

  if (isLoading) {
    return (
      <ContentCard title="Edit Lesson">
        {renderHeaderActions()}
        <LoadingState />
      </ContentCard>
    );
  }

  if (error || !lesson) {
    return (
      <ContentCard title="Edit Lesson">
        {renderHeaderActions()}
        <Callout intent={Intent.DANGER} title="Lesson Tidak Ditemukan" style={{ marginTop: 16 }}>
          Materi pembelajaran #{lessonId} tidak ditemukan.
        </Callout>
      </ContentCard>
    );
  }

  return (
    <ContentCard
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>Lesson: {lesson.slug}</span>
          <Tag intent={Intent.PRIMARY} round minimal>
            ID #{lesson.id}
          </Tag>
          <Tag minimal round>
            Pembuat: @{lesson.authorUsername}
          </Tag>
        </div>
      }
    >
      {renderHeaderActions()}

      <form onSubmit={handleSave} style={{ maxWidth: 850, marginTop: 16 }}>
        {/* GENERAL SETTINGS */}
        <Card style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>Informasi Umum</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormGroup
              label="Slug (Pengenal Unik)"
              labelFor="lesson-slug"
              helperText="Digunakan untuk menghubungkan materi ke Chapter (contoh: pengenalan-cpp)."
            >
              <InputGroup
                id="lesson-slug"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                disabled={!lesson.canEdit}
                required
              />
            </FormGroup>

            <FormGroup label="Catatan Tambahan (Internal)" labelFor="lesson-note">
              <InputGroup
                id="lesson-note"
                value={additionalNote}
                onChange={e => setAdditionalNote(e.target.value)}
                disabled={!lesson.canEdit}
                placeholder="Catatan pengembang"
              />
            </FormGroup>
          </div>
        </Card>

        {/* STATEMENT & CONTENT */}
        <Card style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>Konten & Materi Pembelajaran</h4>

          <FormGroup
            label="Judul Materi (Title)"
            labelFor="lesson-title"
            helperText="Judul yang dibaca oleh peserta saat membuka materi ini."
          >
            <InputGroup
              id="lesson-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={!lesson.canEdit}
              large
              placeholder="Contoh: Bab 1: Pengenalan Sintaks Dasar"
              required
            />
          </FormGroup>

          <Tabs
            id="lesson-statement-tabs"
            selectedTabId={activeTab}
            onChange={tabId => setActiveTab(tabId)}
            style={{ marginTop: 16 }}
          >
            <Tab
              id="edit"
              title="Editor Teks (Markdown)"
              panel={
                <div style={{ marginTop: 12 }}>
                  <FormGroup
                    label="Isi Materi (Mendukung Markdown & LaTeX Math: $...$, $$...$$)"
                    labelFor="lesson-text"
                  >
                    <TextArea
                      id="lesson-text"
                      fill
                      rows={18}
                      value={text}
                      onChange={e => setText(e.target.value)}
                      disabled={!lesson.canEdit}
                      style={{
                        fontFamily: 'Consolas, Monaco, monospace',
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                      placeholder="# Judul Bagian\n\nTulis penjelasan materi di sini..."
                    />
                  </FormGroup>
                </div>
              }
            />

            <Tab
              id="preview"
              title={
                <span>
                  <EyeOpen style={{ marginRight: 6 }} /> Pratinjau Tampilan (Preview)
                </span>
              }
              panel={
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      border: `1px solid ${isDarkMode ? '#383e47' : '#d3dce3'}`,
                      borderRadius: 4,
                      padding: 20,
                      backgroundColor: isDarkMode ? '#252a31' : '#fff',
                      minHeight: 250,
                    }}
                  >
                    <h2
                      style={{
                        marginTop: 0,
                        borderBottom: `1px solid ${isDarkMode ? '#383e47' : '#eee'}`,
                        paddingBottom: 10,
                      }}
                    >
                      {title || <em>Tanpa Judul</em>}
                    </h2>
                    <RichStatementText>{text || ''}</RichStatementText>
                  </div>
                </div>
              }
            />
          </Tabs>
        </Card>

        {lesson.canEdit && (
          <Button
            type="submit"
            intent={Intent.PRIMARY}
            large
            icon={<FloppyDisk />}
            text="Simpan Perubahan Materi"
            loading={updateMutation.isPending}
          />
        )}
      </form>
    </ContentCard>
  );
}
