import { Button, Card, FormGroup, InputGroup, Intent } from '@blueprintjs/core';
import { CloudUpload, Edit, Refresh, Reset } from '@blueprintjs/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import defaultLogo from '../../../../assets/images/logo-header.png';
import { ContentCard } from '../../../../components/ContentCard/ContentCard';
import { updateSettingsMutationOptions } from '../../../../modules/queries/setting';
import { userWebConfigQueryOptions } from '../../../../modules/queries/userWeb';
import { getSiteLogo } from '../../../../modules/webConfig';

import * as toastActions from '../../../../modules/toast/toastActions';

export function SiteLogoSection({ home = { banner: '' } }) {
  const queryClient = useQueryClient();
  const updateSettingsMutation = useMutation(updateSettingsMutationOptions());

  const currentLogo = getSiteLogo();
  const [logoInput, setLogoInput] = useState(currentLogo || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    const rawBanner = home.banner || '';
    const cleanBanner = rawBanner.replace(/<!--\s*site_logo:\s*[^\s>]+\s*-->\s*/g, '').trim();

    let newBanner = cleanBanner;
    if (logoInput && logoInput.trim()) {
      newBanner = `<!-- site_logo: ${logoInput.trim()} -->\n${cleanBanner}`;
      localStorage.setItem('judgels_site_logo', logoInput.trim());
    } else {
      localStorage.removeItem('judgels_site_logo');
    }

    updateSettingsMutation.mutate(
      { home: { banner: newBanner } },
      {
        onSuccess: () => {
          toastActions.showSuccessToast('Site logo updated successfully.');
          queryClient.invalidateQueries(userWebConfigQueryOptions());
          setIsEditing(false);
        },
        onError: err => {
          toastActions.showErrorToast(err?.message || 'Failed to update logo.');
        },
      }
    );
  };

  const handleResetToDefault = () => {
    setLogoInput('');
    const rawBanner = home.banner || '';
    const cleanBanner = rawBanner.replace(/<!--\s*site_logo:\s*[^\s>]+\s*-->\s*/g, '').trim();
    localStorage.removeItem('judgels_site_logo');

    updateSettingsMutation.mutate(
      { home: { banner: cleanBanner } },
      {
        onSuccess: () => {
          toastActions.showSuccessToast('Logo reset to default TLX logo.');
          queryClient.invalidateQueries(userWebConfigQueryOptions());
          setIsEditing(false);
        },
      }
    );
  };

  const handleFileUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toastActions.showErrorToast('Logo image must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = evt => {
      setLogoInput(evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <ContentCard title="Site Logo Settings">
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            border: '1px solid #d3dce3',
            background: '#202b33',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 160,
          }}
        >
          <span style={{ fontSize: 11, color: '#8a9ba8', marginBottom: 8 }}>Preview Logo Header</span>
          <img
            src={logoInput || currentLogo || defaultLogo}
            alt="Site Logo"
            style={{ maxHeight: 42, maxWidth: 160, objectFit: 'contain' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <p style={{ margin: '0 0 10px 0', fontSize: 13, color: '#5c7080' }}>
            Ubah logo website yang tampil pada pojok kiri atas bilah navigasi header. Anda dapat memasukkan URL gambar
            atau mengunggah file logo baru.
          </p>

          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <FormGroup
                label="Logo Image URL"
                helperText="Masukkan tautan gambar langsung (PNG, SVG, atau JPG) atau upload file"
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <InputGroup
                    fill
                    value={logoInput}
                    onChange={e => setLogoInput(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  <label className="bp5-button bp5-intent-primary bp5-small" style={{ flexShrink: 0 }}>
                    <CloudUpload style={{ marginRight: 6 }} />
                    Upload
                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </FormGroup>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  small
                  intent={Intent.PRIMARY}
                  text="Simpan Logo"
                  loading={updateSettingsMutation.isPending}
                  onClick={handleSave}
                />
                <Button
                  small
                  text="Batal"
                  disabled={updateSettingsMutation.isPending}
                  onClick={() => {
                    setLogoInput(currentLogo || '');
                    setIsEditing(false);
                  }}
                />
                <Button
                  small
                  minimal
                  intent={Intent.DANGER}
                  icon={<Reset />}
                  text="Kembalikan ke Logo Default"
                  loading={updateSettingsMutation.isPending}
                  onClick={handleResetToDefault}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button
                small
                intent={Intent.PRIMARY}
                icon={<Edit />}
                text="Ubah Logo"
                onClick={() => setIsEditing(true)}
              />
              {currentLogo && (
                <Button
                  small
                  minimal
                  intent={Intent.DANGER}
                  icon={<Reset />}
                  text="Reset Default"
                  onClick={handleResetToDefault}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </ContentCard>
  );
}
