// Deliberately imports nothing. The `jose` mock factory in each test file
// imports this to read the key, so anything imported here would be pulled in
// while `jose` is still being mocked and deadlock the module graph.
export const jwks: { publicKey: unknown } = { publicKey: null };
