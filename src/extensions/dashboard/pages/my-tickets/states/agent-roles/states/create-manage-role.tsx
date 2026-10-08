import {
    Box,
    Text,
    Card,
    FormField,
    Input,
    InputArea,
    Accordion,
    Checkbox,
    accordionItemBuilder,
    SkeletonRectangle,
    SkeletonLine
} from '@wix/design-system';
import { PERMISSIONS } from '../../../Permissions/Permissions';

interface Props {
    data: CreateManageRoleData | null;
    onDataChange?: (data: CreateManageRoleData) => void;
    isLoadingRole: boolean;
}

interface CreateManageRoleData {
    id?: string;
    roleName?: string;
    roleDescription?: string;
    permissions?: string[];
}

const CreateManageRole = ({
    data,
    onDataChange,
    isLoadingRole
}: Props) => {
    const groupedPermissions = PERMISSIONS.reduce(
        (acc: any, perm: any) => {
            if (!acc[perm.category]) {
                acc[perm.category] = [];
            }
            acc[perm.category].push(perm);
            return acc;
        },
        {} as Record<string, typeof PERMISSIONS[number][]>,
    );

    const handleFormChange = (field: string, value: string) => {
        onDataChange?.({
            ...data,
            [field]: value,
        } as CreateManageRoleData);
    }

    return (
        <Box width={'100%'} height={'100%'} direction={'vertical'} boxSizing='border-box' maxHeight={'100%'} minHeight={0}>
            <Box
                padding={'30px'}
                width={'100%'}
                height={'100%'}
                direction={'vertical'}
                boxSizing='border-box'
                gap={4}
                maxHeight={'100%'}
                minHeight={0}
                overflow={'auto'}
            >
                <Card>
                    <Card.Header title={isLoadingRole ? <SkeletonLine width="150px" /> : "Role Details"} subtitle={isLoadingRole ? <SkeletonLine width="250px" /> : "Give this role a name and description"} />
                    <Card.Content>
                        <Box direction={'vertical'} gap={1}>
                            {isLoadingRole ? <SkeletonRectangle width="100%" height='35px' /> : <FormField label="Role Name" required>
                                <Input placeholder="Enter role name" value={data?.roleName || ''} onChange={(e) => handleFormChange('roleName', e.target.value)} />
                            </FormField>}

                            {isLoadingRole ? <SkeletonRectangle width="100%" height='100px' /> : <FormField label="Role Description">
                                <InputArea placeholder="Enter role description" minHeight={'100px'} value={data?.roleDescription || ''} onChange={(e) => handleFormChange('roleDescription', e.target.value)} />
                            </FormField>}
                        </Box>
                    </Card.Content>
                </Card>
                <Card>
                    <Card.Header title={isLoadingRole ? <SkeletonLine width="150px" /> : "Role Permissions"} subtitle={isLoadingRole ? <SkeletonLine width="250px" /> : "Select which actions agents with this role can perform"} />
                    <Card.Content>
                        <Accordion
                            horizontalPadding="large"
                            size="medium"
                            skin="light"
                            // hideShadow
                        
                            items={Object.entries(groupedPermissions).map(([category, categoryPermissions]: any) =>
                                accordionItemBuilder({
                                    title: isLoadingRole ? <SkeletonLine width="200px" /> : (<Text weight={'bold'} size={'medium'}>{category}</Text>),
                                    titleSize: 'medium',
                                    disabled: isLoadingRole,
                                    expandLabel: isLoadingRole ? (<SkeletonLine width="50px" />) : undefined,
                                    collapseLabel: isLoadingRole ? (<SkeletonLine width="50px" />) : undefined,
                                    buttonType: isLoadingRole ? 'node' : undefined,
                                    showLabel: isLoadingRole ? 'always' : undefined,
                                    children: (
                                        <Box direction="vertical" gap="small">

                                            {categoryPermissions.map((perm: any) => (
                                                <Box gap={4} verticalAlign='top' key={perm.id}>
                                                    <Checkbox
                                                        checked={data?.permissions?.includes(perm.id) || false}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                            const isChecked = e.target.checked;
                                                            onDataChange?.({
                                                                ...data,
                                                                permissions: isChecked
                                                                    ? [...(data?.permissions || []), perm.id]
                                                                    : data?.permissions?.filter((p) => p !== perm.id) || [],
                                                            } as CreateManageRoleData);
                                                        }}
                                                    />
                                                    <Box direction={'vertical'} gap={1}>
                                                        <Text weight={'normal'} size={'medium'}>{perm.name}</Text>
                                                        <Text size={'small'} weight={'thin'}>{perm.description}</Text>
                                                    </Box>
                                                </Box>

                                            ))}

                                        </Box>
                                    ),
                                }),
                            )}
                        />
                    </Card.Content>
                </Card>
            </Box>
        </Box>
    )
}

export default CreateManageRole;