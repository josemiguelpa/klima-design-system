declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: "utf8"): string;
}
declare module "node:path" {
  export function resolve(...paths: string[]): string;
}
declare const process: { cwd(): string; chdir(path: string): void };
declare interface ImportMeta {
  url: string;
}
declare class URL {
  constructor(url: string, base?: string);
  readonly pathname: string;
}
