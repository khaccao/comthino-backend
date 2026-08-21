import ImageKit from 'imagekit';

const getImageKitConfig = () => {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || process.env.VITE_IMAGEKIT_PUBLIC_KEY || '';
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || process.env.VITE_IMAGEKIT_URL_ENDPOINT || '';

  if (!publicKey || !privateKey || !urlEndpoint) {
    const missing = [
      !publicKey ? 'IMAGEKIT_PUBLIC_KEY' : null,
      !privateKey ? 'IMAGEKIT_PRIVATE_KEY' : null,
      !urlEndpoint ? 'IMAGEKIT_URL_ENDPOINT' : null,
    ].filter(Boolean);
    throw new Error(`Thiếu cấu hình ImageKit: ${missing.join(', ')}.`);
  }

  return { publicKey, privateKey, urlEndpoint };
};

export const getImageKitClient = () => {
  const config = getImageKitConfig();
  return new ImageKit(config);
};

export const getImageKitUploadAuth = () => {
  const client = getImageKitClient();
  const config = getImageKitConfig();
  return {
    ...client.getAuthenticationParameters(),
    publicKey: config.publicKey,
    urlEndpoint: config.urlEndpoint,
  };
};
