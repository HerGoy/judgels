import { Button, Callout, Card, FormGroup, HTMLSelect, HTMLTable, InputGroup, Intent, Tag } from '@blueprintjs/core';
import { InfoSign, People, Plus, Trash } from '@blueprintjs/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  addProblemPartnerMutationOptions,
  deleteProblemPartnerMutationOptions,
  problemPartnersQueryOptions,
} from '../../../../modules/queries/problem';

import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';

export default function ProblemPartnersTab({ problem, problemId }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [permission, setPermission] = useState('UPDATE');

  const { data: response, isLoading } = useQuery(problemPartnersQueryOptions(problemId));
  const partners = response?.partners || [];

  const addPartnerMutation = useMutation(addProblemPartnerMutationOptions(problemId));
  const deletePartnerMutation = useMutation(deleteProblemPartnerMutationOptions(problemId));

  const handleAddPartner = e => {
    e.preventDefault();
    if (!username.trim()) return;

    addPartnerMutation.mutate(
      {
        username: username.trim(),
        permission,
      },
      {
        onSuccess: () => {
          showSuccessToast(`Partner @${username.trim()} berhasil ditambahkan.`);
          setUsername('');
          queryClient.invalidateQueries({ queryKey: ['problem-partners', String(problemId)] });
        },
        onError: err => {
          showErrorToast(err?.response?.data?.message || err);
        },
      }
    );
  };

  const handleDeletePartner = partnerUsername => {
    if (!window.confirm(`Hapus partner @${partnerUsername} dari soal ini?`)) return;

    deletePartnerMutation.mutate(partnerUsername, {
      onSuccess: () => {
        showSuccessToast(`Partner @${partnerUsername} berhasil dihapus.`);
        queryClient.invalidateQueries({ queryKey: ['problem-partners', String(problemId)] });
      },
      onError: err => {
        showErrorToast(err?.response?.data?.message || err);
      },
    });
  };

  return (
    <div style={{ maxWidth: 850, marginTop: 16 }}>
      <Callout intent={Intent.PRIMARY} icon={<People />} style={{ marginBottom: 20 }}>
        <strong>Kolaborasi Pembuatan Soal (Partners):</strong> Partner adalah rekan penulis atau pengembang soal yang
        diberikan hak akses langsung ke draft soal ini sebelum dipublikasikan.
        <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
          <li>
            <strong>UPDATE:</strong> Dapat melihat, mengedit deskripsi soal, mengunggah data uji, dan mengubah
            konfigurasi grading.
          </li>
          <li>
            <strong>VIEW:</strong> Hanya dapat melihat soal dan data uji tanpa izin mengubah.
          </li>
        </ul>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>
            <em>
              Partner yang ditambahkan dapat langsung mengelola soal ini melalui menu profil (
              <strong>Manage problems</strong>) atau tombol <strong>Edit problem</strong> pada halaman soal.
            </em>
          </span>
          <Button
            small
            minimal
            icon="clipboard"
            text="Salin Tautan Soal"
            onClick={() => {
              const url = `${window.location.origin}/admin/problems/${problem.id || problemId}`;
              navigator.clipboard?.writeText(url);
              showSuccessToast('Tautan soal berhasil disalin ke clipboard.');
            }}
          />
        </div>
      </Callout>

      {/* ADD PARTNER FORM */}
      {problem.canEdit && (
        <Card style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 12 }}>Tambah Partner Baru</h4>
          <form
            onSubmit={handleAddPartner}
            style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}
          >
            <FormGroup
              label="Username Pengguna"
              labelFor="partner-username"
              style={{ marginBottom: 0, flex: 1, minWidth: 200 }}
            >
              <InputGroup
                id="partner-username"
                placeholder="Masukkan username (contoh: budi)"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </FormGroup>

            <FormGroup
              label="Hak Akses (Permission)"
              labelFor="partner-perm"
              style={{ marginBottom: 0, minWidth: 160 }}
            >
              <HTMLSelect id="partner-perm" value={permission} onChange={e => setPermission(e.target.value)}>
                <option value="UPDATE">UPDATE (Dapat Mengedit)</option>
                <option value="VIEW">VIEW (Hanya Melihat)</option>
              </HTMLSelect>
            </FormGroup>

            <Button
              type="submit"
              intent={Intent.PRIMARY}
              icon={<Plus />}
              text="Tambah Partner"
              loading={addPartnerMutation.isPending}
            />
          </form>
        </Card>
      )}

      {/* PARTNERS LIST TABLE */}
      <Card>
        <h4 style={{ marginTop: 0, marginBottom: 12 }}>Daftar Partner Terdaftar</h4>
        {partners.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: '#8a9ba8',
              border: '1px dashed #d3dce3',
              borderRadius: 4,
            }}
          >
            Belum ada partner yang ditambahkan untuk soal ini.
          </div>
        ) : (
          <HTMLTable striped style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Hak Akses</th>
                <th style={{ width: 80, textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {partners.map(p => (
                <tr key={p.username}>
                  <td style={{ verticalAlign: 'middle', fontWeight: 600 }}>@{p.username}</td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Tag intent={p.permission === 'UPDATE' ? Intent.SUCCESS : Intent.NONE} round minimal>
                      {p.permission === 'UPDATE' ? 'Dapat Mengedit (UPDATE)' : 'Hanya Melihat (VIEW)'}
                    </Tag>
                  </td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                    <Button
                      minimal
                      intent={Intent.DANGER}
                      icon={<Trash />}
                      disabled={!problem.canEdit}
                      onClick={() => handleDeletePartner(p.username)}
                      title="Hapus partner"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </HTMLTable>
        )}
      </Card>
    </div>
  );
}
