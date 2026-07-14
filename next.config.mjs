/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['172.30.1.73', 'localhost', '127.0.0.1'],
  output: 'standalone',
  experimental: {
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
  },
};

export default nextConfig;
