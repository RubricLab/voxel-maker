/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        hostname: "i.scdn.co",
      },
    ],
  },
  transpilePackages: ["@rubriclab/ui"],
};

export default config;
