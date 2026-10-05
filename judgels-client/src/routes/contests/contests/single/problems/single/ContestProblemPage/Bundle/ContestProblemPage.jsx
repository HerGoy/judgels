import { Button, Intent } from '@blueprintjs/core';
import { Edit } from '@blueprintjs/icons';
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect } from 'react';

import { ContentCard } from '../../../../../../../../components/ContentCard/ContentCard';
import StatementLanguageWidget from '../../../../../../../../components/LanguageWidget/StatementLanguageWidget';
import { LoadingState } from '../../../../../../../../components/LoadingState/LoadingState';
import { ProblemWorksheetCard } from '../../../../../../../../components/ProblemWorksheetCard/Bundle/ProblemWorksheetCard';
import { contestBySlugQueryOptions } from '../../../../../../../../modules/queries/contest';
import { contestBundleProblemWorksheetQueryOptions } from '../../../../../../../../modules/queries/contestProblem';
import {
  contestBundleLatestSubmissionsQueryOptions,
  createBundleItemSubmissionMutationOptions,
} from '../../../../../../../../modules/queries/contestSubmissionBundle';
import { problemDetailQueryOptions } from '../../../../../../../../modules/queries/problem';
import { useSession } from '../../../../../../../../modules/session';
import { useWebPrefs } from '../../../../../../../../modules/webPrefs';
import { createDocumentTitle } from '../../../../../../../../utils/title';

export default function ContestProblemPage() {
  const { contestSlug, problemAlias } = useParams({ strict: false });
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: contest } = useSuspenseQuery(contestBySlugQueryOptions(contestSlug));
  const { statementLanguage } = useWebPrefs();

  const { data: response } = useQuery(
    contestBundleProblemWorksheetQueryOptions(contest.jid, problemAlias, { language: statementLanguage })
  );

  const problemJid = response?.problem?.problemJid;
  const { data: problemDetail } = useQuery({
    ...problemDetailQueryOptions(problemJid),
    enabled: !!user && !!problemJid,
    retry: false,
    staleTime: 60 * 1000,
  });

  const { data: latestSubmissions } = useQuery({
    ...contestBundleLatestSubmissionsQueryOptions(contest.jid, response?.problem?.alias),
    enabled: !!response,
  });

  const createSubmissionMutation = useMutation(createBundleItemSubmissionMutationOptions(contest.jid, problemAlias));

  useEffect(() => {
    if (response) {
      document.title = createDocumentTitle(`Problem ${response.problem.alias}`);
    }
  }, [response?.problem?.alias]);

  const onCreateSubmission = (itemJid, answer) => {
    createSubmissionMutation.mutate({
      problemJid: response.problem.problemJid,
      itemJid,
      answer,
    });
  };

  const renderStatementLanguageWidget = () => {
    if (!response) {
      return null;
    }
    return (
      <div
        className="language-widget-wrapper"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <StatementLanguageWidget defaultLanguage={response.defaultLanguage} statementLanguages={response.languages} />
        {problemDetail && (
          <Button
            small
            intent={problemDetail.canEdit ? Intent.PRIMARY : Intent.NONE}
            icon={<Edit />}
            text={problemDetail.canEdit ? 'Edit problem' : 'View in manager'}
            onClick={() => navigate({ to: `/admin/problems/${problemDetail.id || problemJid}` })}
          />
        )}
      </div>
    );
  };

  const renderStatement = () => {
    if (!response) {
      return <LoadingState />;
    }

    if (!latestSubmissions) {
      return <LoadingState />;
    }

    return (
      <ProblemWorksheetCard
        alias={response.problem.alias}
        latestSubmissions={latestSubmissions}
        onAnswerItem={onCreateSubmission}
        worksheet={response.worksheet}
      />
    );
  };

  return (
    <ContentCard>
      {renderStatementLanguageWidget()}
      {renderStatement()}
    </ContentCard>
  );
}
