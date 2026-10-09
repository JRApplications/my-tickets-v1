import React, { useState, useEffect, useCallback, type FC } from 'react';
import { info  } from '@wix/editor'
import {
  SidePanel,
  WixDesignSystemProvider,
  SectionHelper,
  Box,
} from '@wix/design-system';
import '@wix/design-system/styles-odeditor.global.css';

const Panel: FC = () => {
  const [dashboardUrl, setDashboardUrl] = useState<string>('');

  useEffect(() => {
    const fetchDashboardUrl = async () => {
      const siteId = await info.getMetaSiteId();
      const appId = "bbc0bfe8-5b30-405a-b400-71cfe51f8ad5"
      if (siteId && appId) {
        setDashboardUrl(
          `https://manage.wix.com/dashboard/${siteId}/app/${appId}?stateOverride=member-tickets-design`
        );
      }
    };
    fetchDashboardUrl();
  }, []);

  const handleActionClick = useCallback(() => {
    if (dashboardUrl) {
      window.open(dashboardUrl, '_blank');
    }
  }, [dashboardUrl]);

  return (
    <WixDesignSystemProvider>
      <SidePanel width="300" height="100vh">
        <SidePanel.Content noPadding stretchVertically>
          <Box paddingTop="8px" direction='vertical' gap={2}>
            <SectionHelper skin='premium' border="topBottom" fullWidth actionText="Go to Dashboard" onAction={handleActionClick}>
              Design your widget in the dashboard to customize its appearance.
            </SectionHelper>
          </Box>
        </SidePanel.Content>
      </SidePanel>
    </WixDesignSystemProvider>
  );
};

export default Panel;
