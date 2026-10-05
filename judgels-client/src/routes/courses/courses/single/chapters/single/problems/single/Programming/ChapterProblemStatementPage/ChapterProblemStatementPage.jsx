import { Button, Collapse, Intent, Tag } from '@blueprintjs/core';
import { Flex } from '@blueprintjs/labs';
import { useState } from 'react';

import { ContentCard } from '../../../../../../../../../../components/ContentCard/ContentCard';
import StatementLanguageWidget from '../../../../../../../../../../components/LanguageWidget/StatementLanguageWidget';
import { ProblemEditorialCard } from '../../../../../../../../../../components/ProblemWorksheetCard/Programming/ProblemEditorialCard/ProblemEditorialCard';
import { ProblemWorksheetCard } from '../../../../../../../../../../components/ProblemWorksheetCard/Programming/ProblemWorksheetCard';

import './ChapterProblemStatementPage.scss';

export default function ChapterProblemStatementPage({ worksheet }) {
  const [showEditorial, setShowEditorial] = useState(false);

  const renderTimeLimit = timeLimit => {
    if (!timeLimit) {
      return '-';
    }
    if (timeLimit % 1000 === 0) {
      return timeLimit / 1000 + ' s';
    }
    return timeLimit + ' ms';
  };

  const renderMemoryLimit = memoryLimit => {
    if (!memoryLimit) {
      return '-';
    }
    if (memoryLimit % 1024 === 0) {
      return memoryLimit / 1024 + ' MB';
    }
    return memoryLimit + ' KB';
  };

  const renderLimits = () => {
    const { timeLimit, memoryLimit } = worksheet.worksheet.limits;
    return (
      <small className="statement-header__limits">
        Time limit:&nbsp;&nbsp;{renderTimeLimit(timeLimit)}
        &nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;Memory limit:&nbsp;&nbsp;{renderMemoryLimit(memoryLimit)}
      </small>
    );
  };

  const renderProblemSetProblemPaths = () => {
    const { problemSetProblemPaths } = worksheet;
    if (!problemSetProblemPaths) {
      return null;
    }
    return (
      <small className="statement-header__problem-set-problem-paths">
        {problemSetProblemPaths.map(p => p.join('/')).join(', ')}
      </small>
    );
  };

  const renderStatementHeader = () => {
    const { defaultLanguage, languages } = worksheet;
    if (!defaultLanguage || !languages) {
      return null;
    }
    const props = {
      defaultLanguage: defaultLanguage,
      statementLanguages: languages,
    };
    return (
      <Flex className="statement-header" gap={4} flexWrap="wrap" alignItems="baseline">
        {renderProblemSetProblemPaths()}
        {renderLimits()}
        <StatementLanguageWidget {...props} />
      </Flex>
    );
  };

  const renderEditorial = () => {
    const { problem, editorial } = worksheet;
    if (!editorial) {
      return null;
    }
    return (
      <div style={{ marginTop: 24 }}>
        <hr />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>Official Editorial & Solution</span>
            <Tag intent={Intent.SUCCESS} round minimal>
              Unlocked
            </Tag>
          </div>
          <Button
            small
            intent={showEditorial ? Intent.NONE : Intent.PRIMARY}
            icon={showEditorial ? 'chevron-up' : 'chevron-down'}
            text={showEditorial ? 'Hide Editorial' : 'View Editorial'}
            onClick={() => setShowEditorial(!showEditorial)}
          />
        </div>
        <Collapse isOpen={showEditorial}>
          <ProblemEditorialCard
            alias={problem.alias}
            statement={worksheet.worksheet.statement}
            editorial={editorial}
            showTitle={false}
          />
        </Collapse>
      </div>
    );
  };

  const renderStatement = () => {
    const { problem } = worksheet;

    return (
      <ProblemWorksheetCard
        alias={problem.alias}
        worksheet={worksheet.worksheet}
        showTitle={false}
        showLimits={false}
      />
    );
  };

  return (
    <ContentCard id="chapter-problem-statement" className="chapter-programming-problem-statement-page">
      {renderStatementHeader()}
      {renderStatement()}
      <div className="chapter-problem-editorial">{renderEditorial()}</div>
    </ContentCard>
  );
}
