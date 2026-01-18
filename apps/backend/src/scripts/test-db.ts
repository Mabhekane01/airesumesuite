
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env from the backend folder
dotenv.config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

// Hardcoded fallback URI based on nslookup results
// Password needs to be URL encoded: ! -> %21
const password = encodeURIComponent('Bhek!!522');
const fallbackUri = `mongodb://Nkhosingiphile:${password}@cluster0-shard-00-00.pmman.mongodb.net:27017,cluster0-shard-00-01.pmman.mongodb.net:27017,cluster0-shard-00-02.pmman.mongodb.net:27017/ai-job-suite-prod?ssl=true&authSource=admin&replicaSet=atlas-cluster0-shard-0`; 
// Note: I guessed 'atlas-cluster0-shard-0' but usually it's 'atlas-<hash>-shard-0'. 
// Often connecting to the primary shard directly works without replicaSet for testing.
const simpleFallbackUri = `mongodb://Nkhosingiphile:${password}@cluster0-shard-00-00.pmman.mongodb.net:27017/ai-job-suite-prod?ssl=true&authSource=admin`;

console.log('Testing MongoDB Connection...');
console.log('URI length:', uri?.length);

async function test() {
  try {
    console.log('Attempting connection with SRV URI...');
    await mongoose.connect(uri!);
    console.log('✅ Connection Successful (SRV)!');
  } catch (error: any) {
    console.error('❌ SRV Connection Failed:', error.code);
    
    console.log('\nAttempting connection with direct shard URI...');
    try {
        // Try the simple one first
        await mongoose.connect(simpleFallbackUri);
        console.log('✅ Connection Successful (Direct Shard)!');
        
        // Get Replica Set Name
        const admin = mongoose.connection.db.admin();
        const status = await admin.serverStatus();
        const replSetName = status.repl.setName;
        console.log('Replica Set Name detected: [Protected]');
        
        // Construct the full URI with all shards (Driver usually auto-discovers replica set name)
        const fullUri = `mongodb://Nkhosingiphile:${password}@cluster0-shard-00-00.pmman.mongodb.net:27017,cluster0-shard-00-01.pmman.mongodb.net:27017,cluster0-shard-00-02.pmman.mongodb.net:27017/ai-job-suite-prod?ssl=true&authSource=admin&retryWrites=true&w=majority`;
        
        console.log('\nTesting Full Standard URI...');
        await mongoose.disconnect();
        await mongoose.connect(fullUri);
        console.log('✅ Connection Successful (Full Standard URI)!');
        
    } catch (err: any) {
        console.error('❌ Direct Connection Failed:', err.message);
    }
  }
  
  if (mongoose.connection.readyState === 1) {
     await mongoose.disconnect();
  }
}

test();
