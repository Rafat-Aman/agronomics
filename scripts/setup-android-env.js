import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env relative to project root
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const templatePath = path.resolve(__dirname, '../android/app/google-services.template.json');
const destPath = path.resolve(__dirname, '../android/app/google-services.json');

if (fs.existsSync(templatePath)) {
  let content = fs.readFileSync(templatePath, 'utf8');
  
  // Replace the placeholder with the actual environment variable
  content = content.replace(/\$\{ANDROID_FIREBASE_API_KEY\}/g, process.env.ANDROID_FIREBASE_API_KEY || '');
  
  fs.writeFileSync(destPath, content);
  console.log('Successfully generated android/app/google-services.json from template.');
} else {
  console.warn('google-services.template.json not found. Skipping generation.');
}
