import {
  Alert,
  Button,
  ButtonGroup,
  Callout,
  Card,
  Dialog,
  DialogBody,
  DialogFooter,
  Divider,
  FormGroup,
  HTMLSelect,
  HTMLTable,
  Icon,
  InputGroup,
  Intent,
  NumericInput,
  Radio,
  RadioGroup,
  Spinner,
  Tag,
  TextArea,
} from '@blueprintjs/core';
import { ArrowDown, ArrowUp, Edit, Help, Plus, Refresh, Tick, Trash } from '@blueprintjs/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import RichStatementText from '../../../../components/RichStatementText/RichStatementText';
import { problemAPI } from '../../../../modules/api/problem';
import { getToken } from '../../../../modules/session';
import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';
import { useWebPrefs } from '../../../../modules/webPrefs';

export default function ProblemBundleItemsTab({ problem, problemId }) {
  const queryClient = useQueryClient();
  const { isDarkMode } = useWebPrefs();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItemJid, setDeletingItemJid] = useState(null);

  // Form states for create/edit
  const [itemType, setItemType] = useState('MULTIPLE_CHOICE');
  const [statement, setStatement] = useState('');
  const [score, setScore] = useState(4);
  const [penalty, setPenalty] = useState(0);
  const [choices, setChoices] = useState([
    { alias: 'a', content: '', isCorrect: true },
    { alias: 'b', content: '', isCorrect: false },
    { alias: 'c', content: '', isCorrect: false },
    { alias: 'd', content: '', isCorrect: false },
  ]);
  const [gradingRegex, setGradingRegex] = useState('');
  const [inputValidationRegex, setInputValidationRegex] = useState('.*');

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['problem-bundle-items', String(problemId)],
    queryFn: () => problemAPI.getBundleItems(getToken(), problemId),
  });

  const createMutation = useMutation({
    mutationFn: body => problemAPI.createBundleItem(getToken(), problemId, body),
    onSuccess: () => {
      showSuccessToast('Item created successfully.');
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['problem-bundle-items', String(problemId)] });
      queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
    },
    onError: err => showErrorToast(err?.message || 'Failed to create item.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemJid, body }) => problemAPI.updateBundleItem(getToken(), problemId, itemJid, body),
    onSuccess: () => {
      showSuccessToast('Item updated successfully.');
      setEditingItem(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['problem-bundle-items', String(problemId)] });
      queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
    },
    onError: err => showErrorToast(err?.message || 'Failed to update item.'),
  });

  const deleteMutation = useMutation({
    mutationFn: itemJid => problemAPI.deleteBundleItem(getToken(), problemId, itemJid),
    onSuccess: () => {
      showSuccessToast('Item removed.');
      setDeletingItemJid(null);
      queryClient.invalidateQueries({ queryKey: ['problem-bundle-items', String(problemId)] });
      queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
    },
    onError: err => showErrorToast(err?.message || 'Failed to delete item.'),
  });

  const moveMutation = useMutation({
    mutationFn: ({ itemJid, direction }) => problemAPI.moveBundleItem(getToken(), problemId, itemJid, direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problem-bundle-items', String(problemId)] });
      queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
    },
  });

  const resetForm = () => {
    setItemType('MULTIPLE_CHOICE');
    setStatement('');
    setScore(4);
    setPenalty(0);
    setChoices([
      { alias: 'a', content: '', isCorrect: true },
      { alias: 'b', content: '', isCorrect: false },
      { alias: 'c', content: '', isCorrect: false },
      { alias: 'd', content: '', isCorrect: false },
    ]);
    setGradingRegex('');
    setInputValidationRegex('.*');
  };

  const openCreateDialog = (defaultType = 'MULTIPLE_CHOICE') => {
    resetForm();
    setItemType(defaultType);
    if (defaultType === 'SHORT_ANSWER') {
      setScore(10);
    }
    setIsCreateOpen(true);
  };

  const openEditDialog = item => {
    setEditingItem(item);
    setItemType(item.type);
    const cfg = item.config || {};
    setStatement(cfg.statement || '');
    setScore(cfg.score ?? (item.type === 'MULTIPLE_CHOICE' ? 4 : 10));
    setPenalty(cfg.penalty ?? 0);
    if (item.type === 'MULTIPLE_CHOICE') {
      setChoices(
        cfg.choices && cfg.choices.length > 0
          ? cfg.choices
          : [
              { alias: 'a', content: '', isCorrect: true },
              { alias: 'b', content: '', isCorrect: false },
            ]
      );
    } else {
      setGradingRegex(cfg.gradingRegex || '');
      setInputValidationRegex(cfg.inputValidationRegex || '.*');
    }
  };

  const handleSave = () => {
    const body = {
      type: itemType,
      statement,
      score: Number(score),
      penalty: Number(penalty),
    };
    if (itemType === 'MULTIPLE_CHOICE') {
      body.choices = choices;
    } else if (itemType === 'SHORT_ANSWER') {
      body.gradingRegex = gradingRegex;
      body.inputValidationRegex = inputValidationRegex;
    }

    if (editingItem) {
      updateMutation.mutate({ itemJid: editingItem.jid, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const handleChoiceContentChange = (index, value) => {
    setChoices(prev => {
      const next = [...prev];
      next[index] = { ...next[index], content: value };
      return next;
    });
  };

  const handleSetCorrectChoice = index => {
    setChoices(prev =>
      prev.map((c, i) => ({
        ...c,
        isCorrect: i === index,
      }))
    );
  };

  const addChoice = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const nextAlias = letters[choices.length] || `opt${choices.length + 1}`;
    setChoices(prev => [...prev, { alias: nextAlias, content: '', isCorrect: false }]);
  };

  const removeChoice = index => {
    if (choices.length <= 2) {
      showErrorToast('A multiple choice question must have at least 2 choices.');
      return;
    }
    setChoices(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ marginTop: 8 }}>
      {/* Informative Guidance Callout */}
      <Callout
        intent={Intent.PRIMARY}
        icon={<Help />}
        style={{ marginBottom: 16 }}
      >
        <strong>Tentang Soal Tipe Bundling:</strong> Soal bundling berisi satu atau lebih butir pertanyaan:
        <strong> Pilihan Ganda (Multiple Choice)</strong> dan/atau <strong>Isian Singkat (Short Answer)</strong>.
        Kunci jawaban diatur langsung pada setiap butir soal di bawah ini. Anda dapat membuat soal menggunakan teks biasa atau format HTML/Markdown.
      </Callout>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Daftar Butir Soal ({items.length})</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            intent={Intent.PRIMARY}
            icon={<Plus />}
            text="Tambah Pilihan Ganda"
            onClick={() => openCreateDialog('MULTIPLE_CHOICE')}
          />
          <Button
            intent={Intent.NONE}
            icon={<Plus />}
            text="Tambah Isian Singkat"
            onClick={() => openCreateDialog('SHORT_ANSWER')}
          />
          <Button
            minimal
            icon={<Refresh />}
            onClick={() => refetch()}
            title="Refresh items"
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ margin: 0, color: isDarkMode ? '#8a9ba8' : '#5c7080' }}>
            Belum ada butir soal dalam bundling ini. Klik <strong>Tambah Pilihan Ganda</strong> atau <strong>Tambah Isian Singkat</strong> di atas untuk membuat soal baru!
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((item, index) => {
            const cfg = item.config || {};
            const isMC = item.type === 'MULTIPLE_CHOICE';
            return (
              <Card key={item.jid} style={{ padding: 18 }}>
                {/* Header: Title, Type Tag, Points, and Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: 10,
                    marginBottom: 12,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>
                      Soal #{item.number ?? index + 1}
                    </span>
                    <Tag
                      minimal
                      round
                      intent={isMC ? Intent.PRIMARY : Intent.WARNING}
                    >
                      {isMC ? 'Pilihan Ganda' : 'Isian Singkat'}
                    </Tag>
                    <span style={{ fontSize: 13, color: isDarkMode ? '#8a9ba8' : '#5c7080' }}>
                      • Bobot: <strong>{cfg.score ?? 0} poin</strong>{cfg.penalty ? ` (penalti: -${cfg.penalty})` : ''}
                    </span>
                  </div>

                  <ButtonGroup minimal>
                    <Button
                      small
                      icon={<ArrowUp />}
                      disabled={index === 0 || moveMutation.isPending}
                      onClick={() => moveMutation.mutate({ itemJid: item.jid, direction: 'up' })}
                      title="Pindah ke atas"
                    />
                    <Button
                      small
                      icon={<ArrowDown />}
                      disabled={index === items.length - 1 || moveMutation.isPending}
                      onClick={() => moveMutation.mutate({ itemJid: item.jid, direction: 'down' })}
                      title="Pindah ke bawah"
                    />
                    <Button
                      small
                      intent={Intent.PRIMARY}
                      icon={<Edit />}
                      text="Edit"
                      onClick={() => openEditDialog(item)}
                      title="Edit soal dan kunci"
                    />
                    <Button
                      small
                      intent={Intent.DANGER}
                      icon={<Trash />}
                      onClick={() => setDeletingItemJid(item.jid)}
                      title="Hapus butir soal"
                    />
                  </ButtonGroup>
                </div>

                {/* Statement text */}
                <div className="bundle-problem-statement-item__statement" style={{ marginBottom: 12 }}>
                  <div className="__item-statement" style={{ fontSize: 14, lineHeight: '1.6' }}>
                    {cfg.statement ? (
                      <RichStatementText>{cfg.statement}</RichStatementText>
                    ) : (
                      <span style={{ color: isDarkMode ? '#738a9c' : '#8a9ba8', fontStyle: 'italic' }}>
                        (Belum ada teks pertanyaan)
                      </span>
                    )}
                  </div>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* Options / Answer Key */}
                {isMC ? (
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: 8,
                        color: isDarkMode ? '#8a9ba8' : '#5c7080',
                      }}
                    >
                      Pilihan Jawaban:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(cfg.choices || []).map(ch => {
                        const isCorrect = ch.isCorrect;
                        return (
                          <div
                            key={ch.alias}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '6px 12px',
                              borderRadius: 4,
                              backgroundColor: isCorrect
                                ? isDarkMode
                                  ? 'rgba(15, 153, 96, 0.2)'
                                  : 'rgba(15, 153, 96, 0.08)'
                                : 'transparent',
                            }}
                          >
                            <Tag
                              intent={isCorrect ? Intent.SUCCESS : Intent.NONE}
                              minimal={!isCorrect}
                              round={false}
                            >
                              {ch.alias.toUpperCase()}
                            </Tag>
                            <div style={{ flex: 1, fontSize: 13 }}>
                              {ch.content ? (
                                <RichStatementText>{ch.content}</RichStatementText>
                              ) : (
                                <em style={{ color: isDarkMode ? '#738a9c' : '#8a9ba8' }}>(Pilihan kosong)</em>
                              )}
                            </div>
                            {isCorrect && (
                              <Tag
                                minimal
                                intent={Intent.SUCCESS}
                                style={{ fontSize: 11, fontWeight: 600 }}
                              >
                                <Icon icon="tick" size={12} style={{ marginRight: 4 }} />
                                Kunci
                              </Tag>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: 8,
                        color: isDarkMode ? '#8a9ba8' : '#5c7080',
                      }}
                    >
                      Kunci Jawaban:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <Tag minimal intent={Intent.SUCCESS}>Regex Pencocokan</Tag>
                      <code>{cfg.gradingRegex || '.*'}</code>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        isOpen={isCreateOpen || editingItem !== null}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? `Edit Butir Soal Nomor ${editingItem.number ?? ''}` : 'Tambah Butir Soal Baru'}
        style={{ width: 680 }}
      >
        <DialogBody>
          {!editingItem && (
            <FormGroup label="Tipe Butir Soal">
              <HTMLSelect
                fill
                value={itemType}
                onChange={e => {
                  setItemType(e.target.value);
                  if (e.target.value === 'SHORT_ANSWER') setScore(10);
                  else setScore(4);
                }}
              >
                <option value="MULTIPLE_CHOICE">Pilihan Ganda (Multiple Choice)</option>
                <option value="SHORT_ANSWER">Isian Singkat (Short Answer)</option>
              </HTMLSelect>
            </FormGroup>
          )}

          <FormGroup
            label="Pertanyaan / Pernyataan Soal (Mendukung HTML & Markdown)"
            helperText="Anda dapat menulis teks soal langsung, atau menyertakan tag HTML seperti <p>, <b>, <code>, <img> dsb."
          >
            <TextArea
              fill
              rows={4}
              value={statement}
              onChange={e => setStatement(e.target.value)}
              placeholder="Tuliskan pertanyaan di sini..."
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
          </FormGroup>

          <div style={{ display: 'flex', gap: 16 }}>
            <FormGroup label="Bobot Poin (Nilai jika Benar)" style={{ flex: 1 }}>
              <NumericInput
                fill
                value={score}
                onValueChange={v => setScore(v)}
                min={0}
                stepSize={1}
              />
            </FormGroup>
            <FormGroup label="Penalti (Pengurangan jika Salah)" style={{ flex: 1 }}>
              <NumericInput
                fill
                value={penalty}
                onValueChange={v => setPenalty(v)}
                stepSize={0.5}
              />
            </FormGroup>
          </div>

          {itemType === 'MULTIPLE_CHOICE' ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Pilihan Jawaban (Pilih salah satu sebagai Kunci Jawaban):</span>
                <Button small minimal intent={Intent.PRIMARY} icon={<Plus />} text="Tambah Opsi" onClick={addChoice} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {choices.map((c, i) => (
                  <div key={c.alias} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Radio
                      checked={c.isCorrect}
                      onChange={() => handleSetCorrectChoice(i)}
                      label={`Opsi ${c.alias.toUpperCase()}`}
                      style={{ margin: 0, minWidth: 90 }}
                    />
                    <InputGroup
                      fill
                      value={c.content}
                      onChange={e => handleChoiceContentChange(i, e.target.value)}
                      placeholder={`Isi pilihan ${c.alias.toUpperCase()}...`}
                    />
                    {c.isCorrect && <Tag intent={Intent.SUCCESS} round>Kunci</Tag>}
                    {choices.length > 2 && (
                      <Button
                        minimal
                        intent={Intent.DANGER}
                        icon={<Trash />}
                        onClick={() => removeChoice(i)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <FormGroup
                label="Kunci Jawaban (Regex Jawaban yang Diterima)"
                helperText="Contoh: ^42$ untuk angka 42, atau (?i)^jakarta$ untuk teks Jakarta (case-insensitive)"
              >
                <InputGroup
                  fill
                  value={gradingRegex}
                  onChange={e => setGradingRegex(e.target.value)}
                  placeholder="^42$"
                  style={{ fontFamily: 'monospace' }}
                />
              </FormGroup>
              <FormGroup
                label="Validasi Input Peserta (Input Validation Regex)"
                helperText="Pola karakter yang diperbolehkan dimasukkan peserta saat menjawab, default .* (apapun)"
              >
                <InputGroup
                  fill
                  value={inputValidationRegex}
                  onChange={e => setInputValidationRegex(e.target.value)}
                  placeholder=".*"
                  style={{ fontFamily: 'monospace' }}
                />
              </FormGroup>
            </div>
          )}
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button
                text="Batal"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingItem(null);
                }}
              />
              <Button
                intent={Intent.PRIMARY}
                text={editingItem ? 'Simpan Perubahan' : 'Buat Butir Soal'}
                loading={createMutation.isPending || updateMutation.isPending}
                onClick={handleSave}
              />
            </>
          }
        />
      </Dialog>

      {/* Delete confirmation dialog */}
      <Alert
        isOpen={deletingItemJid !== null}
        onCancel={() => setDeletingItemJid(null)}
        onConfirm={() => deleteMutation.mutate(deletingItemJid)}
        intent={Intent.DANGER}
        confirmButtonText="Hapus"
        cancelButtonText="Batal"
      >
        Apakah Anda yakin ingin menghapus butir soal ini? Tindakan ini akan menghapus soal dan kunci jawaban terkait.
      </Alert>
    </div>
  );
}