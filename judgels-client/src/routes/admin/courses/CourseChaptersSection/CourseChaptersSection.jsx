import {
  Alert,
  Button,
  ButtonGroup,
  Callout,
  Classes,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  HTMLSelect,
  HTMLTable,
  InputGroup,
  Intent,
  Radio,
  RadioGroup,
  Tag,
} from '@blueprintjs/core';
import { ArrowDown, ArrowUp, Edit, Help, Plus, Refresh, Trash } from '@blueprintjs/icons';
import { Flex } from '@blueprintjs/labs';
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { ButtonLink } from '../../../../components/ButtonLink/ButtonLink';
import { chaptersQueryOptions, createChapterMutationOptions } from '../../../../modules/queries/chapter';
import {
  courseChaptersQueryOptions,
  setCourseChaptersMutationOptions,
} from '../../../../modules/queries/courseChapter';
import * as toastActions from '../../../../modules/toast/toastActions';
import CourseChaptersEditForm from '../CourseChaptersEditForm/CourseChaptersEditForm';

export function CourseChaptersSection({ course }) {
  const navigate = useNavigate();
  const { data: chaptersResponse } = useSuspenseQuery(courseChaptersQueryOptions(course.jid));
  const { data: allChaptersResponse } = useQuery(chaptersQueryOptions());
  const setChaptersMutation = useMutation(setCourseChaptersMutationOptions(course.jid));
  const createChapterMutation = useMutation(createChapterMutationOptions);

  const [isRawEditing, setIsRawEditing] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addMode, setAddMode] = useState('existing'); // 'existing' or 'new'
  const [alias, setAlias] = useState('');
  const [selectedChapterJid, setSelectedChapterJid] = useState('');
  const [newChapterName, setNewChapterName] = useState('');

  const currentChapters = chaptersResponse.data || [];
  const chaptersMap = chaptersResponse.chaptersMap || {};
  const allChapters = allChaptersResponse?.data || [];

  const handleOpenAddDialog = () => {
    const nextNum = currentChapters.length + 1;
    setAlias(String(nextNum).padStart(2, '0'));
    setNewChapterName('');
    const unusedChapter = allChapters.find(
      ac => !currentChapters.some(cc => cc.chapterJid === ac.jid)
    );
    setSelectedChapterJid(unusedChapter ? unusedChapter.jid : allChapters[0]?.jid || '');
    setAddMode('new');
    setIsAddDialogOpen(true);
  };

  const handleAddChapter = async () => {
    if (!alias.trim()) {
      toastActions.showErrorToast('Alias bab harus diisi (contoh: 01, 02, bab-1).');
      return;
    }

    let targetChapterJid = selectedChapterJid;

    if (addMode === 'new') {
      if (!newChapterName.trim()) {
        toastActions.showErrorToast('Nama bab baru harus diisi.');
        return;
      }
      try {
        const created = await createChapterMutation.mutateAsync({ name: newChapterName.trim() });
        targetChapterJid = created.jid;
      } catch (err) {
        toastActions.showErrorToast(err?.message || 'Gagal membuat bab baru.');
        return;
      }
    }

    if (!targetChapterJid) {
      toastActions.showErrorToast('Silakan pilih atau buat bab terlebih dahulu.');
      return;
    }

    const updated = [
      ...currentChapters.map(c => ({ alias: c.alias, chapterJid: c.chapterJid })),
      { alias: alias.trim(), chapterJid: targetChapterJid },
    ];

    setChaptersMutation.mutate(updated, {
      onSuccess: () => {
        toastActions.showSuccessToast('Bab berhasil ditambahkan ke dalam course.');
        setIsAddDialogOpen(false);
      },
      onError: err => {
        toastActions.showErrorToast(err?.message || 'Gagal menyimpan perubahan bab.');
      },
    });
  };

  const handleRemoveChapter = index => {
    const updated = currentChapters
      .filter((_, i) => i !== index)
      .map(c => ({ alias: c.alias, chapterJid: c.chapterJid }));

    setChaptersMutation.mutate(updated, {
      onSuccess: () => toastActions.showSuccessToast('Bab dihapus dari course.'),
      onError: err => toastActions.showErrorToast(err?.message || 'Gagal menghapus bab.'),
    });
  };

  const handleMove = (index, direction) => {
    const updated = currentChapters.map(c => ({ alias: c.alias, chapterJid: c.chapterJid }));
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= updated.length) return;

    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;

    setChaptersMutation.mutate(updated, {
      onSuccess: () => toastActions.showSuccessToast('Urutan bab diperbarui.'),
    });
  };

  const updateRawChapters = data => {
    const chapters = deserializeChapters(data.chapters);
    setChaptersMutation.mutate(chapters, {
      onSuccess: () => {
        toastActions.showSuccessToast('Course chapters updated.');
        setIsRawEditing(false);
      },
    });
  };

  return (
    <div>
      <Callout intent={Intent.PRIMARY} icon={<Help />} style={{ marginBottom: 16 }}>
        <strong>Struktur Course & Bab (Chapter):</strong> Course terdiri dari beberapa Bab.
        Setiap Bab memiliki <strong>Materi (Lessons)</strong> dan <strong>Soal (Problems)</strong>.
        Klik tombol <strong>Kelola Materi & Soal</strong> pada salah satu bab untuk menambahkan penjelasan materi atau latihan soal ke bab tersebut.
      </Callout>

      <Flex justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} style={{ marginBottom: 12 }}>
        <h4 style={{ margin: 0 }}>
          <span>Daftar Bab (Chapters)</span>
        </h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            small
            intent={Intent.PRIMARY}
            icon={<Plus />}
            text="Tambah Bab ke Course"
            onClick={handleOpenAddDialog}
          />
          <Button
            small
            minimal
            icon={<Edit />}
            text={isRawEditing ? 'Batal Edit Teks' : 'Edit Bulk / Teks'}
            onClick={() => setIsRawEditing(!isRawEditing)}
          />
        </div>
      </Flex>

      {isRawEditing ? (
        <CourseChaptersEditForm
          initialValues={{ chapters: serializeChapters(chaptersResponse.data) }}
          validator={validateChapters}
          onSubmit={updateRawChapters}
          onCancel={() => setIsRawEditing(false)}
        />
      ) : currentChapters.length === 0 ? (
        <Callout intent={Intent.NONE} style={{ textAlign: 'center', padding: 24 }}>
          Course ini belum memiliki bab. Klik <strong>Tambah Bab ke Course</strong> untuk membuat bab baru atau menghubungkan bab yang sudah ada.
        </Callout>
      ) : (
        <div className="table-responsive">
          <HTMLTable striped style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Alias</th>
              <th>Nama Bab</th>
              <th style={{ width: '280px', textAlign: 'right' }}>Aksi & Konten</th>
            </tr>
          </thead>
          <tbody>
            {currentChapters.map((courseChapter, index) => {
              const chapterName = chaptersMap[courseChapter.chapterJid]?.name || courseChapter.chapterJid;
              return (
                <tr key={courseChapter.chapterJid}>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Tag round minimal style={{ fontWeight: 600 }}>
                      {courseChapter.alias}
                    </Tag>
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Link
                      to={`/admin/chapters/${courseChapter.chapterJid}`}
                      style={{ fontWeight: 600, fontSize: 14 }}
                    >
                      {chapterName}
                    </Link>
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                    <ButtonGroup>
                      <Button
                        small
                        icon={<ArrowUp />}
                        disabled={index === 0 || setChaptersMutation.isPending}
                        onClick={() => handleMove(index, 'up')}
                        title="Geser ke atas"
                      />
                      <Button
                        small
                        icon={<ArrowDown />}
                        disabled={index === currentChapters.length - 1 || setChaptersMutation.isPending}
                        onClick={() => handleMove(index, 'down')}
                        title="Geser ke bawah"
                      />
                      <ButtonLink
                        small
                        intent={Intent.PRIMARY}
                        icon={<Edit />}
                        text="Kelola Materi & Soal"
                        to={`/admin/chapters/${courseChapter.chapterJid}`}
                      />
                      <Button
                        small
                        minimal
                        intent={Intent.DANGER}
                        icon={<Trash />}
                        disabled={setChaptersMutation.isPending}
                        onClick={() => handleRemoveChapter(index)}
                        title="Hapus bab dari course ini"
                      />
                    </ButtonGroup>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </HTMLTable>
        </div>
      )}

      {/* Add Chapter Dialog */}
      <Dialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Tambah Bab ke Course"
        style={{ width: 560 }}
      >
        <DialogBody>
          <FormGroup
            label="Alias Bab dalam Course"
            helperText="Kode pengenal urutan bab dalam course (contoh: 01, 02, A, B, bab-1)"
          >
            <InputGroup
              value={alias}
              onChange={e => setAlias(e.target.value)}
              placeholder="01"
            />
          </FormGroup>

          <FormGroup label="Pilihan Sumber Bab">
            <RadioGroup
              selectedValue={addMode}
              onChange={e => setAddMode(e.target.value)}
              inline
            >
              <Radio label="Buat Bab Baru" value="new" />
              <Radio label="Pilih Bab yang Sudah Ada" value="existing" />
            </RadioGroup>
          </FormGroup>

          {addMode === 'new' ? (
            <FormGroup
              label="Nama Bab Baru"
              helperText="Nama bab yang akan ditampilkan kepada peserta (contoh: Bab 1 - Pengenalan Bahasa C++)"
            >
              <InputGroup
                value={newChapterName}
                onChange={e => setNewChapterName(e.target.value)}
                placeholder="Contoh: Bab 1 - Pengenalan Pemrograman"
              />
            </FormGroup>
          ) : (
            <FormGroup
              label="Pilih Bab"
              helperText="Pilih dari bab yang telah dibuat sebelumnya di sistem"
            >
              <HTMLSelect
                fill
                value={selectedChapterJid}
                onChange={e => setSelectedChapterJid(e.target.value)}
              >
                {allChapters.map(c => (
                  <option key={c.jid} value={c.jid}>
                    {c.name} ({c.jid})
                  </option>
                ))}
              </HTMLSelect>
            </FormGroup>
          )}
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button text="Batal" onClick={() => setIsAddDialogOpen(false)} />
              <Button
                intent={Intent.PRIMARY}
                text="Tambahkan ke Course"
                loading={setChaptersMutation.isPending || createChapterMutation.isPending}
                onClick={handleAddChapter}
              />
            </>
          }
        />
      </Dialog>
    </div>
  );
}

function serializeChapters(chapters) {
  return chapters.map(c => `${c.alias},${c.chapterJid}`).join('\n');
}

function deserializeChapters(chapters) {
  return chapters
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.split(','))
    .map(s => s.map(t => t.trim()))
    .map(s => ({
      alias: s[0],
      chapterJid: s[1],
    }));
}

function validateChapters(value) {
  const chapters = value
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.split(','));

  for (const [alias, chapterJid] of chapters) {
    if (!alias || !chapterJid) {
      return 'Format must be alias,chapterJid';
    }
  }
}
