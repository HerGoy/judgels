import { Flex } from '@blueprintjs/labs';

import './ActionButtons.scss';

export function ActionButtons({ justifyContent = 'start', children }) {
  return (
    <Flex
      className="action-buttons"
      justifyContent={justifyContent}
      alignItems="center"
      flexWrap="wrap"
      gap={1}
    >
      {children}
    </Flex>
  );
}
