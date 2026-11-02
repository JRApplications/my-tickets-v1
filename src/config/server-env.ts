export const requireServerEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required server environment variable: ${name}`);
    }
    return value;
};
