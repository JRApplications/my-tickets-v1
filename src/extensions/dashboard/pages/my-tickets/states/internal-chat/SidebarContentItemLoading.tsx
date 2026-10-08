import React from 'react';
import {Box, SkeletonCircle, SkeletonLine, SkeletonRectangle, TableListItem } from '@wix/design-system';
const SidebarContentItemLoading = () => {
    return (
        <TableListItem
            checked={false}
            checkbox={false}
            selectable={false}
            showSelectionBorder={false}
            border={true}
            onClick={() => { }}
            verticalPadding='small'
            horizontalPadding='small'
            options={[
                {
                    value: <SkeletonCircle diameter="48px" />,
                    width: 'auto',
                },
                {
                    value: (
                        <Box direction="vertical" gap={1}>
                            <SkeletonLine width="150px" />
                            <SkeletonLine width="100px" />
                        </Box>
                    ),
                },
                {
                    value: (
                        <Box direction="vertical" align="right" verticalAlign="middle" gap="8px">
                            <SkeletonLine width="25px" />

                            <Box className={`loading-actions`} gap="8px">
                                <SkeletonRectangle width="24px" height="24px" />
                                <SkeletonRectangle width="24px" height="24px" />
                            </Box>
                        </Box>
                    ),
                    width: 'auto'
                }
            ]}
        />
    );
};

export default SidebarContentItemLoading;