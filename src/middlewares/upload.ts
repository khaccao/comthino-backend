import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dcgloyqur',
  api_key: process.env.CLOUDINARY_API_KEY || '246829161891641',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'mGCMlPUh_lVDa3cu5_PrNJjMGac',
});

// If CLOUDINARY_URL is available, it will automatically use it, but explicit config above helps fallback.

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'comthino_uploads',
      format: 'auto', // supports promises as well
      public_id: file.fieldname + '-' + Date.now(),
    };
  },
});

// File Filter
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ hỗ trợ upload các định dạng ảnh: JPEG, PNG, GIF, WEBP.'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});
