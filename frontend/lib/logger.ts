// frontend/lib/logger.ts
export const logInfo = (message: string, ...args: any[]) => {
    console.log(`[${new Date().toISOString()}] [INFO]: ${message}`, ...args);
};

export const logError = (message: string, ...args: any[]) => {
    console.error(`[${new Date().toISOString()}] [ERROR]: ${message}`, ...args);
};