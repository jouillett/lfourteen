/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['172.30.1.73', 'localhost', '127.0.0.1'],
  output: 'standalone',
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/mysql2/**/*',
      './node_modules/nodemailer/**/*',
      './node_modules/@tosspayments/**/*',
      './node_modules/blowfish/**/*',
      './node_modules/javascript-blowfish/**/*',
      './node_modules/zod/**/*',
      './node_modules/react-hook-form/**/*',
      './node_modules/@hookform/**/*',
      './node_modules/lucide-react/**/*'
    ],
  },
  async rewrites() {
    return [
      {
        source: '/%EC%98%AC%EB%B0%94%EB%A5%B8%EA%B1%B7%EA%B8%B0',
        destination: '/bandwalk',
      },
      {
        source: '/올바른걷기',
        destination: '/bandwalk',
      },
    ];
  },
};

export default nextConfig;
