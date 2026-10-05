import { HTMLTable } from '@blueprintjs/core';
import { Refresh, Search } from '@blueprintjs/icons';
import { Link } from '@tanstack/react-router';

import { FormattedRelative } from '../../../../../../../../components/FormattedRelative/FormattedRelative';
import { GradingVerdictTag } from '../../../../../../../../components/GradingVerdictTag/GradingVerdictTag';
import { UserRef } from '../../../../../../../../components/UserRef/UserRef';
import { getGradingLanguageName } from '../../../../../../../../modules/api/gradingLanguage.js';

import '../../../../../../../../components/SubmissionsTable/Programming/SubmissionsTable.scss';

export function ProblemSubmissionsTable({ problemSet, problem, submissions, canManage, profilesMap, onRegrade }) {
  const renderHeader = () => {
    return (
      <thead>
        <tr>
          <th className="col-fit">ID</th>
          <th>User</th>
          <th className="col-fit">Lang</th>
          <th className="col-fit">Verdict</th>
          <th>Time</th>
          <th className="col-fit" />
        </tr>
      </thead>
    );
  };

  const renderRows = () => {
    const rows = submissions.map(submission => (
      <tr key={submission.jid}>
        <td className="col-fit">
          <span className="id-cell">
            <span>{submission.id}</span>
            {canManage && (
              <Refresh
                className="action"
                intent="primary"
                title="Regrade submission"
                onClick={onClickRegrade(submission.jid)}
              />
            )}
          </span>
        </td>
        <td>
          <UserRef profile={profilesMap[submission.userJid]} />
        </td>

        <td className="col-fit">{getGradingLanguageName(submission.gradingLanguage)}</td>
        <td className="col-fit">
          {submission.latestGrading && <GradingVerdictTag wide grading={submission.latestGrading} />}
        </td>
        <td>
          <FormattedRelative value={submission.time} />
        </td>
        <td className="col-fit cell-centered">
          <Link
            className="action"
            to={`/problems/${problemSet.slug}/${problem.alias}/submissions/${submission.id}`}
            title="View submission"
          >
            <Search title="View submission" />
          </Link>
        </td>
      </tr>
    ));

    return <tbody>{rows}</tbody>;
  };

  const onClickRegrade = submissionJid => {
    return () => onRegrade(submissionJid);
  };

  return (
    <HTMLTable striped className="table-list-condensed submissions-table">
      {renderHeader()}
      {renderRows()}
    </HTMLTable>
  );
}
