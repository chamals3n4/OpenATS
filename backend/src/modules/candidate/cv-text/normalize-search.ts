/**
 * Rewrites the few terms the Postgres text search parser cannot keep. It drops "+" and "#", so
 * "C++", "C#" and "C" would all be the same word, and it reads "node.js" as a host name, so a
 * search for "node" would miss it.
 *
 * The stored text and the search query both go through this function, so they always agree. Do not
 * change a rule without raising EXTRACTOR_VERSION and running the backfill.
 */
export function normalizeForSearch(text: string): string {
  return (
    text
      .replace(/\bc ?\+\+/gi, "cplusplus")
      .replace(/\bc ?#/gi, "csharp")
      .replace(/\bf ?#/gi, "fsharp")
      // "ASP.NET" and a bare ".NET", but not the end of "someone@mail.net".
      .replace(/\b(asp|ado|vb)\.net\b/gi, "$1 dotnet")
      .replace(/(^|[\s,;(/])\.net\b/gi, "$1dotnet")
      // "Node.js" becomes "Node Nodejs", found by "node", "nodejs" and "node.js" alike.
      .replace(/\b(\p{L}[\p{L}\p{N}]*)\.js\b/giu, "$1 $1js")
  );
}
