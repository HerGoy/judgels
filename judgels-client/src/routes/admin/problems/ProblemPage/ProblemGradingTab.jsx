import {
  Button,
  Callout,
  Card,
  Checkbox,
  Dialog,
  Divider,
  FileInput,
  FormGroup,
  HTMLSelect,
  HTMLTable,
  InputGroup,
  Intent,
  ProgressBar,
  Radio,
  RadioGroup,
  Tag,
} from '@blueprintjs/core';
import {
  CloudUpload,
  Cross,
  FloppyDisk,
  InfoSign,
  Plus,
  Refresh,
  Trash,
  Upload,
} from '@blueprintjs/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import {
  deleteProblemHelperMutationOptions,
  problemHelpersQueryOptions,
  updateProblemGradingMutationOptions,
  uploadProblemHelperMutationOptions,
} from '../../../../modules/queries/problem';
import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';
import { useWebPrefs } from '../../../../modules/webPrefs';

const ALL_LANGUAGES = [
  { id: 'C', label: 'C' },
  { id: 'Cpp', label: 'C++' },
  { id: 'Cpp11', label: 'C++11' },
  { id: 'Cpp17', label: 'C++17' },
  { id: 'Cpp20', label: 'C++20' },
  { id: 'Java', label: 'Java 17' },
  { id: 'Python3', label: 'Python 3' },
  { id: 'PyPy3', label: 'PyPy 3' },
  { id: 'Rust2021', label: 'Rust 2021' },
  { id: 'Go', label: 'Go' },
  { id: 'Pascal', label: 'Pascal' },
];

const ENGINE_LABELS = {
  Batch: 'Batch (Standard Input/Output)',
  BatchWithSubtasks: 'Batch with Subtasks (Subtask & Skor Parsial)',
  Interactive: 'Interactive (Komunikator Interaktif)',
  InteractiveWithSubtasks: 'Interactive with Subtasks (Komunikator + Subtask)',
  OutputOnly: 'Output-only (Hanya Output)',
  OutputOnlyWithSubtasks: 'Output-only with Subtasks',
  Functional: 'Functional (Antarmuka Fungsi)',
  FunctionalWithSubtasks: 'Functional with Subtasks',
};

export default function ProblemGradingTab({ problem, problemId }) {
  const queryClient = useQueryClient();
  const { isDarkMode } = useWebPrefs();
  const textColor = isDarkMode ? '#a7b6c2' : '#5c7080';
  const grading = problem.grading || {};

  const [engine, setEngine] = useState(grading.engine || 'Batch');
  const [timeLimit, setTimeLimit] = useState(grading.timeLimit || 2000);
  const [memoryLimit, setMemoryLimit] = useState(grading.memoryLimit || 256);
  const [isAllowedAll, setIsAllowedAll] = useState(grading.isAllowedAll !== false);
  const [allowedLanguages, setAllowedLanguages] = useState(grading.allowedLanguages || []);
  const [customScorer, setCustomScorer] = useState(grading.customScorer || '(none)');
  const [communicator, setCommunicator] = useState(grading.communicator || '(none)');
  const [subtaskPoints, setSubtaskPoints] = useState(
    grading.subtaskPoints && grading.subtaskPoints.length > 0
      ? grading.subtaskPoints
      : [100]
  );

  const fileInputRef = useRef(null);
  const [isUploadingHelper, setIsUploadingHelper] = useState(false);

  // Queries & Mutations
  const { data: helpersData, refetch: refetchHelpers } = useQuery(problemHelpersQueryOptions(problemId));
  const helperFiles = helpersData?.files || grading.helperFiles || [];

  const updateGradingMutation = useMutation(updateProblemGradingMutationOptions(problemId));
  const uploadHelperMutation = useMutation(uploadProblemHelperMutationOptions(problemId));
  const deleteHelperMutation = useMutation(deleteProblemHelperMutationOptions(problemId));

  const isInteractive = engine.includes('Interactive');
  const hasSubtasks = engine.includes('WithSubtasks');
  const supportsCustomScorer = !engine.includes('OutputOnly');

  const toggleLanguage = langId => {
    setAllowedLanguages(prev =>
      prev.includes(langId) ? prev.filter(l => l !== langId) : [...prev, langId]
    );
  };

  const handleSubtaskPointChange = (index, value) => {
    const val = parseInt(value, 10);
    setSubtaskPoints(prev => {
      const next = [...prev];
      next[index] = isNaN(val) ? 0 : val;
      return next;
    });
  };

  const addSubtask = () => {
    setSubtaskPoints(prev => [...prev, 0]);
  };

  const removeSubtask = index => {
    if (subtaskPoints.length <= 1) return;
    setSubtaskPoints(prev => prev.filter((_, i) => i !== index));
  };

  const totalPoints = subtaskPoints.reduce((acc, p) => acc + (parseInt(p, 10) || 0), 0);

  const handleHelperUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingHelper(true);
    uploadHelperMutation.mutate(formData, {
      onSuccess: () => {
        showSuccessToast(`Helper file "${file.name}" uploaded successfully.`);
        setIsUploadingHelper(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        refetchHelpers();
        // Auto-select if appropriate
        if (file.name.toLowerCase().includes('communicator')) {
          setCommunicator(file.name);
        } else if (file.name.toLowerCase().includes('scorer') || file.name.toLowerCase().includes('checker')) {
          setCustomScorer(file.name);
        }
      },
      onError: err => {
        showErrorToast(err?.response?.data?.message || 'Failed to upload helper file.');
        setIsUploadingHelper(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };

  const handleDeleteHelper = filename => {
    if (!window.confirm(`Delete helper file "${filename}"?`)) return;

    deleteHelperMutation.mutate(filename, {
      onSuccess: () => {
        showSuccessToast(`Deleted helper file "${filename}".`);
        if (customScorer === filename) setCustomScorer('(none)');
        if (communicator === filename) setCommunicator('(none)');
        refetchHelpers();
      },
      onError: err => {
        showErrorToast(err?.response?.data?.message || 'Failed to delete helper file.');
      },
    });
  };

  const handleSave = e => {
    e.preventDefault();
    updateGradingMutation.mutate(
      {
        engine,
        timeLimit: parseInt(timeLimit, 10),
        memoryLimit: parseInt(memoryLimit, 10),
        isAllowedAll,
        allowedLanguages: isAllowedAll ? [] : allowedLanguages,
        customScorer: supportsCustomScorer ? customScorer : '(none)',
        communicator: isInteractive ? communicator : '(none)',
        subtaskPoints: hasSubtasks ? subtaskPoints : [],
      },
      {
        onSuccess: () => {
          showSuccessToast('Grading configuration and limits saved.');
          queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
        },
        onError: err => {
          showErrorToast(err?.response?.data?.message || err);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 850, marginTop: 16 }}>
      {/* 1. GRADING ENGINE SELECTOR */}
      <Card style={{ marginBottom: 20 }}>
        <h4 style={{ marginTop: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Grading Engine</span>
          <Tag intent={Intent.PRIMARY} minimal round>
            {engine}
          </Tag>
        </h4>
        <p style={{ color: textColor, fontSize: 13, marginBottom: 16 }}>
          Pilih mekanisme penilaian yang sesuai untuk soal ini. Setiap tipe engine mengaktifkan fitur khusus seperti program komunikator, custom scorer (checker), atau penilaian parsial (subtasks).
        </p>

        <FormGroup label="Tipe Engine" labelFor="grading-engine">
          <HTMLSelect
            id="grading-engine"
            fill
            large
            value={engine}
            onChange={e => setEngine(e.target.value)}
            disabled={!problem.canEdit}
          >
            {Object.entries(ENGINE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </HTMLSelect>
        </FormGroup>

        {/* Engine Description Callout */}
        {isInteractive && (
          <Callout intent={Intent.PRIMARY} icon={<InfoSign />} style={{ marginTop: 12 }}>
            <strong>Mode Interaktif:</strong> Solusi peserta akan berinteraksi langsung secara real-time dengan program <em>Communicator</em> melalui standard I/O (stdin/stdout). Pastikan Anda telah mengunggah file komunikator (misal <code>communicator.cpp</code>) di bagian Berkas Pembantu di bawah.
          </Callout>
        )}
        {hasSubtasks && (
          <Callout intent={Intent.WARNING} icon={<InfoSign />} style={{ marginTop: 12 }}>
            <strong>Penilaian Subtask & Parsial:</strong> Nilai diberikan per subtask. Peserta mendapatkan skor parsial jika berhasil menyelesaikan seluruh test case dalam subtask tertentu.
          </Callout>
        )}
      </Card>

      {/* 2. INTERACTIVE COMMUNICATOR CONFIGURATION (Shown when interactive) */}
      {isInteractive && (
        <Card style={{ marginBottom: 20, borderLeft: '4px solid #106ba3' }}>
          <h4 style={{ marginTop: 0, marginBottom: 8 }}>
            Program Komunikator (Communicator)
          </h4>
          <p style={{ color: textColor, fontSize: 13 }}>
            Pilih file kode sumber komunikator yang telah diunggah di Berkas Pembantu. Komunikator akan dikompilasi oleh grader dan dieksekusi bersamaan dengan solusi peserta.
          </p>

          <FormGroup label="File Komunikator" labelFor="communicator-select">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <HTMLSelect
                id="communicator-select"
                value={communicator}
                onChange={e => setCommunicator(e.target.value)}
                disabled={!problem.canEdit}
                style={{ minWidth: 260 }}
              >
                <option value="(none)">(none) - Belum dipilih</option>
                {helperFiles.map(f => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({(f.size / 1024).toFixed(1)} KB)
                  </option>
                ))}
              </HTMLSelect>

              <Button
                icon={<Upload />}
                text="Unggah Komunikator Baru"
                onClick={() => fileInputRef.current?.click()}
                disabled={!problem.canEdit}
              />
            </div>
          </FormGroup>

          {communicator === '(none)' && (
            <Callout intent={Intent.DANGER} style={{ marginTop: 8 }}>
              Peringatan: Mode interaktif membutuhkan file Communicator. Silakan unggah dan pilih file komunikator di atas agar grader dapat menilai solusi peserta.
            </Callout>
          )}
        </Card>
      )}

      {/* 3. CUSTOM SCORER / CHECKER (Shown when supported) */}
      {supportsCustomScorer && (
        <Card style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 8 }}>
            Custom Scorer / Checker (Opsional)
          </h4>
          <p style={{ color: textColor, fontSize: 13 }}>
            Digunakan apabila pengecekan jawaban tidak bisa dilakukan secara perbandingan teks standar (misalnya jawaban berupa floating point dengan toleransi 10<sup>-6</sup>, atau problem dengan banyak kemungkinan jawaban benar).
          </p>

          <FormGroup label="File Custom Scorer" labelFor="scorer-select">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <HTMLSelect
                id="scorer-select"
                value={customScorer}
                onChange={e => setCustomScorer(e.target.value)}
                disabled={!problem.canEdit}
                style={{ minWidth: 260 }}
              >
                <option value="(none)">(none) - Perbandingan standar per token / baris</option>
                {helperFiles.map(f => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({(f.size / 1024).toFixed(1)} KB)
                  </option>
                ))}
              </HTMLSelect>

              <Button
                icon={<Upload />}
                text="Unggah Scorer Baru"
                onClick={() => fileInputRef.current?.click()}
                disabled={!problem.canEdit}
              />
            </div>
          </FormGroup>
        </Card>
      )}

      {/* 4. SUBTASKS & PARTIAL POINTS (Shown when WithSubtasks) */}
      {hasSubtasks && (
        <Card style={{ marginBottom: 20, borderLeft: '4px solid #d9822b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ margin: 0 }}>Subtasks & Skor Parsial</h4>
              <p style={{ color: textColor, fontSize: 13, margin: '4px 0 0' }}>
                Tentukan alokasi nilai untuk masing-masing subtask. Total nilai maksimum biasanya 100 poin.
              </p>
            </div>
            <Tag intent={totalPoints === 100 ? Intent.SUCCESS : Intent.WARNING} large round>
              Total Skor: {totalPoints} Poin
            </Tag>
          </div>

          <HTMLTable striped compact style={{ width: '100%', marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={{ width: 100 }}>Subtask</th>
                <th>Alokasi Poin (Skor)</th>
                <th style={{ width: 80, textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {subtaskPoints.map((points, idx) => (
                <tr key={idx}>
                  <td style={{ verticalAlign: 'middle', fontWeight: 600 }}>
                    Subtask {idx + 1}
                  </td>
                  <td>
                    <InputGroup
                      type="number"
                      min={0}
                      max={100}
                      value={points}
                      onChange={e => handleSubtaskPointChange(idx, e.target.value)}
                      disabled={!problem.canEdit}
                      style={{ maxWidth: 160 }}
                    />
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                    <Button
                      minimal
                      intent={Intent.DANGER}
                      icon={<Cross />}
                      disabled={subtaskPoints.length <= 1 || !problem.canEdit}
                      onClick={() => removeSubtask(idx)}
                      title="Hapus Subtask"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>

          {problem.canEdit && (
            <Button
              small
              icon={<Plus />}
              text="Tambah Subtask"
              onClick={addSubtask}
            />
          )}
        </Card>
      )}

      {/* 5. HELPER FILES MANAGER (Communicator, Scorer, Headers, Zip) */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <div>
            <h4 style={{ margin: 0 }}>Berkas Pembantu (Helper Files)</h4>
            <p style={{ color: textColor, fontSize: 13, margin: '4px 0 0' }}>
              Unggah file pendukung grading seperti <code>communicator.cpp</code>, <code>scorer.cpp</code>, <code>checker.cpp</code>, berkas header (<code>.h</code>), atau arsip <code>.zip</code>.
            </p>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleHelperUpload}
            />
            <Button
              intent={Intent.PRIMARY}
              icon={<CloudUpload />}
              text="Upload Berkas Pembantu"
              loading={isUploadingHelper}
              disabled={!problem.canEdit}
              onClick={() => fileInputRef.current?.click()}
            />
          </div>
        </div>

        {helperFiles.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: isDarkMode ? '#8a9ba8' : '#5c7080',
              border: `1px dashed ${isDarkMode ? '#383e47' : '#d3dce3'}`,
              borderRadius: 4,
            }}
          >
            Belum ada berkas pembantu yang diunggah. Klik <strong>Upload Berkas Pembantu</strong> untuk mengunggah komunikator atau scorer.
          </div>
        ) : (
          <HTMLTable striped style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Nama Berkas</th>
                <th>Ukuran</th>
                <th>Status Penggunaan</th>
                <th style={{ width: 80, textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {helperFiles.map(file => {
                const isComm = communicator === file.name;
                const isScorer = customScorer === file.name;
                return (
                  <tr key={file.name}>
                    <td style={{ verticalAlign: 'middle', fontWeight: 500 }}>
                      <code>{file.name}</code>
                    </td>
                    <td style={{ verticalAlign: 'middle', color: textColor }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      {isComm && (
                        <Tag intent={Intent.PRIMARY} round style={{ marginRight: 6 }}>
                          Communicator Aktif
                        </Tag>
                      )}
                      {isScorer && (
                        <Tag intent={Intent.SUCCESS} round>
                          Scorer Aktif
                        </Tag>
                      )}
                      {!isComm && !isScorer && (
                        <span style={{ color: '#8a9ba8' }}>Tidak aktif</span>
                      )}
                    </td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                      <Button
                        minimal
                        intent={Intent.DANGER}
                        icon={<Trash />}
                        disabled={!problem.canEdit}
                        onClick={() => handleDeleteHelper(file.name)}
                        title="Hapus berkas"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </HTMLTable>
        )}
      </Card>

      {/* 6. TIME & MEMORY LIMITS */}
      <Card style={{ marginBottom: 20 }}>
        <h4 style={{ marginTop: 0, marginBottom: 12 }}>Batas Waktu & Memori (Limits)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormGroup
            label="Batas Waktu (Time Limit dalam milidetik)"
            labelFor="timeLimit"
            helperText={`Contoh: 1000 ms = 1.0 detik, 2000 ms = 2.0 detik. Saat ini: ${(timeLimit / 1000).toFixed(1)}s`}
          >
            <InputGroup
              id="timeLimit"
              type="number"
              min={100}
              max={30000}
              step={100}
              value={timeLimit}
              onChange={e => setTimeLimit(e.target.value)}
              disabled={!problem.canEdit}
              required
            />
          </FormGroup>

          <FormGroup
            label="Batas Memori (Memory Limit dalam Megabytes)"
            labelFor="memoryLimit"
            helperText="Standar competitive programming adalah 256 MB atau 512 MB."
          >
            <InputGroup
              id="memoryLimit"
              type="number"
              min={16}
              max={2048}
              step={16}
              value={memoryLimit}
              onChange={e => setMemoryLimit(e.target.value)}
              disabled={!problem.canEdit}
              required
            />
          </FormGroup>
        </div>
      </Card>

      {/* 7. LANGUAGE RESTRICTIONS */}
      <Card style={{ marginBottom: 24, padding: 16 }}>
        <h4 style={{ marginTop: 0, marginBottom: 12 }}>Pembatasan Bahasa Pemrograman</h4>
        <RadioGroup
          selectedValue={isAllowedAll ? 'all' : 'restricted'}
          onChange={e => setIsAllowedAll(e.target.value === 'all')}
          disabled={!problem.canEdit}
        >
          <Radio label="Izinkan semua bahasa pemrograman yang didukung Judgels" value="all" />
          <Radio label="Batasi hanya bahasa pemrograman tertentu saja" value="restricted" />
        </RadioGroup>

        {!isAllowedAll && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 8,
              marginTop: 12,
              padding: 12,
              border: `1px solid ${isDarkMode ? '#383e47' : '#d3dce3'}`,
              borderRadius: 4,
              backgroundColor: isDarkMode ? '#252a31' : '#fafbfc',
            }}
          >
            {ALL_LANGUAGES.map(lang => (
              <Checkbox
                key={lang.id}
                label={lang.label}
                checked={allowedLanguages.includes(lang.id)}
                onChange={() => toggleLanguage(lang.id)}
                disabled={!problem.canEdit}
              />
            ))}
          </div>
        )}
      </Card>

      {/* SUBMIT BUTTON */}
      {problem.canEdit && (
        <Button
          type="submit"
          intent={Intent.PRIMARY}
          large
          icon={<FloppyDisk />}
          text="Simpan Konfigurasi & Batasan Grading"
          loading={updateGradingMutation.isPending}
          style={{ maxWidth: '100%', whiteSpace: 'normal', height: 'auto', padding: '10px 16px' }}
        />
      )}
    </form>
  );
}
