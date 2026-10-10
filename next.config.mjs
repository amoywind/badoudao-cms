/** @type {import('next').NextConfig} */
const config = {
  images: {
    unoptimized: true  // no image optimiser at the edge
  },
  typescript: {
    ignoreBuildErrors: false
  }
};

export default config;
