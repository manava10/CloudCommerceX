require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const endpointUrl = process.env.DO_SPACES_ENDPOINT;
const bucketName = process.env.DO_SPACES_BUCKET_NAME;

const s3Client = new S3Client({
  endpoint: endpointUrl,
  region: process.env.DO_SPACES_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

async function testConnection() {
  try {
    console.log("Attempting to connect to DO Spaces...");
    console.log("Endpoint:", endpointUrl);
    console.log("Bucket:", bucketName);
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: "test-connection.txt",
      Body: "Hello from CloudCommerceX test script!",
      ContentType: "text/plain",
      ACL: "public-read",
    });

    await s3Client.send(command);
    console.log("✅ Successfully connected and uploaded a test file!");
    
    const endpoint = new URL(endpointUrl);
    console.log("Public URL:", `https://${bucketName}.${endpoint.hostname}/test-connection.txt`);
  } catch (err) {
    console.error("❌ Connection failed!");
    console.error(err.message);
  }
}

testConnection();
