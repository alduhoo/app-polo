export const loadDataFile: (key: string, options: { force?: boolean, noticesInsteadOfFetch?: boolean }) => (dispatch: any, getState: any) => Promise<undefined | string | Error>
export const removeDataFile: (key: string) => (dispatch: any, getState: any) => Promise<void>
