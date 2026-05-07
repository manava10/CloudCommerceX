const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// Configuration
const endpointUrl = process.env.DO_SPACES_ENDPOINT || "https://sfo3.digitaloceanspaces.com";

const s3Config = {
  endpoint: endpointUrl,
  region: process.env.DO_SPACES_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
};

const bucketName = process.env.DO_SPACES_BUCKET_NAME || "cloudcommercex";

let s3Client;
if (process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET) {
  s3Client = new S3Client(s3Config);
} else {
  console.warn("DO Spaces credentials missing. File uploads will fail.");
}

// Memory storage for multer
const storage = multer.memoryStorage();
const uploadMiddleware = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

async function uploadToS3(file) {
  if (!s3Client) {
    throw new Error("S3 Client not configured. Missing DO_SPACES_KEY or DO_SPACES_SECRET.");
  }
  
  const ext = path.extname(file.originalname);
  const hash = crypto.randomBytes(16).toString("hex");
  const filename = `products/${hash}${ext}`; // store in products folder
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read",
  });
  
  await s3Client.send(command);
  
  // Construct the public URL
  // DigitalOcean Spaces format: https://[bucket-name].[endpoint-hostname]/[filename]
  const endpoint = new URL(endpointUrl);
  return `https://${bucketName}.${endpoint.hostname}/${filename}`;
}

module.exports = { uploadMiddleware, uploadToS3 };
