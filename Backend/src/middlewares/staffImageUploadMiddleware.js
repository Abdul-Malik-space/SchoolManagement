const path = require("path");
const multer = require("multer");

/*
|--------------------------------------------------------------------------
| Staff Image Upload Rules
|--------------------------------------------------------------------------
|
| Staff image browser/mobile files سے multipart/form-data کے ذریعے آئے گی۔
| Vercel filesystem استعمال نہیں کیا جاتا، اس لیے memoryStorage ضروری ہے۔
|
*/

const MAX_STAFF_IMAGE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES =
  new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
  ]);

const ALLOWED_IMAGE_EXTENSIONS =
  new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
  ]);

/*
|--------------------------------------------------------------------------
| Multer Memory Storage
|--------------------------------------------------------------------------
|
| Uploaded file req.file.buffer میں دستیاب ہوگی۔ اگلے controller میں یہی
| buffer Cloudinary upload helper کو دیا جائے گا۔
|
*/

const storage =
  multer.memoryStorage();

/*
|--------------------------------------------------------------------------
| Image File Validation
|--------------------------------------------------------------------------
*/

const staffImageFileFilter = (
  req,
  file,
  callback
) => {
  const mimeType =
    String(
      file?.mimetype ||
      ""
    )
      .trim()
      .toLowerCase();

  const extension =
    path
      .extname(
        String(
          file?.originalname ||
          ""
        )
      )
      .trim()
      .toLowerCase();

  const validMimeType =
    ALLOWED_IMAGE_MIME_TYPES.has(
      mimeType
    );

  const validExtension =
    ALLOWED_IMAGE_EXTENSIONS.has(
      extension
    );

  if (
    !validMimeType ||
    !validExtension
  ) {
    const error =
      new Error(
        "Only JPG, JPEG, PNG or WebP staff images are allowed."
      );

    error.statusCode =
      400;

    error.code =
      "INVALID_STAFF_IMAGE_TYPE";

    callback(
      error
    );

    return;
  }

  callback(
    null,
    true
  );
};

/*
|--------------------------------------------------------------------------
| Multer Upload Instance
|--------------------------------------------------------------------------
*/

const staffImageUpload =
  multer({
    storage,

    limits: {
      fileSize:
        MAX_STAFF_IMAGE_SIZE,

      files:
        1
    },

    fileFilter:
      staffImageFileFilter
  });

/*
|--------------------------------------------------------------------------
| Single Staff Photo Middleware
|--------------------------------------------------------------------------
|
| Frontend FormData field:
|
| formData.append("photo", selectedFile);
|
*/

const uploadStaffImage =
  staffImageUpload.single(
    "photo"
  );

/*
|--------------------------------------------------------------------------
| Multer Error Middleware
|--------------------------------------------------------------------------
|
| اسے uploadStaffImage کے فوراً بعد route میں استعمال کیا جائے گا تاکہ
| Multer errors صاف JSON response میں تبدیل ہو جائیں۔
|
*/

const handleStaffImageUploadError = (
  error,
  req,
  res,
  next
) => {
  if (
    !error
  ) {
    next();

    return;
  }

  if (
    error instanceof
    multer.MulterError
  ) {
    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {
      return res
        .status(
          400
        )
        .json({
          success:
            false,

          message:
            "Staff image size cannot exceed 5 MB.",

          code:
            "STAFF_IMAGE_TOO_LARGE"
        });
    }

    if (
      error.code ===
      "LIMIT_FILE_COUNT"
    ) {
      return res
        .status(
          400
        )
        .json({
          success:
            false,

          message:
            "Only one staff image can be uploaded at a time.",

          code:
            "STAFF_IMAGE_FILE_LIMIT"
        });
    }

    if (
      error.code ===
      "LIMIT_UNEXPECTED_FILE"
    ) {
      return res
        .status(
          400
        )
        .json({
          success:
            false,

          message:
            'Use the multipart field name "photo" for the staff image.',

          code:
            "INVALID_STAFF_IMAGE_FIELD"
        });
    }

    return res
      .status(
        400
      )
      .json({
        success:
          false,

        message:
          error.message ||
          "Staff image upload failed.",

        code:
          error.code ||
          "STAFF_IMAGE_UPLOAD_ERROR"
      });
  }

  if (
    error.code ===
      "INVALID_STAFF_IMAGE_TYPE"
  ) {
    return res
      .status(
        error.statusCode ||
        400
      )
      .json({
        success:
          false,

        message:
          error.message,

        code:
          error.code
      });
  }

  next(
    error
  );
};

/*
|--------------------------------------------------------------------------
| Optional File Signature Validation
|--------------------------------------------------------------------------
|
| MIME type browser سے آتی ہے، اس لیے controller سے پہلے file header بھی
| verify کیا جاتا ہے۔ یہ مکمل antivirus scan نہیں، مگر fake extension کے
| خلاف بنیادی protection فراہم کرتا ہے۔
|
*/

const hasValidImageSignature = (
  buffer
) => {
  if (
    !Buffer.isBuffer(
      buffer
    ) ||
    buffer.length <
      12
  ) {
    return false;
  }

  const isJpeg =
    buffer[0] ===
      0xff &&
    buffer[1] ===
      0xd8 &&
    buffer[2] ===
      0xff;

  const isPng =
    buffer[0] ===
      0x89 &&
    buffer[1] ===
      0x50 &&
    buffer[2] ===
      0x4e &&
    buffer[3] ===
      0x47 &&
    buffer[4] ===
      0x0d &&
    buffer[5] ===
      0x0a &&
    buffer[6] ===
      0x1a &&
    buffer[7] ===
      0x0a;

  const isWebP =
    buffer
      .subarray(
        0,
        4
      )
      .toString(
        "ascii"
      ) ===
      "RIFF" &&
    buffer
      .subarray(
        8,
        12
      )
      .toString(
        "ascii"
      ) ===
      "WEBP";

  return (
    isJpeg ||
    isPng ||
    isWebP
  );
};

const validateStaffImageSignature = (
  req,
  res,
  next
) => {
  if (
    !req.file
  ) {
    next();

    return;
  }

  if (
    !hasValidImageSignature(
      req.file.buffer
    )
  ) {
    return res
      .status(
        400
      )
      .json({
        success:
          false,

        message:
          "The selected file is not a valid JPG, PNG or WebP image.",

        code:
          "INVALID_STAFF_IMAGE_CONTENT"
      });
  }

  next();
};

module.exports = {
  MAX_STAFF_IMAGE_SIZE,
  ALLOWED_IMAGE_MIME_TYPES,
  uploadStaffImage,
  handleStaffImageUploadError,
  validateStaffImageSignature
};
