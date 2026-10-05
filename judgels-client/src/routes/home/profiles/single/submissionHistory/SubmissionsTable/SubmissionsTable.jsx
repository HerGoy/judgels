import { HTMLTable } from '@blueprintjs/core';
import { Search } from '@blueprintjs/icons';
import { Link } from '@tanstack/react-router';

import { FormattedRelative } from '../../../../../../components/FormattedRelative/FormattedRelative';
import { GradingVerdictTag } from '../../../../../../components/GradingVerdictTag/GradingVerdictTag';
import { getGradingLanguageName } from '../../../../../../modules/api/gradingLanguage.js';
import { constructProblemName } from '../../../../../../modules/api/problem';
import { constructContainerUrl, constructProblemUrl } from '../../../../../../modules/api/submission';

import '../../../../../../components/SubmissionsTable/Programming/SubmissionsTable.scss';

export function SubmissionsTable({
  submissions,
  problemAliasesMap,
  problemNamesMap,
  containerNamesMap,
  containerPathsMap,
}) {
  const renderHeader = () => {
    return (
      <thead>
        <tr>
          <th className="col-fit">ID</th>
          <th>Archive</th>
          <th>Problem</th>
          <th className="col-fit">Lang</th>
          <th className="col-fit">Verdict</th>
          <th>Time</th>
          <th className="col-fit" />
        </tr>
      </thead>
    );
  };

  const renderRows = () => {
    const rows = submissions.map(submission => {
      const containerPath = containerPathsMap[submission.containerJid] || containerPathsMap[submission.problemJid];
      const containerName =
        containerNamesMap[submission.containerJid] || containerNamesMap[submission.problemJid] || '-';
      const problemAlias =
        problemAliasesMap[submission.containerJid + '-' + submission.problemJid] ||
        problemAliasesMap[submission.problemJid];
      const containerUrl = constructContainerUrl(containerPath);
      const problemUrl = constructProblemUrl(containerPath, problemAlias);

      return (
        <tr key={submission.jid}>
          <td className="col-fit">{submission.id}</td>

          <td>{containerUrl ? <Link to={containerUrl}>{containerName}</Link> : <span>{containerName}</span>}</td>
          <td>
            {problemUrl ? (
              <Link to={problemUrl}>
                {constructProblemName(problemNamesMap[submission.problemJid] || '(Deleted Problem)', problemAlias)}
              </Link>
            ) : (
              <span>
                {constructProblemName(problemNamesMap[submission.problemJid] || '(Deleted Problem)', problemAlias)}
              </span>
            )}
          </td>
          <td className="col-fit">{getGradingLanguageName(submission.gradingLanguage)}</td>
          <td className="col-fit">
            {submission.latestGrading && <GradingVerdictTag wide grading={submission.latestGrading} />}
          </td>
          <td>
            <FormattedRelative value={submission.time} />
          </td>
          <td className="col-fit cell-centered">
            <Link className="action" to={`/submissions/${submission.id}`} title="View submission">
              <Search title="View submission" />
            </Link>
          </td>
        </tr>
      );
    });

    return <tbody>{rows}</tbody>;
  };

  return (
    <HTMLTable striped className="table-list-condensed submissions-table">
      {renderHeader()}
      {renderRows()}
    </HTMLTable>
  );
}
