// wawoff2 ships no types. These cover only the parts that zxfnt uses.

declare module "wawoff2" {
  export function compress(font: Uint8Array): Promise<Uint8Array>;
  export function decompress(woff2: Uint8Array): Promise<Uint8Array>;
}
