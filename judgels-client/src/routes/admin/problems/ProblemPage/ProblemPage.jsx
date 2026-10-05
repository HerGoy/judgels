import { Alert, AnchorButton, Button, Callout, Intent, Tab, Tabs, Tag } from '@blueprintjs/core';
import {
  ChevronLeft,
  CloudUpload,
  Code,
  Database,
  Document,
  History,
  InfoSign,
  List,
  People,
  Play,
  Refresh,
  Reset,
  Settings,
} from '@blueprintjs/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { ActionButtons } from '../../../../components/ActionButtons/ActionButtons';
import { ContentCard } from '../../../../components/ContentCard/ContentCard';
import { LoadingState } from '../../../../components/LoadingState/LoadingState';
import {
  commitProblemChangesMutationOptions,
  discardProblemChangesMutationOptions,
  problemDetailQueryOptions,
} from '../../../../modules/queries/problem';
import ProblemBundleItemsTab from './ProblemBundleItemsTab';
import ProblemGeneralTab from './ProblemGeneralTab';
import ProblemGradingTab from './ProblemGradingTab';
import ProblemPartnersTab from './ProblemPartnersTab';
import ProblemStatementTab from './ProblemStatementTab';
import ProblemSubmissionsTab from './ProblemSubmissionsTab';
import ProblemTestDataTab from './ProblemTestDataTab';

import { showErrorToast, showSuccessToast } from '../../../../modules/toast/toastActions';

import './ProblemPage.scss';

export default function ProblemPage() {
  const { problemId } = useParams({ strict: false });
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const searchTab = location.search?.tab;
  const [activeTab, setActiveTab] = useState(searchTab || 'statement');
  const [isDiscardAlertOpen, setIsDiscardAlertOpen] = useState(false);

  useEffect(() => {
    if (searchTab && searchTab !== activeTab) {
      setActiveTab(searchTab);
    }
  }, [searchTab]);

  const handleTabChange = newTabId => {
    setActiveTab(newTabId);
    navigate({
      search: prev => ({ ...prev, tab: newTabId }),
      replace: true,
    });
  };

  const { data: problem, isLoading, error } = useQuery(problemDetailQueryOptions(problemId));

  const commitMutation = useMutation(commitProblemChangesMutationOptions(problemId));
  const discardMutation = useMutation(discardProblemChangesMutationOptions(problemId));

  const handlePublish = () => {
    commitMutation.mutate(
      { message: 'Publish updates from panel' },
      {
        onSuccess: () => {
          showSuccessToast('All changes published successfully to production!');
          queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
        },
        onError: err => {
          showErrorToast(err);
        },
      }
    );
  };

  const handleDiscard = () => {
    discardMutation.mutate(null, {
      onSuccess: () => {
        showSuccessToast('Draft changes discarded. Reverted to production.');
        setIsDiscardAlertOpen(false);
        queryClient.invalidateQueries({ queryKey: ['problem-detail', String(problemId)] });
      },
      onError: err => {
        showErrorToast(err);
        setIsDiscardAlertOpen(false);
      },
    });
  };

  const isBundle = problem?.type === 'BUNDLE';

  const renderHeaderActions = () => (
    <ActionButtons>
      <Button
        minimal
        icon={<ChevronLeft />}
        text="Back to Problems"
        onClick={() => navigate({ to: '/admin/problems' })}
      />
      {problem?.canEdit && problem?.hasLocalChanges && (
        <>
          <Button
            intent={Intent.PRIMARY}
            icon={<CloudUpload />}
            text="Publish to Production"
            loading={commitMutation.isPending}
            onClick={handlePublish}
          />
          <Button
            minimal
            intent={Intent.DANGER}
            icon={<Reset />}
            text="Discard Draft"
            loading={discardMutation.isPending}
            onClick={() => setIsDiscardAlertOpen(true)}
          />
        </>
      )}
    </ActionButtons>
  );

  if (isLoading) {
    return (
      <ContentCard title="Problem Management">
        {renderHeaderActions()}
        <LoadingState />
      </ContentCard>
    );
  }

  if (error || !problem) {
    return (
      <ContentCard title="Problem Management">
        {renderHeaderActions()}
        <Callout intent={Intent.DANGER} title="Problem Not Found" style={{ marginTop: 16 }}>
          Could not load problem #{problemId}. Please check the ID or your permissions.
        </Callout>
      </ContentCard>
    );
  }

  return (
    <ContentCard
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>Problem: {problem.slug}</span>
          <Tag intent={isBundle ? Intent.WARNING : Intent.PRIMARY} round minimal>
            {problem.type}
          </Tag>
          {problem.hasLocalChanges ? (
            <Tag intent={Intent.WARNING} round>
              Draft Changes (Unpublished)
            </Tag>
          ) : (
            <Tag intent={Intent.SUCCESS} round minimal>
              Published (Production)
            </Tag>
          )}
        </div>
      }
    >
      {renderHeaderActions()}

      {/* Local changes notice banner */}
      {problem.hasLocalChanges && (
        <Callout intent={Intent.WARNING} icon={<InfoSign />} style={{ marginTop: 16, marginBottom: 16 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
          >
            <div>
              You have unpublished draft changes in your local clone. Click <strong>Publish to Production</strong> to
              make your updates live for contests and users.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                small
                intent={Intent.PRIMARY}
                icon={<CloudUpload />}
                text="Publish Now"
                loading={commitMutation.isPending}
                onClick={handlePublish}
              />
              <Button
                small
                minimal
                intent={Intent.DANGER}
                text="Discard Changes"
                onClick={() => setIsDiscardAlertOpen(true)}
              />
            </div>
          </div>
        </Callout>
      )}

      {/* Tabs navigation */}
      <div className="problem-page-tabs">
        <Tabs id="problem-management-tabs" selectedTabId={activeTab} onChange={handleTabChange}>
          <Tab
            id="statement"
            title={
              <span>
                <Document style={{ marginRight: 6 }} /> Statement (Soal)
              </span>
            }
            panel={<ProblemStatementTab problem={problem} problemId={problemId} />}
          />

          {isBundle && (
            <Tab
              id="bundle-items"
              title={
                <span>
                  <List style={{ marginRight: 6 }} /> Items & Answer Keys (Soal & Kunci)
                </span>
              }
              panel={<ProblemBundleItemsTab problem={problem} problemId={problemId} />}
            />
          )}

          {!isBundle && (
            <Tab
              id="grading"
              title={
                <span>
                  <Settings style={{ marginRight: 6 }} /> Limits & Grading
                </span>
              }
              panel={<ProblemGradingTab problem={problem} problemId={problemId} />}
            />
          )}

          {!isBundle && (
            <Tab
              id="testdata"
              title={
                <span>
                  <Database style={{ marginRight: 6 }} /> Testcases (Data Uji)
                </span>
              }
              panel={<ProblemTestDataTab problem={problem} problemId={problemId} />}
            />
          )}

          {!isBundle && (
            <Tab
              id="submissions"
              title={
                <span>
                  <Play style={{ marginRight: 6 }} /> Test Submissions
                </span>
              }
              panel={<ProblemSubmissionsTab problem={problem} problemId={problemId} />}
            />
          )}

          <Tab
            id="partners"
            title={
              <span>
                <People style={{ marginRight: 6 }} /> Partners (Kolaborator)
              </span>
            }
            panel={<ProblemPartnersTab problem={problem} problemId={problemId} />}
          />

          <Tab
            id="overview"
            title={
              <span>
                <InfoSign style={{ marginRight: 6 }} /> General Info & Roles
              </span>
            }
            panel={<ProblemGeneralTab problem={problem} problemId={problemId} />}
          />
        </Tabs>
      </div>

      {/* Discard confirmation alert */}
      <Alert
        isOpen={isDiscardAlertOpen}
        onCancel={() => setIsDiscardAlertOpen(false)}
        onConfirm={handleDiscard}
        cancelButtonText="Cancel"
        confirmButtonText="Yes, Discard All Changes"
        intent={Intent.DANGER}
        icon={<Reset />}
      >
        <p>
          Are you sure you want to discard your draft changes? Any edits to statements, limits, or testcases that
          haven't been published will be permanently reverted to the production version.
        </p>
      </Alert>
    </ContentCard>
  );
}
