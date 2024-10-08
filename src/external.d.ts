declare module '@ham2k/lib-format-tools' {
    export function fmtPercent(n: number | string, format = 'oneDecimal'): string
    export function fmtNumber(n: number | string, format?: 'default' | 'integer' | 'oneDecimal'): string
}
