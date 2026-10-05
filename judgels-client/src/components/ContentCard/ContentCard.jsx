import { Card } from '@blueprintjs/core';
import { Flex } from '@blueprintjs/labs';
import classNames from 'classnames';

import './ContentCard.scss';

export function ContentCard({ id, className, header, title, subtitle, action, children }) {
  if (!header && !title) {
    return (
      <Flex asChild flexDirection="column" gap={2}>
        <Card id={id} className={classNames(className, 'content-card')}>
          {children}
        </Card>
      </Flex>
    );
  }

  const renderHeader = () => {
    if (header) {
      return header;
    }

    if (subtitle || action) {
      return (
        <>
          <Flex
            className="content-card__header"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
          >
            <div>
              <h3>{title}</h3>
              {subtitle && <small className="content-card__subtitle">{subtitle}</small>}
            </div>
            {action && <div className="content-card__action">{action}</div>}
          </Flex>
          <hr />
        </>
      );
    }
    return (
      <>
        <h3>{title}</h3>
        <hr />
      </>
    );
  };

  return (
    <Card id={id} className={classNames(className, 'content-card')}>
      {renderHeader()}
      <div className="content-card__body">
        <Flex flexDirection="column" gap={2}>
          {children}
        </Flex>
      </div>
    </Card>
  );
}
