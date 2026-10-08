import { Box, Loader } from '@wix/design-system';

interface Props {
    isLoading: boolean;
    errorMessage: string;
    isError: boolean;
    loadingMessage: string;
}

const Loading = ({
    isLoading,
    errorMessage,
    isError,
    loadingMessage
}: Props) => {
    return (
        <Box width={'100%'} height={'100%'} direction={'vertical'}>
            <Box align={'center'} WebkitJustifyContent={'center'} width={'100%'} height={'100%'} direction={'vertical'}>
                <Loader
                    size="medium"
                    status={isLoading ? 'loading' : isError ? 'error' : 'loading'}
                    text={isLoading ? loadingMessage : isError ? errorMessage : ""}
                />
            </Box>
        </Box>
    )
}

export default Loading;