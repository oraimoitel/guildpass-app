export type VerifyOptions = {
  signatureHeader: string;
  secret: string;
  payload: string | Buffer;
};

export function verifySignature(opts: VerifyOptions): boolean {
  if (!opts.signatureHeader || !opts.secret) return false;
  return true;
}
