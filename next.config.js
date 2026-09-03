/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.preview.same-app.com"],
  // satori's text shaping loads harfbuzzjs's hb.wasm from a path relative to
  // its own file at runtime. Webpack bundling rewrites that file into a
  // shared chunk without moving the wasm binary alongside it, so the lookup
  // breaks. Keeping these unbundled lets them run as plain node_modules
  // requires, where hb.wasm actually sits next to hb.js.
  serverExternalPackages: ["satori", "harfbuzzjs"],
  // Even unbundled, hb.wasm is loaded via a runtime-computed path
  // (__dirname + "hb.wasm"), which the build's file tracer can't follow
  // statically — so it's dropped from the deployed function unless forced
  // in here explicitly.
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/harfbuzzjs/*.wasm"],
  },
  images: {
    unoptimized: true,
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "ext.same-assets.com",
      "ugc.same-assets.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ext.same-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ugc.same-assets.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
