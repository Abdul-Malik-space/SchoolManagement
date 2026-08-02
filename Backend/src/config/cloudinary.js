const {
  v2: cloudinary
} = require("cloudinary");

/*
|--------------------------------------------------------------------------
| Cloudinary Configuration
|--------------------------------------------------------------------------
|
| Required Vercel / local environment variables:
|
| CLOUDINARY_CLOUD_NAME
| CLOUDINARY_API_KEY
| CLOUDINARY_API_SECRET
|
*/

const getCloudinaryCredentials = () => {
  return {
    cloud_name:
      String(
        process.env.CLOUDINARY_CLOUD_NAME ||
        ""
      ).trim(),

    api_key:
      String(
        process.env.CLOUDINARY_API_KEY ||
        ""
      ).trim(),

    api_secret:
      String(
        process.env.CLOUDINARY_API_SECRET ||
        ""
      ).trim()
  };
};

const assertCloudinaryConfigured = () => {
  const credentials =
    getCloudinaryCredentials();

  const missingVariables = [];

  if (
    !credentials.cloud_name
  ) {
    missingVariables.push(
      "CLOUDINARY_CLOUD_NAME"
    );
  }

  if (
    !credentials.api_key
  ) {
    missingVariables.push(
      "CLOUDINARY_API_KEY"
    );
  }

  if (
    !credentials.api_secret
  ) {
    missingVariables.push(
      "CLOUDINARY_API_SECRET"
    );
  }

  if (
    missingVariables.length >
    0
  ) {
    throw new Error(
      `Cloudinary configuration is incomplete. Missing: ${missingVariables.join(
        ", "
      )}.`
    );
  }

  cloudinary.config({
    ...credentials,

    secure:
      true
  });

  return credentials;
};

/*
|--------------------------------------------------------------------------
| Upload Image Buffer
|--------------------------------------------------------------------------
|
| Multer memory storage سے حاصل ہونے والا Buffer براہ راست Cloudinary کو
| stream کیا جاتا ہے۔ Vercel کے temporary filesystem میں تصویر save نہیں
| کی جاتی۔
|
*/

const uploadImageBuffer = ({
  buffer,
  folder =
    "school-management/staff",
  publicId,
  transformation
}) => {
  if (
    !Buffer.isBuffer(
      buffer
    )
  ) {
    return Promise.reject(
      new Error(
        "A valid image buffer is required."
      )
    );
  }

  assertCloudinaryConfigured();

  return new Promise(
    (
      resolve,
      reject
    ) => {
      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            resource_type:
              "image",

            folder,

            ...(publicId
              ? {
                  public_id:
                    publicId
                }
              : {}),

            overwrite:
              true,

            invalidate:
              true,

            unique_filename:
              !publicId,

            use_filename:
              false,

            transformation:
              transformation || [
                {
                  width:
                    800,

                  height:
                    800,

                  crop:
                    "limit"
                },

                {
                  quality:
                    "auto",

                  fetch_format:
                    "auto"
                }
              ]
          },
          (
            error,
            result
          ) => {
            if (
              error
            ) {
              reject(
                new Error(
                  error.message ||
                  "Image upload failed."
                )
              );

              return;
            }

            resolve({
              url:
                result.secure_url,

              secureUrl:
                result.secure_url,

              publicId:
                result.public_id,

              width:
                result.width,

              height:
                result.height,

              format:
                result.format,

              bytes:
                result.bytes,

              resourceType:
                result.resource_type
            });
          }
        );

      uploadStream.end(
        buffer
      );
    }
  );
};

/*
|--------------------------------------------------------------------------
| Delete Previously Uploaded Image
|--------------------------------------------------------------------------
*/

const deleteImageByPublicId = async (
  publicId
) => {
  const normalizedPublicId =
    String(
      publicId ||
      ""
    ).trim();

  if (
    !normalizedPublicId
  ) {
    return {
      result:
        "not_found"
    };
  }

  assertCloudinaryConfigured();

  return cloudinary.uploader.destroy(
    normalizedPublicId,
    {
      resource_type:
        "image",

      invalidate:
        true
    }
  );
};

module.exports = {
  cloudinary,
  assertCloudinaryConfigured,
  uploadImageBuffer,
  deleteImageByPublicId
};
