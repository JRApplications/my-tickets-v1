const getServerBasePath = (): string => {
    const basePath = import.meta.env.WIX_SERVER_BASE_PATH || '/';
    return basePath.endsWith('/') ? basePath : `${basePath}/`;
};

export const getWixServerBaseUrl = (moduleUrl: string): string => {
    const origin = new URL(moduleUrl).origin;
    const basePath = getServerBasePath();
    return `${origin}${basePath === '/' ? '' : basePath.slice(0, -1)}`;
};

export const getWixServerApiUrl = (path: string, moduleUrl: string): string => {
    const origin = new URL(moduleUrl).origin;
    const endpointPath = path.replace(/^\/+/, '');
    return new URL(`${getServerBasePath()}${endpointPath}`, origin).toString();
};
