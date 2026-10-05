import {
  Alert,
  Button,
  Card,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  HTMLTable,
  InputGroup,
  Intent,
  Spinner,
  Tag,
} from '@blueprintjs/core';
import { Book, Edit, Plus, Search, Trash } from '@blueprintjs/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { ActionButtons } from '../../../components/ActionButtons/ActionButtons';
import { ContentCard } from '../../../components/ContentCard/ContentCard';
import { LoadingState } from '../../../components/LoadingState/LoadingState';
import Pagination from '../../../components/Pagination/Pagination';
import {
  createLessonMutationOptions,
  deleteLessonMutationOptions,
  lessonsQueryOptions,
} from '../../../modules/queries/lesson';

import { showErrorToast, showSuccessToast } from '../../../modules/toast/toastActions';

export default function LessonsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState(null);

  // New Lesson form state
  const [newSlug, setNewSlug] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');

  const { data: response, isLoading } = useQuery(lessonsQueryOptions(page, term));
  const lessons = response?.data || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / 20) || 1;

  const createMutation = useMutation(createLessonMutationOptions());
  const deleteMutation = useMutation(deleteLessonMutationOptions());

  const handleSearch = e => {
    e.preventDefault();
    setTerm(searchTerm.trim());
    setPage(1);
  };

  const handleCreate = e => {
    e.preventDefault();
    if (!newSlug.trim()) return;

    createMutation.mutate(
      {
        slug: newSlug.trim().toLowerCase().replace(/\s+/g, '-'),
        title: newTitle.trim() || newSlug.trim(),
        additionalNote: newNote.trim(),
      },
      {
        onSuccess: res => {
          showSuccessToast('Lesson created successfully.');
          setIsNewDialogOpen(false);
          setNewSlug('');
          setNewTitle('');
          setNewNote('');
          queryClient.invalidateQueries({ queryKey: ['manageable-lessons'] });
          if (res?.id) {
            navigate({ to: `/admin/lessons/${res.id}` });
          }
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
        intent={Intent.PRIMARY}
        icon={<Plus />}
        text="Buat Lesson Baru"
        onClick={() => setIsNewDialogOpen(true)}
      />
    </ActionButtons>
  );

  return (
    <ContentCard title="Manajemen Materi Pembelajaran (Lessons)">
      {renderHeaderActions()}

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, maxWidth: 450, flexWrap: 'wrap' }}>
          <InputGroup
            leftIcon="search"
            placeholder="Cari lesson berdasarkan slug atau catatan..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <Button type="submit" icon={<Search />} text="Cari" />
          {term && (
            <Button
              minimal
              text="Reset"
              onClick={() => {
                setTerm('');
                setSearchTerm('');
                setPage(1);
              }}
            />
          )}
        </form>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : lessons.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: '#8a9ba8',
            border: '1px dashed #d3dce3',
            borderRadius: 4,
            marginTop: 16,
          }}
        >
          {term
            ? `Tidak ada lesson yang cocok dengan "${term}".`
            : 'Belum ada lesson. Klik "Buat Lesson Baru" untuk membuat materi pertama.'}
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <HTMLTable striped interactive style={{ width: '100%', marginTop: 16 }}>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>ID</th>
                  <th>Slug (Identifier)</th>
                  <th>Catatan Tambahan</th>
                  <th style={{ width: 140 }}>Pembuat</th>
                  <th style={{ width: 160 }}>Terakhir Diperbarui</th>
                  <th style={{ width: 160, textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map(lesson => (
                  <tr key={lesson.id}>
                    <td style={{ verticalAlign: 'middle', color: '#5c7080' }}>#{lesson.id}</td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <Link to={`/admin/lessons/${lesson.id}`} style={{ fontWeight: 600, color: '#106ba3' }}>
                        <Book style={{ marginRight: 6 }} />
                        {lesson.slug}
                      </Link>
                    </td>
                    <td style={{ verticalAlign: 'middle', color: '#5c7080' }}>{lesson.additionalNote || '-'}</td>
                    <td style={{ verticalAlign: 'middle' }}>@{lesson.authorUsername}</td>
                    <td style={{ verticalAlign: 'middle', color: '#5c7080', fontSize: 13 }}>
                      {lesson.updatedAt ? new Date(lesson.updatedAt).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div className="action-button-group" style={{ justifyContent: 'center' }}>
                        <Link to={`/admin/lessons/${lesson.id}`}>
                          <Button small intent={Intent.PRIMARY} icon={<Edit />} text="Edit" />
                        </Link>
                        <Button
                          small
                          minimal
                          intent={Intent.DANGER}
                          icon={<Trash />}
                          onClick={() => setLessonToDelete(lesson)}
                          title="Delete lesson"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </HTMLTable>
          </div>

          {total > 20 && (
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
              <Pagination pageSize={20} totalCount={total} />
            </div>
          )}
        </>
      )}

      {/* NEW LESSON DIALOG */}
      <Dialog
        isOpen={isNewDialogOpen}
        onClose={() => setIsNewDialogOpen(false)}
        title="Buat Materi Pembelajaran Baru (New Lesson)"
        style={{ width: 500 }}
      >
        <form onSubmit={handleCreate}>
          <DialogBody>
            <FormGroup
              label="Slug Lesson (Harus Unik)"
              labelFor="lesson-slug"
              helperText="Gunakan huruf kecil, angka, dan tanda strip. Contoh: pengenalan-c-plus-plus"
            >
              <InputGroup
                id="lesson-slug"
                placeholder="misal: pengenalan-c-plus-plus"
                value={newSlug}
                onChange={e => setNewSlug(e.target.value)}
                required
              />
            </FormGroup>

            <FormGroup
              label="Judul Materi (Title)"
              labelFor="lesson-title"
              helperText="Judul yang ditampilkan kepada peserta."
            >
              <InputGroup
                id="lesson-title"
                placeholder="misal: Pengenalan Bahasa C++"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
            </FormGroup>

            <FormGroup label="Catatan Tambahan (Opsional)" labelFor="lesson-note">
              <InputGroup
                id="lesson-note"
                placeholder="Catatan internal pengembang materi"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
              />
            </FormGroup>
          </DialogBody>

          <DialogFooter
            actions={
              <>
                <Button text="Batal" onClick={() => setIsNewDialogOpen(false)} />
                <Button type="submit" intent={Intent.PRIMARY} text="Buat Lesson" loading={createMutation.isPending} />
              </>
            }
          />
        </form>
      </Dialog>

      <Alert
        isOpen={lessonToDelete !== null}
        cancelButtonText="Batal"
        confirmButtonText="Hapus Lesson"
        intent={Intent.DANGER}
        icon="trash"
        loading={deleteMutation.isPending}
        onCancel={() => setLessonToDelete(null)}
        onConfirm={() => {
          if (lessonToDelete) {
            deleteMutation.mutate(lessonToDelete.id, {
              onSuccess: () => {
                showSuccessToast(`Lesson "${lessonToDelete.slug}" berhasil dihapus.`);
                setLessonToDelete(null);
              },
              onError: err => {
                showErrorToast(err?.response?.data?.message || err?.message || 'Gagal menghapus lesson.');
              },
            });
          }
        }}
      >
        Apakah Anda yakin ingin menghapus materi <strong>{lessonToDelete?.slug}</strong>? Tindakan ini tidak dapat
        dibatalkan.
      </Alert>
    </ContentCard>
  );
}
