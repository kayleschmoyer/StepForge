declare module 'write-file-atomic' {
  export default function writeFileAtomic(
    filename: string,
    data: string | Buffer,
    options?: string | { encoding?: BufferEncoding; mode?: number; chown?: { uid: number; gid: number } }
  ): Promise<void>;
}