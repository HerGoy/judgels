import { Flex } from '@blueprintjs/labs';
import { useQuery } from '@tanstack/react-query';

import { LoadingState } from '../../../../components/LoadingState/LoadingState';
import { settingsQueryOptions } from '../../../../modules/queries/setting';
import { AppSection } from './AppSection';
import { HomeSection } from './HomeSection';
import { SessionSection } from './SessionSection';
import { SiteLogoSection } from './SiteLogoSection';

export default function SettingsPage() {
  const { data } = useQuery(settingsQueryOptions());

  if (data === undefined) {
    return <LoadingState />;
  }

  return (
    <Flex flexDirection="column" gap={2}>
      <AppSection app={data.app} />
      <SiteLogoSection home={data.home} />
      <HomeSection home={data.home} />
      <SessionSection session={data.session} />
    </Flex>
  );
}
