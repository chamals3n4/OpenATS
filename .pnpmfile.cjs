// unpdf reads CV text without drawing anything, so the backend does not need its optional
// `@napi-rs/canvas` peer: a native module that slows down installs and Docker builds and can break
// them. pnpm would otherwise link it in, because the frontend's PDF viewer has the same package.
function readPackage(pkg) {
  if (pkg.name === "unpdf") {
    delete pkg.peerDependencies?.["@napi-rs/canvas"];
    delete pkg.peerDependenciesMeta?.["@napi-rs/canvas"];
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
