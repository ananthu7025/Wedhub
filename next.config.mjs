/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      serverActions: {
        allowedOrigins: ["oacdevportal.bigformula.com", "localhost:3000"],
      },
    },
  };
   
  export default nextConfig;