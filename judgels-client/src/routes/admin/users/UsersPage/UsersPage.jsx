import { Alert, Button, ButtonGroup, HTMLTable, InputGroup, Intent, Tag } from '@blueprintjs/core';
import { BanCircle, Search, Tick, Trash } from '@blueprintjs/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import { useState } from 'react';

import { ActionButtons } from '../../../../components/ActionButtons/ActionButtons';
import { ContentCard } from '../../../../components/ContentCard/ContentCard';
import { FormattedDate } from '../../../../components/FormattedDate/FormattedDate';
import { LoadingState } from '../../../../components/LoadingState/LoadingState';
import Pagination from '../../../../components/Pagination/Pagination';
import {
  activateUserMutationOptions,
  deactivateUserMutationOptions,
  deleteUserMutationOptions,
  usersQueryOptions,
} from '../../../../modules/queries/user';
import { userWebConfigQueryOptions } from '../../../../modules/queries/userWeb';
import * as toastActions from '../../../../modules/toast/toastActions';
import { UserUpsertDialog } from '../UserUpsertDialog/UserUpsertDialog';

const PAGE_SIZE = 250;

export default function UsersPage() {
  const location = useLocation();
  const page = +(location.search.page || 1);

  const { data: response } = useQuery(usersQueryOptions({ page }));
  const { data: config } = useQuery(userWebConfigQueryOptions());
  const currentUsername = config?.profile?.username;

  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'PENDING'
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUserJid, setLoadingUserJid] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const activateMutation = useMutation(activateUserMutationOptions());
  const deactivateMutation = useMutation(deactivateUserMutationOptions());
  const deleteMutation = useMutation(deleteUserMutationOptions());

  const handleActivate = async user => {
    setLoadingUserJid(user.jid);
    try {
      await activateMutation.mutateAsync(user.jid);
      toastActions.showSuccessToast(`User ${user.username} has been approved and activated.`);
    } catch (err) {
      toastActions.showErrorToast(`Failed to activate user ${user.username}.`);
    } finally {
      setLoadingUserJid(null);
    }
  };

  const handleDeactivate = async user => {
    if (!window.confirm(`Are you sure you want to deactivate ${user.username}? The user will be logged out and cannot sign in.`)) {
      return;
    }
    setLoadingUserJid(user.jid);
    try {
      await deactivateMutation.mutateAsync(user.jid);
      toastActions.showSuccessToast(`User ${user.username} has been deactivated.`);
    } catch (err) {
      toastActions.showErrorToast(`Failed to deactivate user ${user.username}.`);
    } finally {
      setLoadingUserJid(null);
    }
  };

  const renderAction = () => {
    return (
      <ActionButtons>
        <UserUpsertDialog />
      </ActionButtons>
    );
  };

  const renderUsers = () => {
    if (!response) {
      return <LoadingState />;
    }

    const { data, lastSessionTimesMap, activationStatusesMap = {} } = response;
    if (data.page.length === 0) {
      return (
        <p>
          <small>No users.</small>
        </p>
      );
    }

    const pendingCount = data.page.filter(user => activationStatusesMap[user.jid] === false).length;

    const filteredUsers = data.page.filter(user => {
      const isActivated = activationStatusesMap[user.jid] !== false;
      if (filterMode === 'PENDING' && isActivated) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesUsername = user.username?.toLowerCase().includes(term);
        const matchesEmail = user.email?.toLowerCase().includes(term);
        return matchesUsername || matchesEmail;
      }
      return true;
    });

    const rows = filteredUsers.map(user => {
      const isActivated = activationStatusesMap[user.jid] !== false;
      const isCurrent = user.username === currentUsername;
      const isLoading = loadingUserJid === user.jid;

      return (
        <tr key={user.jid}>
          <td>
            <Link to={`/admin/users/${user.username}`}>{user.username}</Link>
            {isCurrent && (
              <Tag minimal style={{ marginLeft: 6 }}>
                You
              </Tag>
            )}
          </td>
          <td>{user.email}</td>
          <td>
            {isActivated ? (
              <Tag intent={Intent.SUCCESS} round minimal>
                Active
              </Tag>
            ) : (
              <Tag intent={Intent.WARNING} round minimal>
                Pending Approval
              </Tag>
            )}
          </td>
          <td>{lastSessionTimesMap[user.jid] ? <FormattedDate value={lastSessionTimesMap[user.jid]} /> : '-'}</td>
          <td style={{ textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
            {!isActivated ? (
              <Button
                intent={Intent.SUCCESS}
                icon={<Tick />}
                text="Approve"
                small
                loading={isLoading}
                style={{ marginRight: 6 }}
                onClick={() => handleActivate(user)}
              />
            ) : (
              <Button
                intent={Intent.WARNING}
                icon={<BanCircle />}
                text="Deactivate"
                small
                minimal
                loading={isLoading}
                disabled={isCurrent}
                style={{ marginRight: 6 }}
                onClick={() => handleDeactivate(user)}
              />
            )}
            <Button
              intent={Intent.DANGER}
              icon={<Trash />}
              small
              minimal
              disabled={isCurrent}
              onClick={() => setUserToDelete(user)}
              title={isCurrent ? 'You cannot delete yourself' : 'Delete user'}
            />
          </td>
        </tr>
      );
    });

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <ButtonGroup style={{ flexWrap: 'wrap' }}>
            <Button
              active={filterMode === 'ALL'}
              onClick={() => setFilterMode('ALL')}
              text={`All Users (${data.page.length})`}
            />
            <Button
              active={filterMode === 'PENDING'}
              onClick={() => setFilterMode('PENDING')}
              intent={pendingCount > 0 ? Intent.WARNING : Intent.NONE}
              text={`Pending Approval (${pendingCount})`}
            />
          </ButtonGroup>
          <div style={{ width: 240, maxWidth: '100%' }}>
            <InputGroup
              leftIcon="search"
              placeholder="Search username / email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              small
            />
          </div>
        </div>
        {rows.length === 0 ? (
          <p>
            <small>No users matching filter.</small>
          </p>
        ) : (
          <div className="table-responsive">
            <HTMLTable striped className="table-list" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </HTMLTable>
          </div>
        )}
      </>
    );
  };

  return (
    <ContentCard title="Users">
      {renderAction()}
      {renderUsers()}
      {response && <Pagination pageSize={PAGE_SIZE} totalCount={response.data.totalCount} />}

      <Alert
        isOpen={userToDelete !== null}
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        intent={Intent.DANGER}
        icon="trash"
        loading={deleteMutation.isPending}
        onCancel={() => setUserToDelete(null)}
        onConfirm={() => {
          if (userToDelete) {
            deleteMutation.mutate(userToDelete.jid, {
              onSuccess: () => {
                toastActions.showSuccessToast(`User "${userToDelete.username}" deleted successfully.`);
                setUserToDelete(null);
              },
              onError: err => {
                toastActions.showErrorToast(err?.response?.data?.message || err?.message || 'Failed to delete user.');
              },
            });
          }
        }}
      >
        Are you sure you want to delete user <strong>{userToDelete?.username}</strong>? This will remove their account and active sessions.
      </Alert>
    </ContentCard>
  );
}
