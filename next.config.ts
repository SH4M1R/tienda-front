import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Genera la carpeta 'out' al compilar
  images: {
    unoptimized: true, // Necesario si usas <Image /> de Next.js en exportación estática
  },
  /* otras opciones de configuración aquí */
};

export default nextConfig;