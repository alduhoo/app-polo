interface Definition {
  key: string;
  name: string;
  description: string;
  infoURL: string;
  icon: string;
  maxAgeInDays: number,
  enabledByDefault: boolean,
  fetch: (obj: { key: string, definition: Definition, options: any }) => Promise<any>,
  onLoad?: (data: any, options: any) => boolean | void,
  onRemove: () => void,
}

export function registerDataFile(definiton: Definition): void;
export function unRegisterDataFile(definiton: Definition): void;
